import { Router } from 'express';
import { prisma } from '@hyraku/db';
import {
  ALL_KERALA_DISTRICTS,
  SERVICE_DISTRICTS,
  TRADES,
  applyRateCard,
  dispatchable,
  formatRate,
  offerJob,
  nameCrew,
  prettyStatus,
  rankCandidates,
  rateFor,
  readDocument,
  reliabilityLabel,
  setWorkerStatus,
  tradeLabel,
} from '@hyraku/core';
import { deliverAll } from '../channel.js';
import { env } from '../env.js';

// The dispatch console API.
//
// In an assign-by-hand model this is not back-office — every job in the
// business passes through these endpoints, so they are shaped around the one
// action that matters: see the queue, pick a worker, move on.
//
// INTERIM: authentication is still a shared password. This router moves to
// apps/admin, on its own host behind a private tunnel, with sessions against
// AdminUser and an audit row per mutation.

export const adminRouter = Router();

adminRouter.use((req, res, next) => {
  if (req.path === '/login') return next();
  if (req.get('x-admin-key') !== env.adminPassword) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  next();
});

adminRouter.post('/login', (req, res) => {
  const { password } = req.body ?? {};
  if (password !== env.adminPassword) return res.status(401).json({ error: 'Wrong password' });
  res.json({ ok: true, key: env.adminPassword });
});

const wrap =
  (handler: (req: any, res: any) => Promise<unknown>) => (req: any, res: any, next: any) =>
    handler(req, res).catch(next);

// ─── Dashboard ───────────────────────────────────────────────────────────────

adminRouter.get(
  '/stats',
  wrap(async (_req, res) => {
    const now = new Date();
    const currentPvc = { pvcVerifiedAt: { not: null }, OR: [{ pvcExpiresAt: null }, { pvcExpiresAt: { gt: now } }] };

    const [open, urgent, pendingWorkers, approvedWorkers, readyWorkers, customers, confirmed, waitlist, grievances, settings] =
      await Promise.all([
        prisma.jobRequest.count({ where: { status: { in: ['new', 'assigning'] } } }),
        prisma.jobRequest.count({ where: { status: { in: ['new', 'assigning'] }, isUrgent: true } }),
        prisma.workerProfile.count({ where: { status: 'pending' } }),
        prisma.workerProfile.count({ where: { status: 'approved' } }),
        // The number that actually matters for launch: approved is not the
        // same as sendable once police verification is in the picture.
        prisma.workerProfile.count({ where: { status: 'approved', ...currentPvc } }),
        prisma.customerProfile.count(),
        prisma.jobRequest.count({ where: { status: { in: ['assigned', 'confirmed'] } } }),
        prisma.waitlistEntry.count({ where: { notifiedAt: null } }),
        prisma.grievance.count({ where: { status: { in: ['open', 'investigating'] } } }),
        prisma.setting.findUnique({ where: { key: 'bookings_open' } }),
      ]);

    res.json({
      open,
      urgent,
      pendingWorkers,
      approvedWorkers,
      readyWorkers,
      awaitingPvc: approvedWorkers - readyWorkers,
      customers,
      confirmed,
      waitlist,
      grievances,
      bookingsOpen: settings?.value === 'true',
      serviceDistricts: SERVICE_DISTRICTS,
    });
  })
);

// ─── Launch ──────────────────────────────────────────────────────────────────

adminRouter.get(
  '/settings',
  wrap(async (_req, res) => {
    const row = await prisma.setting.findUnique({ where: { key: 'bookings_open' } });
    res.json({ bookingsOpen: row?.value === 'true', serviceDistricts: SERVICE_DISTRICTS });
  })
);

adminRouter.post(
  '/settings',
  wrap(async (req, res) => {
    const { bookingsOpen } = req.body ?? {};
    if (typeof bookingsOpen !== 'boolean') {
      return res.status(400).json({ error: 'bookingsOpen must be true or false' });
    }
    await prisma.setting.upsert({
      where: { key: 'bookings_open' },
      update: { value: String(bookingsOpen) },
      create: { key: 'bookings_open', value: String(bookingsOpen) },
    });
    res.json({ ok: true, bookingsOpen });
  })
);

/**
 * The launch decision, as data. "Do we have enough workers?" is answered per
 * trade, not in total — forty painters and no plumber is not a launch — and
 * counted as workers who can actually be sent, not merely approved.
 */
