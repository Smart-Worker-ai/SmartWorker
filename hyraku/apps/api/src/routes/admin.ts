import { Router } from 'express';
import { prisma } from '@hyraku/db';
import {
  ALL_KERALA_DISTRICTS,
  SERVICE_DISTRICTS,
  TRADES,
  assignWorker,
  bookingsOpen,
  prettyStatus,
  rankCandidates,
  resolveUrl,
  setBookingsOpen,
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
  const [open, urgent, pendingWorkers, approvedWorkers, customers, confirmed, waitlist, isOpen] =
    await Promise.all([
      prisma.jobRequest.count({ where: { status: { in: ['new', 'assigning'] } } }),
      prisma.jobRequest.count({ where: { status: { in: ['new', 'assigning'] }, isUrgent: true } }),
      prisma.workerProfile.count({ where: { status: 'pending' } }),
      prisma.workerProfile.count({ where: { status: 'approved' } }),
      prisma.customerProfile.count(),
      prisma.jobRequest.count({ where: { status: { in: ['assigned', 'confirmed'] } } }),
      prisma.waitlistEntry.count({ where: { notifiedAt: null } }),
      bookingsOpen(),
    ]);

  res.json({
    open,
    urgent,
    pendingWorkers,
    approvedWorkers,
    customers,
    confirmed,
    waitlist,
    bookingsOpen: isOpen,
    serviceDistricts: SERVICE_DISTRICTS,
  });
});

// ─── Launch ──────────────────────────────────────────────────────────────────

adminRouter.get('/settings', async (_req, res) => {
  res.json({ bookingsOpen: await bookingsOpen(), serviceDistricts: SERVICE_DISTRICTS });
});

adminRouter.post('/settings', async (req, res) => {
  const { bookingsOpen: open } = req.body ?? {};
  if (typeof open !== 'boolean') return res.status(400).json({ error: 'bookingsOpen must be true or false' });
  await setBookingsOpen(open);
  res.json({ ok: true, bookingsOpen: open });
});

/**
 * The launch decision, as data. "Do we have enough workers?" is answered per
 * trade, not in total — forty painters and no plumber is not a launch. Home
 * districts and the waitlist together show where to open next.
 */
adminRouter.get('/coverage', async (_req, res) => {
  const [workers, waitlist] = await Promise.all([
    prisma.workerProfile.findMany({
      where: { status: { in: ['approved', 'pending'] } },
      select: { trade: true, district: true, status: true },
    }),
    prisma.waitlistEntry.findMany({
      where: { notifiedAt: null },
      select: { role: true, district: true, trade: true, reason: true },
    }),
  ]);

  const trades = TRADES.map((t) => {
    const mine = workers.filter((w) => w.trade === t.id);
    return {
      trade: t.id,
      label: t.label,
      approved: mine.filter((w) => w.status === 'approved').length,
      pending: mine.filter((w) => w.status === 'pending').length,
      livingInServiceArea: mine.filter(
        (w) => w.status === 'approved' && SERVICE_DISTRICTS.includes(w.district)
      ).length,
      customersWaiting: waitlist.filter((e) => e.role === 'customer' && e.trade === t.id).length,
    };
  });

  const districts = ALL_KERALA_DISTRICTS.map((d) => ({
    district: d,
    serviced: SERVICE_DISTRICTS.includes(d),
    workersLivingHere: workers.filter((w) => w.district === d && w.status === 'approved').length,
    pendingLivingHere: workers.filter((w) => w.district === d && w.status === 'pending').length,
    workersWaiting: waitlist.filter((e) => e.role === 'worker' && e.district === d).length,
    customersWaiting: waitlist.filter((e) => e.role === 'customer' && e.district === d).length,
  }));

  res.json({
    serviceDistricts: SERVICE_DISTRICTS,
    trades,
    districts,
    waitlist: {
      customersForLaunch: waitlist.filter((e) => e.reason === 'bookings_closed').length,
      customersOutsideArea: waitlist.filter((e) => e.reason === 'outside_service_area').length,
      workersOutsideArea: waitlist.filter((e) => e.reason === 'cannot_work_in_service_area').length,
    },
  });
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
  const { workerId, responseRequired } = req.body ?? {};
  if (!workerId) return res.status(400).json({ error: 'workerId is required' });

  const result = await assignWorker({
    jobRequestId: req.params.id,
    workerId,
    responseRequired: Boolean(responseRequired),
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
    include: { user: { include: { conversation: true } }, documents: true, assignments: true },
  });

  const WINDOW_MS = 24 * 60 * 60 * 1000;

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
      usualDailyRate: w.usualDailyRate,
      experienceYears: w.experienceYears,
      // When the free reply window to this worker closes. Approving before then
      // is a free, ordinary message; after it, WhatsApp requires a paid template
      // that also counts against the daily messaging limit.
      replyWindowClosesAt: w.user.conversation?.lastInboundAt
        ? new Date(w.user.conversation.lastInboundAt.getTime() + WINDOW_MS)
        : null,
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
