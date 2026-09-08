import crypto from 'node:crypto';
import type { InboundMessage } from '@hyraku/core';

// Webhook verification and parsing.
//
// Meta retries anything it does not get a fast 2xx for. The route must
// therefore acknowledge first and process after, and every parsed message
// carries Meta's own id so the engine's dedup can absorb the retry. Those two
// properties together are what stop a retry becoming a second booking.

export function verifySignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const expected = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const given = signatureHeader.slice('sha256='.length);

  // Constant-time compare; length check first because timingSafeEqual throws
  // on a length mismatch rather than returning false.
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** GET handshake Meta performs when you first register the callback URL. */
export function handleVerification(
  query: Record<string, unknown>,
  verifyToken: string
): { ok: boolean; challenge?: string } {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    return { ok: true, challenge: String(challenge ?? '') };
  }
  return { ok: false };
}

export interface ParsedWebhook {
  messages: Array<InboundMessage & { mediaId?: string }>;
  statuses: Array<{ waMessageId: string; status: string; recipient: string }>;
}

export function parseWebhook(body: any): ParsedWebhook {
  const out: ParsedWebhook = { messages: [], statuses: [] };

  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};

      for (const m of value.messages ?? []) {
        const parsed = parseMessage(m);
        if (parsed) out.messages.push(parsed);
      }

      for (const s of value.statuses ?? []) {
        out.statuses.push({
          waMessageId: s.id,
          status: s.status,
          recipient: normalisePhone(s.recipient_id),
        });
      }
    }
  }

  return out;
}

function parseMessage(m: any): (InboundMessage & { mediaId?: string }) | null {
  const base = {
    waMessageId: m.id as string,
    from: normalisePhone(m.from),
    timestamp: new Date(Number(m.timestamp ?? Date.now() / 1000) * 1000),
  };

  switch (m.type) {
    case 'text':
      return { ...base, type: 'text', text: m.text?.body ?? '' };

    case 'interactive': {
      const i = m.interactive ?? {};
      const reply = i.button_reply ?? i.list_reply;
      return {
        ...base,
        type: 'interactive',
        replyId: reply?.id,
        text: reply?.title,
      };
    }

    // Quick-reply buttons on a template come back as a plain `button`, not as
    // `interactive` — easy to miss, and it is the reply path for job offers.
    case 'button':
      return {
        ...base,
        type: 'interactive',
        replyId: m.button?.payload,
        text: m.button?.text,
      };

    case 'image':
      return { ...base, type: 'image', mediaId: m.image?.id, text: m.image?.caption };

    case 'document':
      return { ...base, type: 'document', mediaId: m.document?.id, text: m.document?.caption };

    default:
      // Location, contacts, stickers, reactions — nothing the flows consume yet.
      // Returning null drops them silently rather than half-processing.
      return null;
  }
}

/** Meta sends bare digits; everything internal is E.164. */
export function normalisePhone(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return `+${digits}`;
}
