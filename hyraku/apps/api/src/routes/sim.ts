import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '@hyraku/db';
import { handleInbound, type InboundMessage } from '@hyraku/core';
import { deliver, deliverAll } from '../channel.js';

// The WhatsApp simulator.
//
// This exists because Meta business verification takes weeks and the product
// needs demonstrating now. It injects exactly the InboundMessage shape the
// Cloud API webhook produces and reads back the same persisted thread, so what
// the simulator shows is what the real channel would send — not a mock-up of it.

export const simRouter = Router();

export interface Persona {
  phone: string;
  label: string;
  role: 'customer' | 'worker';
}

simRouter.get('/personas', async (_req, res) => {
  const workers = await prisma.workerProfile.findMany({
    where: { status: 'approved' },
    include: { user: true },
    take: 6,
    orderBy: { createdAt: 'asc' },
  });

  const pending = await prisma.workerProfile.findMany({
    where: { status: 'pending' },
    include: { user: true },
    take: 4,
  });

  res.json({
    customers: [
      { phone: '+919846010001', label: 'Anjali (new customer)', role: 'customer' },
      { phone: '+919846010002', label: 'Rahul (new customer)', role: 'customer' },
    ],
    workers: [...workers, ...pending].map((w) => ({
      phone: w.user.phone,
      label: `${w.user.name} · ${w.workerUid} · ${w.status}`,
      role: 'worker' as const,
    })),
  });
});

simRouter.get('/thread/:phone', async (req, res) => {
  const phone = decodeURIComponent(req.params.phone);

  const messages = await prisma.message.findMany({
    where: { waPhone: phone },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  const convo = await prisma.conversation.findUnique({ where: { waPhone: phone } });
  const user = await prisma.user.findUnique({
    where: { phone },
    include: { worker: true },
  });

  res.json({
    phone,
    name: user?.name ?? null,
    workerUid: user?.worker?.workerUid ?? null,
    activeFlow: convo?.activeFlow ?? null,
    stepId: convo?.stepId ?? null,
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      type: m.type,
      body: m.body,
      payload: safeParse(m.payload),
      templateName: m.templateName,
      createdAt: m.createdAt,
    })),
  });
});

simRouter.post('/send', async (req, res) => {
  const { phone, text, replyId, media } = req.body ?? {};
  if (!phone) return res.status(400).json({ error: 'phone is required' });

  const msg: InboundMessage = {
    // Meta guarantees uniqueness; here we generate it. Either way it is the
    // dedup key, and the simulator can replay one to prove dedup works.
    waMessageId: req.body.waMessageId || `sim.${crypto.randomUUID()}`,
    from: phone,
    type: media ? 'image' : replyId ? 'interactive' : 'text',
    text: text || undefined,
    replyId: replyId || undefined,
    media: media ? { data: media.data, mimeType: media.mimeType } : undefined,
    timestamp: new Date(),
  };

  try {
    const result = await handleInbound(msg);

    for (const reply of result.replies) await deliver(phone, reply);
    await deliverAll(result.outbound);

    res.json({ processed: result.processed, replies: result.replies.length });
  } catch (err) {
    console.error('[sim] handler failed:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

simRouter.post('/reset/:phone', async (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  await prisma.message.deleteMany({ where: { waPhone: phone } });
  await prisma.conversation
    .update({
      where: { waPhone: phone },
      data: { activeFlow: null, stepId: null, data: '{}' },
    })
    .catch(() => undefined);
  res.json({ ok: true });
});

function safeParse(raw: string): Record<string, any> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
