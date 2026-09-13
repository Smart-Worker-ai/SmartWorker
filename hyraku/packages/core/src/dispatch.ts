import { prisma } from '@hyraku/db';
import type { OutboundMessage } from './types.js';
import { template } from './types.js';
import { serviceAreaLabel, tradeLabel } from './catalog.js';
import { formatDate } from './dates.js';

// Assignment and the notifications that follow it.
//
// No message here carries a rate. Pay is agreed and settled between customer
// and worker directly; Hyraku is not party to it, and quoting a number would
// suggest otherwise.
//
// These functions return the messages to send rather than sending them, so the
// domain has no idea whether it is talking to Meta or the simulator. The API
// layer owns transport; this owns what is true.
//
// Everything here goes out as a template because it is business-initiated —
// the recipient has not necessarily messaged us in the last 24 hours, and that
// is precisely the case WhatsApp requires a pre-approved template for.

export interface Envelope {
  to: string; // E.164
  message: OutboundMessage;
}

export interface AssignResult {
  ok: boolean;
  error?: string;
  outbound: Envelope[];
}

export async function assignWorker(opts: {
  jobRequestId: string;
  workerId: string;
  responseRequired?: boolean;
}): Promise<AssignResult> {
  const job = await prisma.jobRequest.findUnique({
    where: { id: opts.jobRequestId },
    include: { customer: true },
  });
  if (!job) return { ok: false, error: 'Job request not found', outbound: [] };
  if (['completed', 'cancelled'].includes(job.status)) {
    return { ok: false, error: `Job is already ${job.status}`, outbound: [] };
  }

  const worker = await prisma.workerProfile.findUnique({
    where: { id: opts.workerId },
    include: { user: true },
  });
  if (!worker) return { ok: false, error: 'Worker not found', outbound: [] };
  if (worker.status !== 'approved') {
    return { ok: false, error: 'Worker is not approved', outbound: [] };
  }

  const responseRequired = opts.responseRequired ?? false;

  // Supersede any outstanding offer so the history shows who was tried.
  await prisma.assignment.updateMany({
    where: { jobRequestId: job.id, status: { in: ['proposed', 'accepted'] } },
    data: { status: 'reassigned' },
  });

  const assignment = await prisma.assignment.create({
    data: {
      jobRequestId: job.id,
      workerId: worker.id,
      responseRequired,
      status: responseRequired ? 'proposed' : 'accepted',
      respondedAt: responseRequired ? null : new Date(),
    },
  });

  await prisma.jobRequest.update({
    where: { id: job.id },
    data: { status: responseRequired ? 'assigned' : 'confirmed' },
  });

  const days = job.durationDays === 1 ? '1 day' : `${job.durationDays} days`;

  const offerBody =
    `*New job from Hyraku*\n\n` +
    `${tradeLabel(job.trade)}\n` +
    `${formatDate(job.preferredDate)} · ${days}\n` +
    `${job.town}, ${job.district}\n\n` +
    (job.notes ? `Notes: ${job.notes}\n\n` : '') +
    `Customer: ${job.customer.name ?? 'Customer'} — ${job.customer.phone}\n` +
    `Address: ${job.address}\n\n` +
    `Agree the pay directly with the customer before you start.\n` +
    `Reference ${job.refNo}`;

  const outbound: Envelope[] = [
    {
      to: worker.user.phone,
      message: template(
        'worker_job_offer',
        responseRequired
          ? `${offerBody}\n\nCan you take it?`
          : `${offerBody}\n\nPlease reach on time. Reply here if there is a problem.`,
        responseRequired
          ? [
              { id: `accept:${assignment.id}`, title: 'Accept' },
              { id: `decline:${assignment.id}`, title: 'Decline' },
            ]
          : undefined
      ),
    },
  ];

  // The customer is only told about a worker once that worker is actually
  // committed. A "proposed" assignment is not a promise we get to make.
  if (!responseRequired) {
    outbound.push(customerConfirmation(job, worker));
  }

  return { ok: true, outbound };
}

