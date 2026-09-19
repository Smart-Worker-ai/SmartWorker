import { prisma } from '@hyraku/db';
import type { OutboundMessage } from './types.js';
import { template } from './types.js';
import { serviceAreaLabel, tradeLabel } from './catalog.js';
import { formatDate } from './dates.js';
import { formatRate } from './rates.js';
import { offerWindowMs, type Capacity } from './eligibility.js';
import {
  SHORTFALL_WINDOW_DAYS,
  recordReliability,
  shortfallAction,
  type ShortfallAction,
} from './reliability.js';

// Assignment, and the notifications that follow it.
//
// An assignment is an offer to one responder for N slots. An individual
// answers for themselves and fills the slot. An agent or supervisor answers
// for a crew and names its members afterwards — which is what lets a
// five-worker job be accepted before anyone knows which five.
//
// These functions return the messages to send rather than sending them, so the
// domain has no idea whether it is talking to WhatsApp or SMS. The API layer
// owns transport; this owns what is true.
//
// Everything here goes out as a template because it is business-initiated: the
// recipient has not necessarily messaged us in the last 24 hours, and that is
// precisely the case WhatsApp requires a pre-approved template for.

export interface Envelope {
  to: string; // E.164
  message: OutboundMessage;
}

export interface DispatchResult {
  ok: boolean;
  error?: string;
  outbound: Envelope[];
}

const fail = (error: string): DispatchResult => ({ ok: false, error, outbound: [] });

/**
 * When a lead must have named their crew: 18:00 IST the day before.
 *
 * Early enough that a dispatcher still has an evening to re-fill the slots,
 * which is the entire point of having a deadline rather than finding out when
 * nobody arrives. preferredDate is a calendar day at UTC midnight, and 18:00
 * in Kerala is 12:30 UTC.
 */
export function crewDeadlineFor(preferredDate: Date): Date {
  const deadline = new Date(preferredDate);
  deadline.setUTCDate(deadline.getUTCDate() - 1);
  deadline.setUTCHours(12, 30, 0, 0);
  return deadline;
}

// ─── Offering ────────────────────────────────────────────────────────────────

export async function offerJob(opts: {
  jobRequestId: string;
  responderId: string;
  capacity: Capacity;
  headcount?: number;
  responseRequired?: boolean;
}): Promise<DispatchResult> {
  const job = await prisma.jobRequest.findUnique({
    where: { id: opts.jobRequestId },
    include: { customer: true },
  });
  if (!job) return fail('Job request not found');
  if (['completed', 'cancelled'].includes(job.status)) {
    return fail(`Job is already ${job.status}`);
  }

  const responder = await prisma.workerProfile.findUnique({
    where: { id: opts.responderId },
    include: { user: true },
  });
  if (!responder) return fail('Worker not found');
  if (responder.status !== 'approved') return fail('Worker is not approved');
  if (!responder.pvcVerifiedAt) return fail('Police verification is not complete');

  const headcount = opts.headcount ?? (opts.capacity === 'lead' ? job.workersNeeded : 1);
  const responseRequired = opts.responseRequired ?? false;

  const assignment = await prisma.$transaction(async (tx) => {
    // Supersede any outstanding offer so the history shows who was tried.
    await tx.assignment.updateMany({
      where: { jobRequestId: job.id, status: { in: ['proposed', 'accepted'] } },
      data: { status: 'reassigned' },
    });

    const created = await tx.assignment.create({
      data: {
        jobRequestId: job.id,
        responderId: responder.id,
        headcount,
        responseRequired,
        status: responseRequired ? 'proposed' : 'accepted',
        respondedAt: responseRequired ? null : new Date(),
        expiresAt: responseRequired
          ? new Date(Date.now() + offerWindowMs(responder, job))
          : null,
        crewDeadlineAt:
          opts.capacity === 'lead' ? crewDeadlineFor(job.preferredDate) : null,
      },
    });

    // An individual fills the slot they just accepted. A lead names their crew
    // afterwards, so there is nobody to record yet.
    if (!responseRequired && opts.capacity === 'personal') {
      await tx.assignmentMember.create({
        data: {
          assignmentId: created.id,
          workerId: responder.id,
          agreedRate: responder.publishedRate ?? 0,
        },
      });
    }

    await tx.jobRequest.update({
      where: { id: job.id },
      data: { status: responseRequired ? 'assigned' : 'confirmed' },
    });

    return created;
  });

  if (!responseRequired) await recordReliability(responder.id, 'accepted');

  const outbound: Envelope[] = [offerMessage(job, responder, assignment, opts.capacity)];

  // The customer is only told about a worker once that worker is committed. A
  // proposed assignment is not a promise we get to make.
  if (!responseRequired) {
    outbound.push(customerConfirmation(job, responder, opts.capacity, headcount));
  }

  return { ok: true, outbound };
}

