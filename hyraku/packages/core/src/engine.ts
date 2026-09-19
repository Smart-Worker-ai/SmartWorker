import { prisma } from '@hyraku/db';
import type { Flow, FlowContext, InboundMessage, OutboundMessage } from './types.js';
import { text } from './types.js';
import { DocumentRejected, saveMedia } from './storage.js';
import { respondToAssignment, type Envelope } from './dispatch.js';
import { bookingFlow } from './flows/booking.js';
import { registrationFlow } from './flows/registration.js';
import { routeIntent } from './flows/root.js';

const FLOWS: Record<string, Flow> = {
  [bookingFlow.id]: bookingFlow,
  [registrationFlow.id]: registrationFlow,
};

export interface HandleResult {
  /** Sent back to whoever messaged us. */
  replies: OutboundMessage[];
  /** Messages for other people — a worker accepting triggers one to the customer. */
  outbound: Envelope[];
  /** false when the message was a duplicate and nothing was processed. */
  processed: boolean;
}

const DUPLICATE: HandleResult = { replies: [], outbound: [], processed: false };

/**
 * The single entry point for every inbound message, whatever the transport.
 *
 * Ordering matters: the message row is written before any state is touched, so
 * a webhook retry can never advance a conversation or create a second booking.
 */
export async function handleInbound(msg: InboundMessage): Promise<HandleResult> {
  const user = await upsertUser(msg.from);

  // Dedup by letting the unique index refuse the second insert. Reading first
  // and then writing loses the race that matters — two deliveries of the same
  // retry, arriving at once, both finding nothing.
  try {
    await prisma.message.create({
      data: {
        waMessageId: msg.waMessageId,
        direction: 'in',
        userId: user.id,
        waPhone: msg.from,
        type: msg.type,
        body: msg.text ?? null,
        payload: { replyId: msg.replyId, mimeType: msg.media?.mimeType },
        status: 'delivered',
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') return DUPLICATE;
    throw err;
  }

  const convo = await prisma.conversation.upsert({
    where: { waPhone: msg.from },
    update: { lastInboundAt: msg.timestamp },
    create: { waPhone: msg.from, userId: user.id, lastInboundAt: msg.timestamp },
  });

  // Persist bytes before the flow ever sees them. Meta's media URLs expire, so
  // "download later" is not an option — flows only ever handle a storage key.
  let media = msg.media;
  if (media?.data) {
    try {
      const stored = await saveMedia(media.data, media.mimeType, 'kyc');
      media = { ...media, ...stored, data: '' };
    } catch (err) {
      if (!(err instanceof DocumentRejected)) throw err;
      return {
        replies: [text(`Sorry, we could not read that file — ${err.message}. Please try again.`)],
        outbound: [],
        processed: true,
      };
    }
  }

  const ctx: FlowContext = {
    userId: user.id,
    phone: msg.from,
    name: user.name,
    data: (convo.data ?? {}) as Record<string, any>,
    input: { text: msg.text, replyId: msg.replyId, media },
  };

  // A worker answering a job offer. Checked ahead of flow state because an
  // offer can land while they are midway through something else, and losing an
  // acceptance to an in-flight conversation would be the worst kind of bug.
  const verdict = parseAssignmentReply(msg.replyId);
  if (verdict) {
    const result = await respondToAssignment(verdict.assignmentId, verdict.accept);
    if (!result.ok) {
      return {
        replies: [text(result.error ?? 'That job is no longer open.')],
        outbound: [],
        processed: true,
      };
    }
    return { replies: [], outbound: result.outbound, processed: true };
  }

  // Leaving is a right, not a flow step. STOP suppresses every marketing
  // message; cancel only drops what they were in the middle of.
  if (isOptOut(msg)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { optOutAt: new Date(), whatsappOptIn: false },
    });
    await clearFlow(msg.from);
    return {
      replies: [
        text('You will not get any more messages from Hyraku. Message us any time to start again.'),
      ],
      outbound: [],
      processed: true,
    };
  }

  // A universal escape hatch. Being stuck in a flow with no way out is the
  // fastest way to lose someone on a channel they can simply close.
  if (isCancel(msg)) {
    await clearFlow(msg.from);
    const greeting = await routeIntent({ ...ctx, input: {}, data: {} });
    return {
      replies: [text('No problem — cancelled.'), ...greeting],
      outbound: [],
      processed: true,
    };
  }

  const activeFlow = convo.activeFlow ? FLOWS[convo.activeFlow] : null;
  if (!activeFlow || !convo.stepId) {
    return { replies: await startOrRoute(ctx), outbound: [], processed: true };
  }

  return {
    replies: await advance(activeFlow, convo.stepId, ctx),
    outbound: [],
    processed: true,
  };
}

function parseAssignmentReply(
  replyId: string | undefined
): { assignmentId: string; accept: boolean } | null {
  if (!replyId) return null;
  const m = replyId.match(/^(accept|decline):(.+)$/);
  return m ? { assignmentId: m[2], accept: m[1] === 'accept' } : null;
}

async function startOrRoute(ctx: FlowContext): Promise<OutboundMessage[]> {
  const routed = await routeIntent(ctx);

  // routeIntent asks for a flow by stashing a marker rather than reaching into
  // the conversation itself, which keeps intent detection free of persistence.
  const flowId = ctx.data.__enterFlow as string | undefined;
  if (!flowId) return routed;

  delete ctx.data.__enterFlow;
  const flow = FLOWS[flowId];

  await prisma.conversation.update({
    where: { waPhone: ctx.phone },
    data: { activeFlow: flow.id, stepId: null, data: ctx.data },
  });

  return [...routed, ...(await enterStep(flow, flow.order[0], ctx))];
}

async function advance(
  flow: Flow,
  stepId: string,
  ctx: FlowContext
): Promise<OutboundMessage[]> {
  const step = flow.steps[stepId];
  if (!step) {
    await clearFlow(ctx.phone);
    return [
      text('Something went wrong there — let us start again.'),
      ...(await routeIntent({ ...ctx, input: {}, data: {} })),
    ];
  }

  const result = await step.accept(ctx);

  if (!result.ok) {
    // Re-ask rather than dead-end. The correction comes first so they read why
    // before seeing the same question again.
    return [text(result.message), ...asArray(step.ask(ctx))];
  }

  const data = { ...ctx.data, ...(result.patch ?? {}) };

  if (result.exit) {
    const replies = flow.onExit
      ? await flow.onExit(result.exit, { ...ctx, data })
      : [text('Thank you — we have noted that.')];
    await clearFlow(ctx.phone);
    return replies;
  }

  const nextId = result.next !== undefined ? result.next : nextInOrder(flow, stepId);

  return enterStep(flow, nextId, { ...ctx, data });
}

/**
 * Move into a step, walking past any that skip themselves, and finishing the
 * flow if we run off the end.
 */
async function enterStep(
  flow: Flow,
  startId: string | null,
  ctx: FlowContext
): Promise<OutboundMessage[]> {
  let stepId = startId;

  while (stepId) {
    const step = flow.steps[stepId];
    if (!step) break;
    if (!step.skipIf?.(ctx)) break;
    stepId = nextInOrder(flow, stepId);
  }

  if (!stepId || !flow.steps[stepId]) {
    const replies = await flow.complete(ctx);
    await clearFlow(ctx.phone);
    return replies;
  }

  await prisma.conversation.update({
    where: { waPhone: ctx.phone },
    data: { stepId, data: ctx.data },
  });

  return asArray(flow.steps[stepId].ask(ctx));
}

function nextInOrder(flow: Flow, stepId: string): string | null {
  const i = flow.order.indexOf(stepId);
  return i >= 0 && i < flow.order.length - 1 ? flow.order[i + 1] : null;
}

async function clearFlow(phone: string): Promise<void> {
  await prisma.conversation
    .update({
      where: { waPhone: phone },
      data: { activeFlow: null, stepId: null, data: {} },
    })
    .catch(() => undefined);
}

async function upsertUser(phone: string) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return existing;

  // Customers are never approved — the row exists the moment someone messages.
  // Them opening the chat is the opt-in, and we record where it came from so
  // consent is evidence rather than an assumption.
  return prisma.user.create({
    data: {
      phone,
      contactChannel: 'whatsapp',
      waVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(), // WhatsApp verified this number already
      whatsappOptIn: true,
      optInSource: 'inbound_message',
      optInAt: new Date(),
    },
  });
}

function isCancel(msg: InboundMessage): boolean {
  if (msg.replyId === 'cancel') return true;
  const t = (msg.text ?? '').trim().toLowerCase();
  return t === 'cancel' || t === 'exit';
}

function isOptOut(msg: InboundMessage): boolean {
  const t = (msg.text ?? '').trim().toLowerCase();
  return t === 'stop' || t === 'unsubscribe' || t === 'വേണ്ട';
}

function asArray(m: OutboundMessage | OutboundMessage[]): OutboundMessage[] {
  return Array.isArray(m) ? m : [m];
}
