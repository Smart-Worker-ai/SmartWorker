import { prisma } from '@hyraku/db';

// Pre-launch state: whether bookings are open, and who is waiting.
//
// Hyraku recruits workers before it takes a single booking, so "closed" is the
// normal state for weeks. Stored in the database rather than an env var so the
// team can open bookings from the console on launch day without a redeploy.

const BOOKINGS_OPEN = 'bookings_open';

export async function bookingsOpen(): Promise<boolean> {
  const row = await prisma.setting.findUnique({ where: { key: BOOKINGS_OPEN } });
  // No row means nobody has opened bookings yet — the registration-first default.
  return row?.value === 'true';
}

export async function setBookingsOpen(open: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { key: BOOKINGS_OPEN },
    update: { value: String(open) },
    create: { key: BOOKINGS_OPEN, value: String(open) },
  });
}

export type WaitlistReason =
  | 'bookings_closed'
  | 'outside_service_area'
  | 'cannot_work_in_service_area';

/**
 * Record someone we could not serve. Asking twice updates the same entry rather
 * than counting them twice, so the numbers in the console mean people, not
 * messages.
 */
export async function addToWaitlist(entry: {
  phone: string;
  userId?: string;
  role: 'customer' | 'worker';
  reason: WaitlistReason;
  district?: string | null;
  trade?: string | null;
}): Promise<void> {
  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      phone: entry.phone,
      role: entry.role,
      district: entry.district ?? null,
      notifiedAt: null,
    },
  });

  if (existing) {
    await prisma.waitlistEntry.update({
      where: { id: existing.id },
      data: { reason: entry.reason, trade: entry.trade ?? existing.trade },
    });
    return;
  }

  await prisma.waitlistEntry.create({
    data: {
      phone: entry.phone,
      userId: entry.userId ?? null,
      role: entry.role,
      reason: entry.reason,
      district: entry.district ?? null,
      trade: entry.trade ?? null,
    },
  });
}