export async function respondToAssignment(
  assignmentId: string,
  accept: boolean
): Promise<DispatchResult> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      responder: { include: { user: true } },
      jobRequest: { include: { customer: true } },
    },
  });
  if (!assignment) return fail('Assignment not found');
  if (assignment.status !== 'proposed') return fail('That job is no longer open');

  const { responder, jobRequest: job } = assignment;
  const capacity: Capacity = assignment.headcount > 1 ? 'lead' : 'personal';

  await prisma.$transaction(async (tx) => {
    await tx.assignment.update({
      where: { id: assignmentId },
      data: {
        status: accept ? 'accepted' : 'declined',
        respondedAt: new Date(),
        expiresAt: null,
      },
    });

    if (accept && capacity === 'lead') {
      await tx.assignment.update({
        where: { id: assignmentId },
        data: { crewDeadlineAt: crewDeadlineFor(job.preferredDate) },
      });
    }

    if (accept && capacity === 'personal') {
      await tx.assignmentMember.create({
        data: {
          assignmentId,
          workerId: responder.id,
          agreedRate: responder.publishedRate ?? 0,
        },
      });
    }

    await tx.jobRequest.update({
      where: { id: job.id },
      // A decline puts the job back at the top of the queue rather than
      // silently stalling — the dispatcher needs to see it came back.
      data: { status: accept ? 'confirmed' : 'new' },
    });
  });

  await recordReliability(responder.id, accept ? 'accepted' : 'declined');

  if (!accept) {
    return {
      ok: true,
      outbound: [
        {
          to: responder.user.phone,
          message: template({
            name: 'worker_job_declined',
            params: [job.refNo],
            body: 'No problem — we will offer it to someone else.',
          }),
        },
      ],
    };
  }

  return {
    ok: true,
    outbound: [
      {
        to: responder.user.phone,
        message: template({
          name: 'worker_job_accepted',
          params: [job.refNo, formatDate(job.preferredDate), job.town],
          body:
            `Confirmed — ${job.refNo}.\n\n${formatDate(job.preferredDate)}, ${job.town}. ` +
            `We have told the customer to expect you.` +
            (capacity === 'lead'
              ? `\n\nPlease name the ${assignment.headcount} workers coming, in the Hyraku app, by 6pm the day before.`
              : ''),
        }),
      },
      customerConfirmation(job, responder, capacity, assignment.headcount),
    ],
  };
}

/**
 * The lead names who is actually coming.
 *
 * Only their own approved crew, which is the whole reason agents and
 * supervisors have logins: it is what keeps unvetted people off a customer's
 * property. The rate is snapshotted per member, so a later rate-card revision
 * cannot rewrite what the customer was told.
 */