adminRouter.get(
  '/coverage',
  wrap(async (_req, res) => {
    const now = new Date();
    const [workers, waitlist] = await Promise.all([
      prisma.workerProfile.findMany({
        where: { status: { in: ['approved', 'pending'] } },
        select: {
          trade: true,
          crewTrades: true,
          district: true,
          status: true,
          kind: true,
          pvcVerifiedAt: true,
          pvcExpiresAt: true,
        },
      }),
      prisma.waitlistEntry.findMany({
        where: { notifiedAt: null },
        select: { role: true, district: true, trade: true, reason: true },
      }),
    ]);

    const ready = (w: (typeof workers)[number]) =>
      w.status === 'approved' && w.pvcVerifiedAt !== null && (!w.pvcExpiresAt || w.pvcExpiresAt > now);

    const trades = TRADES.map((t) => {
      const mine = workers.filter((w) => w.trade === t.id);
      return {
        trade: t.id,
        label: t.label,
        approved: mine.filter((w) => w.status === 'approved').length,
        pending: mine.filter((w) => w.status === 'pending').length,
        dispatchable: mine.filter(ready).length,
        awaitingPvc: mine.filter((w) => w.status === 'approved' && !w.pvcVerifiedAt).length,
        leads: workers.filter((w) => w.kind !== 'individual' && w.crewTrades.includes(t.id) && ready(w)).length,
        livingInServiceArea: mine.filter((w) => ready(w) && SERVICE_DISTRICTS.includes(w.district)).length,
        customersWaiting: waitlist.filter((e) => e.role === 'customer' && e.trade === t.id).length,
      };
    });

    const districts = ALL_KERALA_DISTRICTS.map((d) => ({
      district: d,
      serviced: SERVICE_DISTRICTS.includes(d),
      workersLivingHere: workers.filter((w) => w.district === d && ready(w)).length,
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
  })
);

// ─── Jobs ────────────────────────────────────────────────────────────────────

adminRouter.get(
  '/jobs',
  wrap(async (req, res) => {
    const status = String(req.query.status ?? 'open');

    const where =
      status === 'open'
        ? { status: { in: ['new' as const, 'assigning' as const] } }
        : status === 'active'
          ? { status: { in: ['assigned' as const, 'confirmed' as const, 'in_progress' as const] } }
          : status === 'all'
            ? {}
            : { status: status as any };

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
          include: {
            responder: { include: { user: true } },
            members: { include: { worker: { include: { user: true } } } },
          },
        },
      },
    });

    res.json(
      jobs.map((j) => {
        const a = j.assignments[0];
        return {
          id: j.id,
          refNo: j.refNo,
          trade: j.trade,
          tradeLabel: tradeLabel(j.trade),
          workersNeeded: j.workersNeeded,
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
          assignment: a
            ? {
                id: a.id,
                status: a.status,
                headcount: a.headcount,
                responseRequired: a.responseRequired,
                expiresAt: a.expiresAt,
                responder: {
                  uid: a.responder.workerUid,
                  kind: a.responder.kind,
                  name: a.responder.user.name,
                  phone: a.responder.user.phone,
                },
                // Empty for a crew until the lead names it — the gap the
                // console needs to chase before the day.
                crew: a.members.map((m) => ({
                  uid: m.worker.workerUid,
                  name: m.worker.user.name,
                  phone: m.worker.user.phone,
                  rate: m.agreedRate,
                })),
                crewComplete: a.members.length >= a.headcount,
              }
            : null,
        };
      })
    );
  })
);

adminRouter.get(
  '/jobs/:id/candidates',
  wrap(async (req, res) => res.json(await rankCandidates(req.params.id)))
);

adminRouter.post(
  '/jobs/:id/assign',
  wrap(async (req, res) => {
    const { workerId, capacity, headcount, responseRequired } = req.body ?? {};
    if (!workerId) return res.status(400).json({ error: 'workerId is required' });
    if (capacity !== 'personal' && capacity !== 'lead') {
      return res.status(400).json({ error: 'capacity must be personal or lead' });
    }

    const result = await offerJob({
      jobRequestId: req.params.id,
      responderId: workerId,
      capacity,
      headcount: headcount ? Number(headcount) : undefined,
      responseRequired: Boolean(responseRequired),
    });

    if (!result.ok) return res.status(400).json({ error: result.error });

    await deliverAll(result.outbound);
    res.json({ ok: true, notified: result.outbound.length });
  })
);

