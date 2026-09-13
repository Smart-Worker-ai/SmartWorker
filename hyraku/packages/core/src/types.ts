// Channel-neutral message shapes.
//
// Nothing below mentions WhatsApp. The Cloud API adapter and the simulator both
// normalise into InboundMessage and both render OutboundMessage, which is what
// lets the entire bot be demonstrated before Meta approves anything.

export interface InboundMedia {
  /** base64 for the simulator; the Cloud adapter fills this after download. */
  data: string;
  mimeType: string;
  filename?: string;
  /** Set by the engine once the bytes are persisted — flows only ever see this. */
  storageKey?: string;
  sizeBytes?: number;
  sha256?: string;
}

export interface InboundMessage {
  /** Unique per message. The dedup key that stops webhook retries doubling up. */
  waMessageId: string;
  from: string; // E.164
  type: 'text' | 'interactive' | 'image' | 'document';
  text?: string;
  /** id of the tapped button or selected list row */
  replyId?: string;
  media?: InboundMedia;
  timestamp: Date;
}

export interface Button {
  id: string;
  title: string; // WhatsApp caps button titles at 20 chars
}

export interface ListRow {
  id: string;
  title: string; // 24 chars
  description?: string; // 72 chars
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export type OutboundMessage =
  | { kind: 'text'; body: string }
  | { kind: 'buttons'; body: string; buttons: Button[] }
  | { kind: 'list'; body: string; buttonLabel: string; sections: ListSection[] }
  | { kind: 'media_request'; body: string; accept: string }
  | {
      kind: 'template';
      name: string;
      body: string;
      buttons?: Button[];
    };

export const text = (body: string): OutboundMessage => ({ kind: 'text', body });

export const buttons = (body: string, btns: Button[]): OutboundMessage => ({
  kind: 'buttons',
  body,
  buttons: btns.slice(0, 3), // WhatsApp allows at most 3 reply buttons
});

export const list = (
  body: string,
  buttonLabel: string,
  sections: ListSection[]
): OutboundMessage => ({ kind: 'list', body, buttonLabel, sections });

export const template = (
  name: string,
  body: string,
  btns?: Button[]
): OutboundMessage => ({ kind: 'template', name, body, buttons: btns });

// ─── Flow machinery ──────────────────────────────────────────────────────────

export interface FlowContext {
  userId: string;
  phone: string;
  name: string | null;
  data: Record<string, any>;
  input: {
    text?: string;
    replyId?: string;
    media?: InboundMedia;
  };
}

export type AcceptResult =
  | { ok: true; patch?: Record<string, any>; next?: string | null; exit?: string }
  | { ok: false; message: string };

export interface Step {
  id: string;
  /** What we send on entering this step. */
  ask(ctx: FlowContext): OutboundMessage | OutboundMessage[];
  /** Validate the reply. Returning ok:false re-asks with the message shown first. */
  accept(ctx: FlowContext): AcceptResult;
  /**
   * Skip without asking. Used when a deep link already told us the answer —
   * tapping "Book an Electrician" on the site should not then ask which trade.
   */
  skipIf?(ctx: FlowContext): boolean;
}

export interface Flow {
  id: string;
  /** Sequence used when a step does not name an explicit `next`. */
  order: string[];
  steps: Record<string, Step>;
  complete(ctx: FlowContext): Promise<OutboundMessage[]>;
  /**
   * End the flow early for a reason that is not an error — someone asking for
   * work outside the districts we serve. They get a proper answer rather than a
   * re-ask loop, and the flow gets a chance to record why.
   */
  onExit?(reason: string, ctx: FlowContext): Promise<OutboundMessage[]>;
}

export const ok = (patch?: Record<string, any>, next?: string | null): AcceptResult => ({
  ok: true,
  patch,
  next,
});

export const fail = (message: string): AcceptResult => ({ ok: false, message });

/** Leave the flow now, handing `reason` to the flow's onExit. */
export const exit = (reason: string, patch?: Record<string, any>): AcceptResult => ({
  ok: true,
  patch,
  exit: reason,
});