export async function nameCrew(
  assignmentId: string,
  workerIds: string[]
): Promise<DispatchResult> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      responder: true,
      jobRequest: { include: { customer: true } },
      members: true,
    },
  });
  if (!assignment) return fail('Assignment not found');
  if (assignment.status !== 'accepted') return fail('That job is not accepted');
  if (workerIds.length > assignment.headcount) {
    return fail(`This job needs ${assignment.headcount} workers`);
  }

  const crew = await prisma.workerProfile.findMany({
    where: { id: { in: workerIds } },
    include: { user: true },
  });

  for (const member of crew) {
    // A lead may name themselves — they carry a trade and may work personally.
    const theirs = member.leadId === assignment.responderId || member.id === assignment.responderId;
    if (!theirs) return fail(`${member.workerUid} is not in your crew`);
    if (member.status !== 'approved') return fail(`${member.workerUid} is not approved`);
    if (!member.pvcVerifiedAt) return fail(`${member.workerUid} has no police verification`);
  }

  await prisma.$transaction([
    prisma.assignmentMember.deleteMany({ where: { assignmentId, arrivedAt: null } }),
    prisma.assignmentMember.createMany({
      data: crew.map((m) => ({
        assignmentId,
        workerId: m.id,
        agreedRate: m.publishedRate ?? 0,
      })),
    }),
  ]);

  const job = assignment.jobRequest;
  const names = crew.map((m) => `${m.user.name} (${m.user.phone})`).join('\n');

  const outbound: Envelope[] = [
    {
      to: job.customer.phone,
      message: template({
        name: 'crew_roster',
        params: [job.refNo, String(crew.length), formatDate(job.preferredDate)],
        body:
          `*Your crew for ${job.refNo}*\n\n${names}\n\n` +
          `Arriving ${formatDate(job.preferredDate)}. You agree the pay with each of them directly.`,
      }),
    },
  ];

  // Everyone named finds out they are working, and where.
  for (const m of crew) {
    outbound.push({
      to: m.user.phone,
      message: template({
        name: 'worker_job_offer',
        params: [tradeLabel(job.trade), formatDate(job.preferredDate), job.town, job.refNo],
        body: crewMemberBody(job, m),
      }),
    });
  }

  return { ok: true, outbound };
}

/**
 * Offers that were never answered.
 *
 * An unanswered offer is worse than a declined one: the job sits looking
 * assigned while nobody is coming. Run on a schedule, it moves the job back
 * into the queue and marks the silence against the responder.
 */
export async function expireStaleOffers(now = new Date()): Promise<string[]> {
  const stale = await prisma.assignment.findMany({
    where: { status: 'proposed', expiresAt: { lt: now } },
    select: { id: true, jobRequestId: true, responderId: true },
  });

  for (const offer of stale) {
    await prisma.$transaction([
      prisma.assignment.update({ where: { id: offer.id }, data: { status: 'expired' } }),
      prisma.jobRequest.update({ where: { id: offer.jobRequestId }, data: { status: 'new' } }),
    ]);
    await recordReliability(offer.responderId, 'no_response');
  }

  return stale.map((s) => s.jobRequestId);
}

// ─── Worker standing ─────────────────────────────────────────────────────────

export async function setWorkerStatus(
  workerId: string,
  status: 'approved' | 'rejected' | 'suspended' | 'terminated',
  reason?: string
): Promise<DispatchResult> {
  const worker = await prisma.workerProfile.update({
    where: { id: workerId },
    data: { status, statusReason: reason ?? null, reviewedAt: new Date() },
    include: { user: true },
  });

  const rate = worker.publishedRate ? formatRate(worker.publishedRate) : null;

  const bodies: Record<string, string> = {
    approved:
      `Good news — you are approved on Hyraku!\n\n` +
      `*${worker.workerUid}* · ${tradeLabel(worker.trade)}` +
      (rate ? `\nYour rate: *${rate}*, paid to you directly by the customer.` : '') +
      `\n\nYou will get job offers for ${serviceAreaLabel()} on this number.` +
      (worker.pvcVerifiedAt
        ? ''
        : `\n\nWe still need your police verification certificate before we can send you a job.`),
    rejected:
      `We could not approve your registration.\n\n` +
      `${reason ?? 'Your documents could not be verified.'}\n\n` +
      `Reply here and we will help you fix it.`,
    suspended: `Your Hyraku account has been paused.\n\n${reason ?? ''}\n\nReply here to talk to us.`,
    terminated:
      `Your Hyraku account has been closed permanently.\n\n${reason ?? ''}\n\n` +
      `You will not receive further job offers.`,
  };

  return {
    ok: true,
    outbound: [
      {
        to: worker.user.phone,
        message: template({
          name: `registration_${status}`,
          params:
            status === 'approved'
              ? [worker.workerUid, tradeLabel(worker.trade), serviceAreaLabel()]
              : [reason ?? ''],
          body: bodies[status],
        }),
      },
    ],
  };
}