export async function respondToAssignment(
  assignmentId: string,
  accept: boolean
): Promise<AssignResult> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      worker: { include: { user: true } },
      jobRequest: { include: { customer: true } },
    },
  });
  if (!assignment) return { ok: false, error: 'Assignment not found', outbound: [] };
  if (assignment.status !== 'proposed') {
    return { ok: false, error: 'That job is no longer open', outbound: [] };
  }

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: accept ? 'accepted' : 'declined', respondedAt: new Date() },
  });

  await prisma.jobRequest.update({
    where: { id: assignment.jobRequestId },
    // A decline puts the job back at the top of the admin queue rather than
    // silently stalling — the dispatcher needs to see it came back.
    data: { status: accept ? 'confirmed' : 'new' },
  });

  const outbound: Envelope[] = [];

  if (accept) {
    outbound.push({
      to: assignment.worker.user.phone,
      message: template(
        'worker_job_accepted',
        `Confirmed. ${formatDate(assignment.jobRequest.preferredDate)}, ${assignment.jobRequest.town}. ` +
          `We have told the customer to expect you.`
      ),
    });
    outbound.push(customerConfirmation(assignment.jobRequest, assignment.worker));
  } else {
    outbound.push({
      to: assignment.worker.user.phone,
      message: template('worker_job_declined', 'No problem — we will offer it to someone else.'),
    });
  }

  return { ok: true, outbound };
}

export async function setWorkerStatus(
  workerId: string,
  status: 'approved' | 'rejected' | 'suspended',
  reason?: string
): Promise<AssignResult> {
  const worker = await prisma.workerProfile.update({
    where: { id: workerId },
    data: { status, statusReason: reason ?? null, reviewedAt: new Date() },
    include: { user: true },
  });

  const messages: Record<string, string> = {
    approved:
      `Good news — you are approved on Hyraku!\n\n` +
      `*${worker.workerUid}* · ${tradeLabel(worker.trade)}\n\n` +
      `You will get job offers for ${serviceAreaLabel()} on this number, so keep WhatsApp notifications on. ` +
      `You agree your pay directly with each customer — Hyraku never takes a share of it.`,
    rejected:
      `We could not approve your registration.\n\n` +
      `${reason ?? 'Your documents could not be verified.'}\n\n` +
      `Reply here and we will help you fix it.`,
    suspended:
      `Your Hyraku account has been paused.\n\n${reason ?? ''}\n\nReply here to talk to us.`,
  };

  return {
    ok: true,
    outbound: [
      {
        to: worker.user.phone,
        message: template(`registration_${status}`, messages[status]),
      },
    ],
  };
}

function customerConfirmation(
  job: {
    refNo: string;
    trade: string;
    preferredDate: Date;
    durationDays: number;
    customer: { phone: string };
  },
  worker: {
    user: { name: string | null; phone: string };
    workerUid: string;
    rating: number;
    totalReviews: number;
    experienceYears: number;
  }
): Envelope {
  const days = job.durationDays === 1 ? '1 day' : `${job.durationDays} days`;
  const ratingLine =
    worker.totalReviews > 0
      ? `${worker.rating.toFixed(1)}★ from ${worker.totalReviews} jobs`
      : `${worker.experienceYears} years experience`;

  return {
    to: job.customer.phone,
    message: template(
      'booking_confirmed',
      `*Your booking is confirmed* — ${job.refNo}\n\n` +
        `*${worker.user.name}* (${worker.workerUid})\n` +
        `${tradeLabel(job.trade)} · ${ratingLine}\n` +
        `${formatDate(job.preferredDate)} · ${days}\n\n` +
        `They will call you from ${worker.user.phone} before arriving. ` +
        `You agree the pay for the work directly with them.\n\n` +
        `Something wrong? Just reply here.`
    ),
  };
}
