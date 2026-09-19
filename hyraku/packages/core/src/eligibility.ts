import { onProbation } from './reliability.js';

// Who may be sent to a job.
//
// Pure predicates, no queries, so the rules can be read in one place and
// tested without a database. ranking.ts does the fetching and calls these.
//
// The headcount rules exist because coordinating strangers is the work an
// agent does. One worker is a worker. Two or three is a pairing, which an
// individual has to have agreed to. Four or more is a crew, and a crew needs
// somebody answerable for it.

export type Capacity =
  /** Filling one slot themselves. */
  | 'personal'
  /** Taking the job and supplying a crew. */
  | 'lead';

export interface EligibilityWorker {
  kind: 'individual' | 'agent' | 'supervisor';
  /** Their agent or supervisor. Null means nobody answers for them but us. */
  leadId: string | null;
  status: string;
  trade: string;
  crewTrades: string[];
  serviceAreas: string[];
  worksWithCrews: boolean | null;
  canWorkPersonally: boolean;
  probationJobs: number;
  pvcVerifiedAt: Date | null;
  pvcExpiresAt: Date | null;
  user: { isBlocked: boolean };
}

export interface EligibilityJob {
  trade: string;
  district: string;
  workersNeeded: number;
  durationDays: number;
}

export interface Ineligible {
  ok: false;
  reason: string;
}

export type Eligibility = { ok: true } | Ineligible;

const isLead = (w: EligibilityWorker) => w.kind === 'agent' || w.kind === 'supervisor';

/**
 * A current police verification certificate, without which nobody is sent to
 * a customer's home. Separate from approval on purpose: approval can happen
 * while the certificate is still being issued, so recruiting is never waiting
 * on a government office.
 */
export function pvcCurrent(w: EligibilityWorker, now = new Date()): boolean {
  if (!w.pvcVerifiedAt) return false;
  return !w.pvcExpiresAt || w.pvcExpiresAt > now;
}

/** Approved, verified, not blocked. True before any job is considered. */
export function dispatchable(w: EligibilityWorker, now = new Date()): Eligibility {
  if (w.status !== 'approved') return { ok: false, reason: `Status is ${w.status}` };
  if (w.user.isBlocked) return { ok: false, reason: 'Account is blocked' };
  if (!pvcCurrent(w, now)) {
    return {
      ok: false,
      reason: w.pvcVerifiedAt ? 'Police verification has expired' : 'Police verification pending',
    };
  }
  return { ok: true };
}

export function eligibleFor(
  w: EligibilityWorker,
  job: EligibilityJob,
  capacity: Capacity,
  now = new Date()
): Eligibility {
  const base = dispatchable(w, now);
  if (!base.ok) return base;

  const takesJobsHere = w.serviceAreas.some(
    (d) => d.toLowerCase() === job.district.toLowerCase()
  );
  if (!takesJobsHere) return { ok: false, reason: `Does not work in ${job.district}` };

  if (capacity === 'lead') {
    if (!isLead(w)) return { ok: false, reason: 'Not an agent or supervisor' };
    if (!w.crewTrades.includes(job.trade)) {
      return { ok: false, reason: 'Crew does not cover this trade' };
    }
    return { ok: true };
  }

  if (w.trade !== job.trade) return { ok: false, reason: 'Different trade' };
  if (isLead(w) && !w.canWorkPersonally) {
    return { ok: false, reason: 'Does not take jobs personally' };
  }

  // Probation: watched until three jobs are done. Solo, single day, and the
  // dispatcher rings to confirm arrival — see reliability.ts.
  if (onProbation(w)) {
    if (job.workersNeeded > 1) return { ok: false, reason: 'On probation — solo jobs only' };
    if (job.durationDays > 1) return { ok: false, reason: 'On probation — single-day jobs only' };
  }

  // An unaffiliated worker on a job with anyone else must have agreed to that.
  // Someone who registered through an agent is on a crew by definition, and
  // agents and supervisors are not asked at all.
  const unaffiliated = w.kind === 'individual' && w.leadId === null;
  if (job.workersNeeded > 1 && unaffiliated && w.worksWithCrews !== true) {
    return { ok: false, reason: 'Has not opted into working alongside a crew' };
  }

  return { ok: true };
}

/** Four or more is a crew, and a crew needs somebody answerable for it. */
export function requiresLead(job: EligibilityJob): boolean {
  return job.workersNeeded >= 4;
}

/**
 * How long a responder has before the offer moves on.
 *
 * An agent answers from an office. An individual may be up a ladder with one
 * hand free, so they get less pressure and the cascade does the chasing.
 */
export function offerWindowMs(
  responder: { kind: string },
  job: { isUrgent: boolean }
): number {
  const minutes =
    responder.kind === 'individual'
      ? job.isUrgent
        ? 10
        : 30
      : job.isUrgent
        ? 20
        : 60;
  return minutes * 60 * 1000;
}
