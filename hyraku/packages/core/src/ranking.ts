import { prisma } from '@hyraku/db';
import { NEIGHBOURS, tradeLabel } from './catalog.js';
import {
  type Capacity,
  eligibleFor,
  requiresLead,
} from './eligibility.js';
import { onProbation, reliabilityLabel } from './reliability.js';

// The admin bottleneck is the real scaling risk in an assign-by-hand model, so
// assignment has to be one tap rather than a search. This ranks candidates the
// way a dispatcher would: who is allowed, then who is closest, then who is
// dependable, then who is free.
//
// Every worker takes jobs in the serviced district wherever they live, so
// "closest" means home district: living in Kozhikode beats living next door,
// which beats travelling in from across the state.
//
// Affiliation is never scored. A customer gets the best available worker
// regardless of who recruited them.

export interface Candidate {
  workerId: string;
  workerUid: string;
  name: string;
  phone: string;
  kind: string;
  /** Filling a slot themselves, or taking the job and supplying a crew. */
  capacity: Capacity;
  trade: string;
  district: string;
  town: string;
  publishedRate: number | null;
  rating: number;
  totalReviews: number;
  experienceYears: number;
  reliability: number;
  reliabilityLabel: string;
  onProbation: boolean;
  contactChannel: string;
  /** Leads only — approved crew free on the day. */
  crewAvailable?: number;
  activeJobs: number;
  score: number;
  reasons: string[];
}

const ACTIVE = ['proposed', 'accepted'] as const;

export async function rankCandidates(jobRequestId: string): Promise<Candidate[]> {
  const job = await prisma.jobRequest.findUnique({ where: { id: jobRequestId } });
  if (!job) return [];

  const workers = await prisma.workerProfile.findMany({
    where: { status: 'approved' },
    include: {
      user: true,
      crew: {
        where: { status: 'approved' },
        include: {
          crewMemberships: {
            where: { assignment: { status: { in: [...ACTIVE] } } },
            include: { assignment: { include: { jobRequest: true } } },
          },
        },
      },
      crewMemberships: {
        where: { assignment: { status: { in: [...ACTIVE] } } },
        include: { assignment: { include: { jobRequest: true } } },
      },
      assignmentsLed: {
        where: { status: { in: [...ACTIVE] } },
        include: { jobRequest: true },
      },
    },
  });

  const leadOnly = requiresLead(job);
  const candidates: Candidate[] = [];

  for (const w of workers) {
    for (const capacity of ['lead', 'personal'] as const) {
      // Four or more workers must be taken by a lead. Individuals still fill
      // the remaining slots, but they do not get the job itself.
      if (leadOnly && capacity === 'personal') continue;

      const verdict = eligibleFor(w as any, job, capacity);
      if (!verdict.ok) continue;

      candidates.push(score(w, job, capacity));
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function score(w: any, job: any, capacity: Capacity): Candidate {
  const reasons: string[] = [];
  let points = 0;

  // ── Where they live ──
  if (w.district === job.district) {
    points += 50;
    reasons.push(`Lives in ${job.district}`);
    if (w.town.toLowerCase() === job.town.toLowerCase()) {
      points += 20;
      reasons.push('Same town');
    }
  } else if ((NEIGHBOURS[job.district] ?? []).includes(w.district)) {
    points += 30;
    reasons.push(`Lives nearby — ${w.district}`);
  } else {
    reasons.push(`Travels from ${w.district}`);
  }

  // ── How dependable ──
  // Centred on the starting score, so a new worker is neither rewarded nor
  // punished for having no history yet.
  points += (w.reliability - 70) * 0.5;
  if (w.reliability >= 85) reasons.push('Dependable');
  if (w.reliability < 40) reasons.push('Unreliable — answers rarely');

  points += w.rating * 8;
  if (w.rating >= 4.5 && w.totalReviews >= 10) reasons.push('Highly rated');
  points += Math.min(w.experienceYears, 15);

  if (onProbation(w)) {
    points -= 10;
    reasons.push(`On probation — ${w.probationJobs} of 3 jobs done`);
  }

  // ── Can they answer in time ──
  // SMS carries no buttons, so accepting means a dispatcher phone call. Fine
  // for next week, slow for this afternoon.
  if (w.user.contactChannel === 'sms') {
    if (job.isUrgent) {
      points -= 15;
      reasons.push('Not on WhatsApp — needs a call');
    } else {
      reasons.push('Not on WhatsApp');
    }
  }

  // ── Are they free ──
  const ownClash = w.crewMemberships.some((m: any) => overlaps(m.assignment.jobRequest, job));
  // A supervisor on site is occupied by leading. An agent is not — only being
  // named on a crew puts them on a roof.
  const leadClash =
    w.kind === 'supervisor' &&
    w.assignmentsLed.some((a: any) => overlaps(a.jobRequest, job));

  if (ownClash || leadClash) {
    points -= 200;
    reasons.push('Already booked that day');
  }

  const activeJobs = w.crewMemberships.length;
  points -= activeJobs * 3;

  let crewAvailable: number | undefined;
  if (capacity === 'lead') {
    const free = w.crew.filter(
      (member: any) =>
        member.trade === job.trade &&
        !member.crewMemberships.some((m: any) => overlaps(m.assignment.jobRequest, job))
    ).length;

    crewAvailable = free;
    if (free < job.workersNeeded) {
      points -= 100;
      reasons.push(`Only ${free} of ${job.workersNeeded} free that day`);
    } else {
      reasons.push(`${free} ${tradeLabel(job.trade)}s free that day`);
    }
  }

  return {
    workerId: w.id,
    workerUid: w.workerUid,
    name: w.user.name ?? 'Unnamed',
    phone: w.user.phone,
    kind: w.kind,
    capacity,
    trade: w.trade,
    district: w.district,
    town: w.town,
    publishedRate: w.publishedRate,
    rating: w.rating,
    totalReviews: w.totalReviews,
    experienceYears: w.experienceYears,
    reliability: w.reliability,
    reliabilityLabel: reliabilityLabel(w.reliability),
    onProbation: onProbation(w),
    contactChannel: w.user.contactChannel,
    crewAvailable,
    activeJobs,
    score: Math.round(points),
    reasons,
  };
}

function overlaps(
  a: { preferredDate: Date; durationDays: number },
  b: { preferredDate: Date; durationDays: number }
): boolean {
  const aStart = a.preferredDate.getTime();
  const aEnd = aStart + (a.durationDays - 1) * 86_400_000;
  const bStart = b.preferredDate.getTime();
  const bEnd = bStart + (b.durationDays - 1) * 86_400_000;
  return aStart <= bEnd && bStart <= aEnd;
}
