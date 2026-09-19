import { prisma } from '@hyraku/db';

// Reliability.
//
// A worker under an agent has someone who answers for them. A worker with no
// lead has nobody, so the platform has to supply what the agent otherwise
// would: a reason to answer the phone, and a consequence for not turning up.
//
// The score is deliberately blunt and readable — a dispatcher should be able
// to look at 40 and know why. It moves on events, not on a nightly
// recalculation, so the effect of ignoring an offer is immediate.

export const STARTING_SCORE = 70;

const DELTA = {
  accepted: +3,
  completed: +5,
  declined: -1, // answering honestly is much better than silence
  no_response: -6,
  no_show: -25, // a customer waited at home for nobody
  // A lead who tells us in time that they are short has cost us a re-fill.
  // A lead who does not has cost a customer their day. The gap between these
  // two numbers is the whole incentive.
  crew_released: -8,
  crew_shortfall: -35,
} as const;

export type ReliabilityEvent = keyof typeof DELTA;

/** First three jobs are watched: solo, single-day, one at a time. */
export const PROBATION_JOBS = 3;

export function clamp(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export async function recordReliability(
  workerId: string,
  event: ReliabilityEvent
): Promise<void> {
  const counter = {
    accepted: 'acceptedCount',
    completed: 'completedCount',
    declined: 'declinedCount',
    no_response: 'noResponseCount',
    no_show: 'noShowCount',
    crew_released: null,
    crew_shortfall: 'shortfallCount',
  }[event] as
    | 'acceptedCount'
    | 'completedCount'
    | 'declinedCount'
    | 'noResponseCount'
    | 'noShowCount'
    | 'shortfallCount'
    | null;

  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerId },
    select: { reliability: true },
  });
  if (!worker) return;

  await prisma.workerProfile.update({
    where: { id: workerId },
    data: {
      reliability: clamp(worker.reliability + DELTA[event]),
      ...(counter ? { [counter]: { increment: 1 } } : {}),
      ...(event === 'completed' ? { probationJobs: { increment: 1 } } : {}),
    },
  });
}

export function onProbation(worker: { probationJobs: number }): boolean {
  return worker.probationJobs < PROBATION_JOBS;
}

// ─── Crew shortfalls ─────────────────────────────────────────────────────────
//
// There is no cap on how many workers an agent or supervisor may register.
// The accountability is at the other end: a lead who takes a job for eight
// workers and fields five has left a customer short on the day, and that is
// the claim they are held to.
//
// Escalation is by count inside a rolling window, not by a judgement call, so
// the same thing happens to everyone and the record shows why.

/** Shortfalls older than this stop counting towards escalation. */
export const SHORTFALL_WINDOW_DAYS = 90;

export type ShortfallAction = 'warned' | 'suspended' | 'terminated';

/**
 * What a shortfall costs, by how many there have been recently.
 *
 * Deliberately blunt. These are the numbers to tune once there is real data on
 * how often a genuine emergency looks like this.
 */
export function shortfallAction(recentCount: number): ShortfallAction {
  if (recentCount <= 1) return 'warned';
  if (recentCount === 2) return 'suspended';
  return 'terminated';
}

/** Shown in the console beside the number, so it reads as a judgement. */
export function reliabilityLabel(score: number): string {
  if (score >= 85) return 'Dependable';
  if (score >= 65) return 'Steady';
  if (score >= 40) return 'Patchy';
  return 'Unreliable';
}