// ─── Message bodies ──────────────────────────────────────────────────────────

function offerMessage(
  job: any,
  responder: any,
  assignment: { id: string; responseRequired: boolean; headcount: number },
  capacity: Capacity
): Envelope {
  const days = job.durationDays === 1 ? '1 day' : `${job.durationDays} days`;

  const head =
    capacity === 'lead'
      ? `*New job from Hyraku — ${assignment.headcount} ${tradeLabel(job.trade)}s*`
      : `*New job from Hyraku*\n\n${tradeLabel(job.trade)}`;

  const body =
    `${head}\n` +
    `${formatDate(job.preferredDate)} · ${days}\n` +
    `${job.town}, ${job.district}\n\n` +
    (job.notes ? `Notes: ${job.notes}\n\n` : '') +
    `Customer: ${job.customer.name ?? 'Customer'} — ${job.customer.phone}\n` +
    `Address: ${job.address}\n\n` +
    (capacity === 'lead'
      ? `Name the workers coming in the Hyraku app once you accept.\n`
      : responder.publishedRate
        ? `Your rate for this job: *${formatRate(responder.publishedRate)}*, paid to you directly.\n`
        : '') +
    `Reference ${job.refNo}`;

  return {
    to: responder.user.phone,
    message: template({
      name: 'worker_job_offer',
      params: [tradeLabel(job.trade), formatDate(job.preferredDate), job.town, job.refNo],
      body: assignment.responseRequired
        ? `${body}\n\nCan you take it?`
        : `${body}\n\nPlease reach on time. Reply here if there is a problem.`,
      buttons: assignment.responseRequired
        ? [
            { id: `accept:${assignment.id}`, title: 'Accept' },
            { id: `decline:${assignment.id}`, title: 'Decline' },
          ]
        : undefined,
    }),
  };
}

function crewMemberBody(job: any, member: any): string {
  const days = job.durationDays === 1 ? '1 day' : `${job.durationDays} days`;
  return (
    `*You are on a Hyraku job*\n\n` +
    `${tradeLabel(job.trade)}\n` +
    `${formatDate(job.preferredDate)} · ${days}\n` +
    `${job.town}, ${job.district}\n` +
    `Address: ${job.address}\n\n` +
    (member.publishedRate
      ? `Your rate: *${formatRate(member.publishedRate)}*, paid to you directly by the customer.\n\n`
      : '') +
    `Reference ${job.refNo}`
  );
}

