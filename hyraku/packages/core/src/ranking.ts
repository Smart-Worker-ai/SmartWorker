import { prisma } from '@hyraku/db';

// The admin bottleneck is the real scaling risk in an assign-by-hand model, so
// assignment has to be one tap rather than a search. This ranks candidates the
// way a dispatcher would: right trade first, then nearby, then good, then free.

export interface Candidate {
  workerId: string;
  workerUid: string;
  name: string;
  phone: string;
  trade: string;
  district: string;
  town: string;
  dailyRate: number;
  rating: number;
  totalReviews: number;
  experienceYears: number;
  activeJobs: number;
  score: number;
  reasons: string[];
}

export async function rankCandidates(jobRequestId: string): Promise<Candidate[]> {
  const job = await prisma.jobRequest.findUnique({ where: { id: jobRequestId } });
  if (!job) return [];

  const workers = await prisma.workerProfile.findMany({
    where: { trade: job.trade, status: 'approved', user: { isBlocked: false } },
    include: {
      user: true,
      assignments: {
        where: { status: { in: ['proposed', 'accepted'] } },
        include: { jobRequest: true },
      },
    },
  });

  const candidates = workers.map((w) => {
    const reasons: string[] = [];
    let score = 0;

    if (w.district === job.district) {
      score += 50;
      reasons.push('Same district');
    } else if (
      w.serviceAreas
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .includes(job.district.toLowerCase())
    ) {
      score += 30;
      reasons.push('Covers this district');
    }

    if (w.town.toLowerCase() === job.town.toLowerCase()) {
      score += 20;
      reasons.push('Same town');
    }

    score += w.rating * 8;
    if (w.rating >= 4.5 && w.totalReviews >= 10) reasons.push('Highly rated');

    score += Math.min(w.experienceYears, 15);

    // Busy on the requested day is disqualifying, not merely a penalty — the
    // whole point of showing candidates is that the top one can be tapped.
    const clash = w.assignments.some((a) => overlaps(a.jobRequest, job));
    if (clash) {
      score -= 200;
      reasons.push('Already booked that day');
    }

    const activeJobs = w.assignments.length;
    score -= activeJobs * 3;

    if (w.dailyRate <= 0) score -= 5;

    return {
      workerId: w.id,
      workerUid: w.workerUid,
      name: w.user.name ?? 'Unnamed',
      phone: w.user.phone,
      trade: w.trade,
      district: w.district,
      town: w.town,
      dailyRate: w.dailyRate,
      rating: w.rating,
      totalReviews: w.totalReviews,
      experienceYears: w.experienceYears,
      activeJobs,
      score: Math.round(score),
      reasons,
    };
  });

  return candidates.sort((a, b) => b.score - a.score);
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
