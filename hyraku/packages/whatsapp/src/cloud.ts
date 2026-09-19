import type { InboundMedia, OutboundMessage } from '@hyraku/core';

// WhatsApp Cloud API client — direct to Meta, no BSP in the path.
//
// One of two transports. apps/api/src/channel.ts picks this or SMS from the
// recipient's contactChannel; both consume the same OutboundMessage.

export interface CloudConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
}

const GRAPH = 'https://graph.facebook.com';

export class WhatsAppCloudClient {
  constructor(private cfg: CloudConfig) {}

  private get base(): string {
    return `${GRAPH}/${this.cfg.apiVersion}`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.cfg.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /** Returns Meta's message id, which becomes our dedup key for the echo. */
  async send(to: string, message: OutboundMessage): Promise<string | null> {
    const payload = this.render(to, message);
    const res = await fetch(`${this.base}/${this.cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`WhatsApp send failed (${res.status}): ${detail}`);
    }
    const json = (await res.json()) as { messages?: Array<{ id: string }> };
    return json.messages?.[0]?.id ?? null;
  }

  private render(to: string, m: OutboundMessage): Record<string, unknown> {
    const envelope = { messaging_product: 'whatsapp', recipient_type: 'individual', to };

    switch (m.kind) {
      case 'text':
      case 'media_request':
        return { ...envelope, type: 'text', text: { preview_url: false, body: m.body } };

      case 'buttons':
        return {
          ...envelope,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: truncate(m.body, 1024) },
            action: {
              buttons: m.buttons.slice(0, 3).map((b) => ({
                type: 'reply',
                reply: { id: b.id, title: truncate(b.title, 20) },
              })),
            },
          },
        };

      case 'list':
        return {
          ...envelope,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: truncate(m.body, 1024) },
            action: {
              button: truncate(m.buttonLabel, 20),
              // Meta caps a list at 10 rows across all sections; the catalogue
              // is sized to fit, but clamp anyway so a data change cannot 400.
              sections: clampRows(m.sections),
            },
          },
        };

      case 'template':
        // Templates carry a fully-composed body here. Meta assembles approved
        // templates from parameters instead, so the adapter only reaches this
        // branch when the 24-hour window is closed and a template is required.
        return {
          ...envelope,
          type: 'template',
          template: {
            name: m.name,
            language: { code: 'en' },
            components: [
              { type: 'body', parameters: [{ type: 'text', text: truncate(m.body, 1024) }] },
            ],
          },
        };
    }
  }

  /**
   * Two hops, and the second one still needs the auth header — a Meta media URL
   * is useless on its own. The URL also expires within minutes, which is why
   * callers must persist the bytes immediately rather than storing the link.
   */
  async downloadMedia(mediaId: string): Promise<InboundMedia> {
    const metaRes = await fetch(`${this.base}/${mediaId}`, { headers: this.headers() });
    if (!metaRes.ok) throw new Error(`Media lookup failed (${metaRes.status})`);

    const meta = (await metaRes.json()) as { url: string; mime_type: string };

    const binRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${this.cfg.accessToken}` },
    });
    if (!binRes.ok) throw new Error(`Media download failed (${binRes.status})`);

    const buf = Buffer.from(await binRes.arrayBuffer());
    return { data: buf.toString('base64'), mimeType: meta.mime_type };
  }

  async markRead(waMessageId: string): Promise<void> {
    await fetch(`${this.base}/${this.cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: waMessageId,
      }),
    }).catch(() => undefined);
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

function clampRows<T extends { rows: unknown[] }>(sections: T[]): T[] {
  let budget = 10;
  const out: T[] = [];
  for (const s of sections) {
    if (budget <= 0) break;
    const rows = s.rows.slice(0, budget);
    budget -= rows.length;
    out.push({ ...s, rows });
  }
  return out;
}
