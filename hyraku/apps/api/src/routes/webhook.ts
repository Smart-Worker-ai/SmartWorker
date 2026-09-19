import { Router } from 'express';
import { handleInbound, saveMedia, type InboundMessage } from '@hyraku/core';
import { handleVerification, parseWebhook, verifySignature } from '@hyraku/whatsapp';
import { cloud, deliver, deliverAll } from '../channel.js';
import { env } from '../env.js';

// The WhatsApp Cloud API webhook.

export const webhookRouter = Router();

// Meta's one-time handshake when the callback URL is registered.
webhookRouter.get('/', (req, res) => {
  const result = handleVerification(req.query as Record<string, unknown>, env.whatsapp.verifyToken);
  if (!result.ok) return res.sendStatus(403);
  res.status(200).send(result.challenge);
});

webhookRouter.post('/', async (req, res) => {
  const raw = (req as any).rawBody;
  if (!raw) return res.sendStatus(400);

  // Unconditional. A webhook that accepts unsigned bodies accepts them from
  // whoever finds the URL, and every message here creates or moves a booking.
  if (!verifySignature(raw, req.get('x-hub-signature-256'), env.whatsapp.appSecret)) {
    return res.sendStatus(401);
  }

  // Acknowledge before doing any work. Meta retries anything it does not get a
  // prompt 2xx for, and a retry that arrives mid-processing is exactly what the
  // waMessageId uniqueness constraint is there to absorb.
  res.sendStatus(200);

  try {
    const parsed = parseWebhook(req.body);

    for (const status of parsed.statuses) {
      await updateDeliveryStatus(status.waMessageId, status.status);
    }

    for (const message of parsed.messages) {
      await process(message);
    }
  } catch (err) {
    console.error('[webhook] processing failed:', err);
  }
});

async function process(message: InboundMessage & { mediaId?: string }): Promise<void> {
  let inbound: InboundMessage = message;

  // Download now or lose it: Meta's media URLs expire within minutes and need
  // the auth header even then, so nothing may defer this.
  if (message.mediaId) {
    try {
      const media = await cloud.downloadMedia(message.mediaId);
      inbound = { ...message, media };
    } catch (err) {
      console.error(`[webhook] media ${message.mediaId} download failed:`, err);
    }
  }

  const result = await handleInbound(inbound);
  if (!result.processed) return; // duplicate — Meta retried

  await cloud.markRead(message.waMessageId);

  for (const reply of result.replies) await deliver(message.from, reply);
  await deliverAll(result.outbound);
}

async function updateDeliveryStatus(waMessageId: string, status: string): Promise<void> {
  const { prisma } = await import('@hyraku/db');
  await prisma.message
    .update({ where: { waMessageId }, data: { status } })
    .catch(() => undefined); // status for a message we never stored — ignore
}

export { saveMedia };
