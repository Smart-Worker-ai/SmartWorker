import { Router } from 'express';
import { prisma } from '@hyraku/db';
import {
  assignWorker,
  prettyStatus,
  rankCandidates,
  resolveUrl,
  setWorkerStatus,
  tradeLabel,
} from '@hyraku/core';
import { deliverAll } from '../channel.js';
import { env } from '../env.js';

// The admin console API.
//
// In an assign-by-hand model this is not back-office — every job in the
// business passes through these endpoints, so they are shaped around the one
// action that matters: see the queue, pick a worker, move on.

export const adminRouter = Router();

adminRouter.use((req, res, next) => {
  if (req.path === '/login') return next();
  const key = req.get('x-admin-key');
  if (key !== env.adminPassword) return res.status(401).json({ error: 'Unauthorised' });
  next();
});

adminRouter.post('/login', (req, res) => {
  const { password } = req.body ?? {};
  if (password !== env.adminPassword) return res.status(401).json({ error: 'Wrong password' });
  res.json({ ok: true, key: env.adminPassword });
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

adminRouter.get('/stats', async (_req, res) => {
  const [open, urgent, pendingWorkers, approvedWorkers, customers, confirmed] = await Promise.all([
    prisma.jobRequest.count({ where: { status: { in: ['new', 'assigning'] } } }),
    prisma.jobRequest.count({ where: { status: { in: ['new', 'assigning'] }, isUrgent: true } }),
    prisma.workerProfile.count({ where: { status: 'pending' } }),
    prisma.workerProfile.count({ where: { status: 'approved' } }),
    prisma.customerProfile.count(),
    prisma.jobRequest.count({ where: { status: { in: ['assigned', 'confirmed'] } } }),
  ]);

  res.json({ open, urgent, pendingWorkers, approvedWorkers, customers, confirmed });
});

// ─── Jobs ────────────────────────────────────────────────────────────────────

adminRouter.get('/jobs', async (req, res) => {
  const status = String(req.query.status ?? 'open');

  const where =
    status === 'open'
      ? { status: { in: ['new', 'assigning'] } }
      : status === 'active'
        ? { status: { in: ['assigned', 'confirmed', 'in_progress'] } }
        : status === 'all'
          ? {}
          : { status };

  const jobs = await prisma.jobRequest.findMany({
    where,
    // Urgent first, then oldest — a queue, not a feed. The thing most at risk
    // of being late sits at the top.
    orderBy: [{ isUrgent: 'desc' }, { createdAt: 'asc' }],
    take: 100,
    include: {
      customer: true,
      assignments: {
        where: { status: { in: ['proposed', 'accepted'] } },
        include: { worker: { include: { user: true } } },
      },
    },
  });

  res.json(
    jobs.map((j) => ({
      id: j.id,
      refNo: j.refNo,
      trade: j.trade,
      tradeLabel: tradeLabel(j.trade),
      district: j.district,
      town: j.town,
      address: j.address,
      preferredDate: j.preferredDate,
      durationDays: j.durationDays,
      isUrgent: j.isUrgent,
      notes: j.notes,
      status: j.status,
      statusLabel: prettyStatus(j.status),
      createdAt: j.createdAt,
      customer: { name: j.customer.name, phone: j.customer.phone },
      assignment: j.assignments[0]
        ? {
            id: j.assignments[0].id,
            status: j.assignments[0].status,
            agreedRate: j.assignments[0].agreedRate,
            responseRequired: j.assignments[0].responseRequired,
            worker: {
              uid: j.assignments[0].worker.workerUid,
              name: j.assignments[0].worker.user.name,
              phone: j.assignments[0].worker.user.phone,
            },
          }
        : null,
    }))
  );
});

adminRouter.get('/jobs/:id/candidates', async (req, res) => {
  res.json(await rankCandidates(req.params.id));
});

adminRouter.post('/jobs/:id/assign', async (req, res) => {
  const { workerId, responseRequired, agreedRate } = req.body ?? {};
  if (!workerId) return res.status(400).json({ error: 'workerId is required' });

  const result = await assignWorker({
    jobRequestId: req.params.id,
    workerId,
    responseRequired: Boolean(responseRequired),
    agreedRate: agreedRate ? Number(agreedRate) : undefined,
  });

  if (!result.ok) return res.status(400).json({ error: result.error });

  await deliverAll(result.outbound);
  res.json({ ok: true, notified: result.outbound.length });
});

adminRouter.post('/jobs/:id/status', async (req, res) => {
  const { status } = req.body ?? {};
  const allowed = ['new', 'assigning', 'in_progress', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Bad status' });

  await prisma.jobRequest.update({ where: { id: req.params.id }, data: { status } });
  res.json({ ok: true });
});

// ─── Workers ─────────────────────────────────────────────────────────────────

adminRouter.get('/workers', async (req, res) => {
  const status = String(req.query.status ?? 'pending');

  const workers = await prisma.workerProfile.findMany({
    where: status === 'all' ? {} : { status },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: true, documents: true, assignments: true },
  });

  res.json(
    workers.map((w) => ({
      id: w.id,
      workerUid: w.workerUid,
      name: w.user.name,
      phone: w.user.phone,
      age: w.age,
      gender: w.gender,
      trade: w.trade,
      tradeLabel: tradeLabel(w.trade),
      district: w.district,
      town: w.town,
      serviceAreas: w.serviceAreas,
      dailyRate: w.dailyRate,
      experienceYears: w.experienceYears,
      rating: w.rating,
      totalReviews: w.totalReviews,
      status: w.status,
      statusReason: w.statusReason,
      acceptedTerms: w.acceptedTerms,
      acceptedTermsAt: w.acceptedTermsAt,
      termsVersion: w.termsVersion,
      totalJobs: w.assignments.filter((a) => a.status === 'accepted').length,
      createdAt: w.createdAt,
      documents: w.documents.map((d) => ({
        id: d.id,
        kind: d.kind,
        // Short-lived by contract. In production this is a presigned R2 URL —
        // KYC images are never public objects.
        url: resolveUrl(d.storageKey),
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
      })),
    }))
  );
});

adminRouter.post('/workers/:id/status', async (req, res) => {
  const { status, reason } = req.body ?? {};
  if (!['approved', 'rejected', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Bad status' });
  }

  const result = await setWorkerStatus(req.params.id, status, reason);
  await deliverAll(result.outbound);
  res.json({ ok: true });
});

// ─── Conversations ───────────────────────────────────────────────────────────

adminRouter.get('/conversations', async (_req, res) => {
  const convos = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: { user: { include: { worker: true } } },
  });

  const withCounts = await Promise.all(
    convos.map(async (c) => ({
      phone: c.waPhone,
      name: c.user.name,
      role: c.user.worker ? 'worker' : 'customer',
      activeFlow: c.activeFlow,
      stepId: c.stepId,
      lastInboundAt: c.lastInboundAt,
      // Shown in the console so an agent can see at a glance whether they can
      // still type freely or need a template.
      windowOpen: c.lastInboundAt
        ? Date.now() - c.lastInboundAt.getTime() < 24 * 60 * 60 * 1000
        : false,
      messageCount: await prisma.message.count({ where: { waPhone: c.waPhone } }),
    }))
  );

  res.json(withCounts);
});