adminRouter.post(
  '/assignments/:id/crew',
  wrap(async (req, res) => {
    const { workerIds } = req.body ?? {};
    if (!Array.isArray(workerIds) || workerIds.length === 0) {
      return res.status(400).json({ error: 'workerIds is required' });
    }

    const result = await nameCrew(req.params.id, workerIds);
    if (!result.ok) return res.status(400).json({ error: result.error });

    await deliverAll(result.outbound);
    res.json({ ok: true, notified: result.outbound.length });
  })
);

adminRouter.post(
  '/jobs/:id/status',
  wrap(async (req, res) => {
    const allowed = ['new', 'assigning', 'in_progress', 'completed', 'cancelled'];
    const { status } = req.body ?? {};
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Bad status' });

    await prisma.jobRequest.update({ where: { id: req.params.id }, data: { status } });
    res.json({ ok: true });
  })
);

// ─── Workers ─────────────────────────────────────────────────────────────────

adminRouter.get(
  '/workers',
  wrap(async (req, res) => {
    const status = String(req.query.status ?? 'pending');
    const kind = req.query.kind ? String(req.query.kind) : undefined;

    const workers = await prisma.workerProfile.findMany({
      where: {
        ...(status === 'all' ? {} : { status: status as any }),
        ...(kind ? { kind: kind as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { include: { conversation: true } },
        documents: true,
        lead: { include: { user: true } },
        crew: { select: { id: true } },
        crewMemberships: { where: { assignment: { status: 'accepted' } }, select: { id: true } },
      },
    });

    const WINDOW_MS = 24 * 60 * 60 * 1000;

    res.json(
      workers.map((w) => ({
        id: w.id,
        workerUid: w.workerUid,
        kind: w.kind,
        name: w.user.name,
        phone: w.user.phone,
        contactChannel: w.user.contactChannel,
        lead: w.lead ? { uid: w.lead.workerUid, name: w.lead.user.name, kind: w.lead.kind } : null,
        referralCode: w.referralCode,
        crewSize: w.crew.length,
        worksWithCrews: w.worksWithCrews,
        age: w.age,
        gender: w.gender,
        trade: w.trade,
        tradeLabel: tradeLabel(w.trade),
        crewTrades: w.crewTrades,
        district: w.district,
        town: w.town,
        serviceAreas: w.serviceAreas,
        usualDailyRate: w.usualDailyRate,
        rateTier: w.rateTier,
        publishedRate: w.publishedRate,
        publishedRateLabel: w.publishedRate ? formatRate(w.publishedRate) : null,
        rateOverride: w.rateOverride,
        experienceYears: w.experienceYears,
        reliability: w.reliability,
        reliabilityLabel: reliabilityLabel(w.reliability),
        probationJobs: w.probationJobs,
        noShowCount: w.noShowCount,
        // When the free reply window to this worker closes. Approving before
        // then is an ordinary message; after it, WhatsApp requires a paid
        // template that also counts against the daily messaging limit.
        replyWindowClosesAt: w.user.conversation?.lastInboundAt
          ? new Date(w.user.conversation.lastInboundAt.getTime() + WINDOW_MS)
          : null,
        rating: w.rating,
        totalReviews: w.totalReviews,
        status: w.status,
        statusReason: w.statusReason,
        pvc: {
          number: w.pvcNumber,
          station: w.pvcStation,
          issuedAt: w.pvcIssuedAt,
          verifiedAt: w.pvcVerifiedAt,
          expiresAt: w.pvcExpiresAt,
        },
        dispatchable: dispatchable(w as any),
        acceptedTerms: w.acceptedTerms,
        acceptedTermsAt: w.acceptedTermsAt,
        termsVersion: w.termsVersion,
        totalJobs: w.crewMemberships.length,
        createdAt: w.createdAt,
        // Ids, not URLs. The bytes come back through the endpoint below, which
        // decrypts them and records who looked.
        documents: w.documents.map((d) => ({
          id: d.id,
          kind: d.kind,
          mimeType: d.mimeType,
          sizeBytes: d.sizeBytes,
          verifiedAt: d.verifiedAt,
        })),
      }))
    );
  })
);

/**
 * A worker's document, decrypted.
 *
 * The only path to a stored Aadhaar or police verification image. Never
 * cached, never a public object, and one day soon one audit row per view.
 */
adminRouter.get(
  '/documents/:id',
  wrap(async (req, res) => {
    const doc = await prisma.workerDocument.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Not found' });

    const bytes = await readDocument(doc.storageKey);

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.send(bytes);
  })
);

adminRouter.post(
  '/workers/:id/status',
  wrap(async (req, res) => {
    const { status, reason } = req.body ?? {};
    if (!['approved', 'rejected', 'suspended', 'terminated'].includes(status)) {
      return res.status(400).json({ error: 'Bad status' });
    }

    const result = await setWorkerStatus(req.params.id, status, reason);
    await deliverAll(result.outbound);
    res.json({ ok: true });
  })
);

/** The published rate, from the card unless someone overrides it by hand. */
adminRouter.post(
  '/workers/:id/rate',
  wrap(async (req, res) => {
    const { tier, amount } = req.body ?? {};
    const worker = await prisma.workerProfile.findUnique({ where: { id: req.params.id } });
    if (!worker) return res.status(404).json({ error: 'Not found' });

    const fromCard = tier ? await rateFor(worker.trade, tier) : null;
    const publishedRate = amount ? Number(amount) : fromCard;
    if (!publishedRate) return res.status(400).json({ error: 'No rate for that trade and tier' });

    await prisma.workerProfile.update({
      where: { id: worker.id },
      data: { rateTier: tier ?? worker.rateTier, publishedRate, rateOverride: Boolean(amount) },
    });
    res.json({ ok: true, publishedRate });
  })
);

/**
 * Police verification, checked by a person.
 *
 * Approval never waits for this, so recruiting runs while certificates are
 * issued — but nothing is dispatched without it.
 */
adminRouter.post(
  '/workers/:id/pvc',
  wrap(async (req, res) => {
    const { number, station, issuedAt, expiresAt } = req.body ?? {};
    if (!number) return res.status(400).json({ error: 'number is required' });

    const clash = await prisma.workerProfile.findUnique({ where: { pvcNumber: String(number) } });
    if (clash && clash.id !== req.params.id) {
      return res.status(409).json({
        error:
          clash.status === 'terminated'
            ? 'That certificate belongs to a terminated account'
            : `That certificate is already on ${clash.workerUid}`,
      });
    }

    await prisma.workerProfile.update({
      where: { id: req.params.id },
      data: {
        pvcNumber: String(number),
        pvcStation: station ?? null,
        pvcIssuedAt: issuedAt ? new Date(issuedAt) : null,
        pvcExpiresAt: expiresAt ? new Date(expiresAt) : null,
        pvcVerifiedAt: new Date(),
      },
    });
    res.json({ ok: true });
  })
);

// ─── Rates ───────────────────────────────────────────────────────────────────

adminRouter.get(
  '/rate-card',
  wrap(async (_req, res) => {
    res.json(await prisma.rateCard.findMany({ orderBy: [{ trade: 'asc' }, { dailyRate: 'asc' }] }));
  })
);

adminRouter.post(
  '/rate-card',
  wrap(async (req, res) => {
    const { trade, tier, dailyRate, note } = req.body ?? {};
    if (!trade || !tier || !dailyRate) {
      return res.status(400).json({ error: 'trade, tier and dailyRate are required' });
    }

    await prisma.rateCard.upsert({
      where: { trade_tier: { trade, tier } },
      update: { dailyRate: Number(dailyRate), note: note ?? null },
      create: { trade, tier, dailyRate: Number(dailyRate), note: note ?? null },
    });

    // Workers whose rate was set by hand keep it — an exception made
    // deliberately should not be undone by a routine revision.
    const updated = await applyRateCard(trade, tier);
    res.json({ ok: true, workersUpdated: updated });
  })
);

// ─── Conversations ───────────────────────────────────────────────────────────

adminRouter.get(
  '/conversations',
  wrap(async (_req, res) => {
    const convos = await prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: { user: { include: { worker: true } } },
    });

    const withCounts = await Promise.all(
      convos.map(async (c) => ({
        phone: c.waPhone,
        name: c.user.name,
        role: c.user.worker ? c.user.worker.kind : 'customer',
        activeFlow: c.activeFlow,
        stepId: c.stepId,
        lastInboundAt: c.lastInboundAt,
        windowOpen: c.lastInboundAt
          ? Date.now() - c.lastInboundAt.getTime() < 24 * 60 * 60 * 1000
          : false,
        messageCount: await prisma.message.count({ where: { waPhone: c.waPhone } }),
      }))
    );

    res.json(withCounts);
  })
);
