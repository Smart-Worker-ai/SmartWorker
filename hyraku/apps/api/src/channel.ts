import { prisma } from '@hyraku/db';
import type { Envelope, OutboundMessage } from '@hyraku/core';
import { WhatsAppCloudClient } from '@hyraku/whatsapp';
import { env } from './env.js';

// The only place in the codebase that knows how a message physically leaves.
//
// Both transports persist to the same Message table first, which is what gives
// the admin console one transcript per person regardless of how each message
// travelled.

export const cloud = new WhatsAppCloudClient({
  phoneNumberId: env.whatsapp.phoneNumberId,
  accessToken: env.whatsapp.accessToken,
  apiVersion: env.whatsapp.apiVersion,
});

const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Is the free-form service window open for this number?
 *
 * WhatsApp only permits non-template messages within 24 hours of the person's
 * last inbound message. Deciding it here rather than at each call site is
 * deliberate: a caller that forgets produces a failed send in production and
 * nothing at all in development, which is the worst way to find out.
 */
export async function windowOpen(phone: string): Promise<boolean> {
  const convo = await prisma.conversation.findUnique({ where: { waPhone: phone } });
  if (!convo?.lastInboundAt) return false;
  return Date.now() - convo.lastInboundAt.getTime() < WINDOW_MS;
}

export async function deliver(to: string, message: OutboundMessage): Promise<void> {
  const user = await prisma.user.findUnique({ where: { phone: to } });

  // A number that is not on WhatsApp still belongs to a registered worker.
  // SMS carries no buttons, so the dispatcher follows up by phone for anything
  // that needs an answer.
  if (user?.contactChannel === 'sms') {
    return deliverBySms(to, message, user.id);
  }

  let effective = message;

  // Inside the window, send a template's text free-form: richer, cheaper, and
  // it keeps buttons that a plain template body would lose.
  if (message.kind === 'template' && (await windowOpen(to))) {
    effective = message.buttons?.length
      ? { kind: 'buttons', body: message.body, buttons: message.buttons }
      : { kind: 'text', body: message.body };
  }

  let waMessageId: string | null = null;
  let status = 'sent';
  let error: string | null = null;

  try {
    waMessageId = await cloud.send(to, effective);
  } catch (err) {
    status = 'failed';
    error = (err as Error).message;
    console.error(`[channel] send to ${to} failed:`, error);
  }

  await prisma.message.create({
    data: {
      waMessageId,
      direction: 'out',
      userId: user?.id ?? null,
      waPhone: to,
      channel: 'whatsapp',
      type: effective.kind === 'template' ? 'template' : effective.kind,
      body: 'body' in effective ? effective.body : null,
      payload: effective as object,
      templateName: message.kind === 'template' ? message.name : null,
      status,
      error,
    },
  });
}

async function deliverBySms(
  to: string,
  message: OutboundMessage,
  userId: string
): Promise<void> {
  // Buttons and lists have no SMS equivalent; the body carries the instruction
  // to reply in words instead.
  const body = 'body' in message ? message.body : '';

  await prisma.message.create({
    data: {
      direction: 'out',
      userId,
      waPhone: to,
      channel: 'sms',
      type: 'text',
      body,
      payload: message as object,
      status: 'queued',
    },
  });
}

export async function deliverAll(envelopes: Envelope[]): Promise<void> {
  for (const e of envelopes) await deliver(e.to, e.message);
}
