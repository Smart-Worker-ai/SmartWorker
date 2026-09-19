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
  }[event] as
    | 'acceptedCount'
    | 'completedCount'
    | 'declinedCount'
    | 'noResponseCount'
    | 'noShowCount';

  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerId },
    select: { reliability: true },
  });
  if (!worker) return;

  await prisma.workerProfile.update({
    where: { id: workerId },
    data: {
      reliability: clamp(worker.reliability + DELTA[event]),
      [counter]: { increment: 1 },
      ...(event === 'completed' ? { probationJobs: { increment: 1 } } : {}),
    },
  });
}

export function onProbation(worker: { probationJobs: number }): boolean {
  return worker.probationJobs < PROBATION_JOBS;
}

/** Shown in the console beside the number, so it reads as a judgement. */
export function reliabilityLabel(score: number): string {
  if (score >= 85) return 'Dependable';
  if (score >= 65) return 'Steady';
  if (score >= 40) return 'Patchy';
  return 'Unreliable';
}