function customerConfirmation(
  job: any,
  responder: any,
  capacity: Capacity,
  headcount: number
): Envelope {
  const days = job.durationDays === 1 ? '1 day' : `${job.durationDays} days`;

  // A crew's members are named later, so promise the lead and the headcount —
  // which is what is actually true at this moment.
  if (capacity === 'lead') {
    return {
      to: job.customer.phone,
      message: template({
        name: 'booking_crew_confirmed',
        params: [
          job.refNo,
          String(headcount),
          tradeLabel(job.trade),
          formatDate(job.preferredDate),
          responder.user.name ?? 'your team lead',
          responder.user.phone,
        ],
        body:
          `*Your booking is confirmed* — ${job.refNo}\n\n` +
          `${headcount} × ${tradeLabel(job.trade)} · ${formatDate(job.preferredDate)} · ${days}\n\n` +
          `*${responder.user.name}* is leading the job and will call you from ` +
          `${responder.user.phone}. We will send you the names of everyone coming ` +
          `the day before.\n\nYou agree the pay with each worker directly.`,
      }),
    };
  }

  const ratingLine =
    responder.totalReviews > 0
      ? `${responder.rating.toFixed(1)}★ from ${responder.totalReviews} jobs`
      : `${responder.experienceYears} years experience`;

  const rate = responder.publishedRate ? formatRate(responder.publishedRate) : null;

  return {
    to: job.customer.phone,
    message: template({
      name: 'booking_confirmed',
      params: [
        job.refNo,
        responder.user.name ?? 'Your worker',
        tradeLabel(job.trade),
        formatDate(job.preferredDate),
        rate ?? 'the agreed rate',
        responder.user.phone,
      ],
      body:
        `*Your booking is confirmed* — ${job.refNo}\n\n` +
        `*${responder.user.name}* (${responder.workerUid})\n` +
        `${tradeLabel(job.trade)} · ${ratingLine}\n` +
        `${formatDate(job.preferredDate)} · ${days}\n` +
        (rate ? `Rate: *${rate}*\n` : '') +
        `\nThey will call you from ${responder.user.phone} before arriving. ` +
        `You pay them directly — Hyraku takes no part of it.\n\n` +
        `Something wrong? Just reply here.`,
    }),
  };
}

// ─── Crew shortfalls ─────────────────────────────────────────────────────────
//
// An agent or supervisor may register as many workers as they like — there is
// no cap, and recruiting is the job. The accountability is at the other end: a
// lead who takes a job for eight and fields five has left a customer short on
// the day they were promised a crew.
//
// Two paths out of that, and the difference between them is deliberate. Saying
// so before the deadline costs a little and returns the slots to the queue
// while there is still time. Saying nothing costs a great deal and escalates.

/**
 * A lead giving back slots they cannot fill.
 *
 * Honest and early. The job returns to the queue for the remainder, the
 * customer is not told anything alarming, and it does not count as a strike.
 */
export async function releaseSlots(
  assignmentId: string,
  releasedCount: number,
  reason?: string
): Promise<DispatchResult> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { responder: { include: { user: true } }, jobRequest: true, members: true },
  });
  if (!assignment) return fail('Assignment not found');
  if (assignment.status !== 'accepted') return fail('That job is not accepted');
  if (releasedCount < 1 || releasedCount >= assignment.headcount) {
    return fail(`Release between 1 and ${assignment.headcount - 1} slots, or decline the job`);
  }

  const remaining = assignment.headcount - releasedCount;

  await prisma.$transaction([
    prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        headcount: remaining,
        shortfallAt: new Date(),
        shortfallBy: releasedCount,
        shortfallKind: 'released_early',
      },
    }),
    // Back in the queue so a dispatcher can see slots need filling.
    prisma.jobRequest.update({
      where: { id: assignment.jobRequestId },
      data: { status: 'assigning' },
    }),
  ]);

  await recordReliability(assignment.responderId, 'crew_released');

  return {
    ok: true,
    outbound: [
      {
        to: assignment.responder.user.phone,
        message: template({
          name: 'crew_slots_released',
          params: [assignment.jobRequest.refNo, String(releasedCount), String(remaining)],
          body:
            `Noted — you have given back ${releasedCount} of the slots on ${assignment.jobRequest.refNo}. ` +
            `You are still down for ${remaining}.\n\n` +
            `Thank you for telling us in time. We will fill the rest.` +
            (reason ? `\n\nReason recorded: ${reason}` : ''),
        }),
      },
    ],
  };
}

