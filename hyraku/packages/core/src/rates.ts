import { prisma } from '@hyraku/db';

// Pay.
//
// Hyraku sets the rate; the worker is paid it directly by the customer on
// site. Standardising by trade and tier means a revision is one row rather
// than five hundred, and it means two masons on the same job are not quoted
// differently because they registered in different months.
//
// What a worker said they usually charge is kept, but it is an input to the
// decision and never the published figure.

export const TIERS = ['entry', 'skilled', 'senior', 'master'] as const;
export type Tier = (typeof TIERS)[number];

export function tierLabel(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * A starting point for the admin reviewing a registration, not a decision.
 * Years are what we have at review time; the interview is what settles it.
 */
export function suggestTier(experienceYears: number): Tier {
  if (experienceYears >= 15) return 'master';
  if (experienceYears >= 7) return 'senior';
  if (experienceYears >= 2) return 'skilled';
  return 'entry';
}

export async function rateFor(trade: string, tier: string): Promise<number | null> {
  const row = await prisma.rateCard.findUnique({ where: { trade_tier: { trade, tier } } });
  return row?.dailyRate ?? null;
}

/**
 * Apply a rate-card revision to everyone it governs.
 *
 * Workers whose rate was set by hand carry rateOverride and are left alone —
 * an exception made deliberately should not be undone by a routine change.
 * Rates already snapshotted onto an assignment are untouched by construction.
 */
export async function applyRateCard(trade: string, tier: string): Promise<number> {
  const dailyRate = await rateFor(trade, tier);
  if (dailyRate === null) return 0;

  const { count } = await prisma.workerProfile.updateMany({
    where: { trade, rateTier: tier, rateOverride: false },
    data: { publishedRate: dailyRate },
  });
  return count;
}

export function formatRate(rupees: number): string {
  return `₹${rupees.toLocaleString('en-IN')}/day`;
}
