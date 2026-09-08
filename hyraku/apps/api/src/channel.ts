import { prisma } from '@hyraku/db';
import type { Envelope, OutboundMessage } from '@hyraku/core';
import { WhatsAppCloudClient } from '@hyraku/whatsapp';
import { env } from './env.js';

// The only place in the codebase that knows how a message physically leaves.
//
// Both channels persist to the same Message table first, which is what lets the
// simulator render a thread that is byte-for-byte what production would have
// sent, and what gives the admin console a transcript either way.

const cloud =
  env.channel === 'cloud'
    ? new WhatsAppCloudClient({
        phoneNumberId: env.whatsapp.phoneNumberId,
        accessToken: env.whatsapp.accessToken,
        apiVersion: env.whatsapp.apiVersion,
      })
    : null;

const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Is the free-form service window open for this number?
 *
 * WhatsApp only permits non-template messages within 24 hours of the person's
 * last inbound message. Deciding it here rather than at each call site is
 * deliberate: a caller that forgets produces a failed send in production and
 * nothing at all in the simulator, which is the worst way to find out.
 */
export async function windowOpen(phone: string): Promise<boolean> {
  const convo = await prisma.conversation.findUnique({ where: { waPhone: phone } });
  if (!convo?.lastInboundAt) return false;
  return Date.now() - convo.lastInboundAt.getTime() < WINDOW_MS;
}

export async function deliver(to: string, message: OutboundMessage): Promise<void> {
  const user = await prisma.user.findUnique({ where: { phone: to } });

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

  if (cloud) {
    try {
      waMessageId = await cloud.send(to, effective);
    } catch (err) {
      status = 'failed';
      console.error(`[channel] send to ${to} failed:`, (err as Error).message);
    }
  }

  await prisma.message.create({
    data: {
      waMessageId,
      direction: 'out',
      userId: user?.id ?? null,
      waPhone: to,
      type: effective.kind === 'template' ? 'template' : effective.kind,
      body: 'body' in effective ? effective.body : null,
      payload: JSON.stringify(effective),
      templateName: message.kind === 'template' ? message.name : null,
      status,
    },
  });
}

export async function deliverAll(envelopes: Envelope[]): Promise<void> {
  for (const e of envelopes) await deliver(e.to, e.message);
}

export { cloud };