/**
 * Leads who never named their crew.
 *
 * Run on a schedule. Anything still short past its deadline is a shortfall:
 * the slots go back to the queue, and the lead's account moves along the
 * escalation ladder.
 */
export async function flagCrewShortfalls(now = new Date()): Promise<DispatchResult> {
  const late = await prisma.assignment.findMany({
    where: {
      status: 'accepted',
      shortfallAt: null,
      crewDeadlineAt: { lt: now },
    },
    include: {
      responder: { include: { user: true } },
      jobRequest: true,
      members: true,
    },
  });

  const outbound: Envelope[] = [];

  for (const assignment of late) {
    const missing = assignment.headcount - assignment.members.length;
    if (missing <= 0) continue;

    const result = await recordCrewShortfall(assignment, 'missed_deadline', missing);
    outbound.push(...result.outbound);
  }

  return { ok: true, outbound };
}

/**
 * A crew that did not turn up.
 *
 * Worse than never naming them, because nobody had a chance to re-fill. Called
 * by a dispatcher marking no-shows after the fact.
 */
export async function reportCrewNoShow(
  assignmentId: string,
  absentWorkerIds: string[]
): Promise<DispatchResult> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { responder: { include: { user: true } }, jobRequest: true, members: true },
  });
  if (!assignment) return fail('Assignment not found');

  await prisma.assignmentMember.updateMany({
    where: { assignmentId, workerId: { in: absentWorkerIds } },
    data: { noShow: true },
  });

  for (const workerId of absentWorkerIds) {
    await recordReliability(workerId, 'no_show');
  }

  // The lead answers for the crew they named, on top of each absentee's own
  // record. That is what taking the job meant.
  return recordCrewShortfall(assignment, 'no_show', absentWorkerIds.length);
}

async function recordCrewShortfall(
  assignment: {
    id: string;
    headcount: number;
    responderId: string;
    jobRequestId: string;
    responder: { workerUid: string; user: { phone: string } };
    jobRequest: { refNo: string };
  },
  kind: 'missed_deadline' | 'no_show',
  missing: number
): Promise<DispatchResult> {
  const since = new Date(Date.now() - SHORTFALL_WINDOW_DAYS * 86_400_000);

  await prisma.$transaction([
    prisma.assignment.update({
      where: { id: assignment.id },
      data: { shortfallAt: new Date(), shortfallBy: missing, shortfallKind: kind },
    }),
    prisma.jobRequest.update({
      where: { id: assignment.jobRequestId },
      data: { status: 'assigning' },
    }),
  ]);

  await recordReliability(assignment.responderId, 'crew_shortfall');

  const recent = await prisma.assignment.count({
    where: {
      responderId: assignment.responderId,
      shortfallAt: { gte: since },
      shortfallKind: { in: ['missed_deadline', 'no_show'] },
    },
  });

  const action = shortfallAction(recent);
  const outbound: Envelope[] = [];

  if (action === 'warned') {
    outbound.push({
      to: assignment.responder.user.phone,
      message: template({
        name: 'crew_shortfall_warning',
        params: [assignment.jobRequest.refNo, String(missing)],
        body:
          `You took ${assignment.jobRequest.refNo} and did not field ${missing} of the workers you agreed to.\n\n` +
          `A customer was left short on the day. If you cannot fill a job, tell us before 6pm the ` +
          `day before and we will cover it — that costs you nothing.\n\n` +
          `A second time in ${SHORTFALL_WINDOW_DAYS} days pauses your account. A third closes it.`,
      }),
    });
  } else {
    // setWorkerStatus writes its own message, so no duplicate here.
    const status = action === 'suspended' ? 'suspended' : 'terminated';
    const result = await setWorkerStatus(
      assignment.responderId,
      status,
      `${recent} crews not fielded in ${SHORTFALL_WINDOW_DAYS} days — most recently ${assignment.jobRequest.refNo}.`
    );
    outbound.push(...result.outbound);
  }

  return { ok: true, outbound };
}

export type { ShortfallAction };
