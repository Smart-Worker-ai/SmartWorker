// People type dates into WhatsApp the way they'd say them out loud. Rejecting
// "tomorrow" because it isn't ISO-8601 is the kind of thing that loses a
// booking, so parse generously and echo back what we understood.
//
// Every calculation here is anchored to Asia/Kolkata explicitly rather than to
// the process timezone. A UTC host resolves "today" to yesterday between
// midnight and 05:30 IST, and the flow then rejects it as a date in the past —
// a bug that only appears for the customers messaging late at night.

const ZONE = 'Asia/Kolkata';

const WEEKDAYS = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

/** Calendar date in Kerala, as a UTC-midnight Date — what a DATE column holds. */
function istToday(): Date {
  return istDayOf(new Date());
}

function istDayOf(instant: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export interface ParsedDate {
  /** UTC midnight on the Kerala calendar day. */
  date: Date;
  /** How we'll read it back to the customer for confirmation. */
  display: string;
  /** Same-day or next-morning work — sorts to the top of the admin queue. */
  isUrgent: boolean;
}

export function parseDate(input: string): ParsedDate | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;

  const today = istToday();

  if (/^(today|ind?ay|innu|ഇന്ന്)$/.test(q)) return finish(today);
  if (/^(tomorrow|tmrw|naale|നാളെ)$/.test(q)) return finish(addDays(today, 1));
  if (/^day after( tomorrow)?$/.test(q)) return finish(addDays(today, 2));

  // "in 3 days"
  const inDays = q.match(/^in (\d{1,2}) days?$/);
  if (inDays) return finish(addDays(today, Number(inDays[1])));

  // "next monday" / "monday"
  const weekday = q.replace(/^next\s+/, '');
  const wdIndex = WEEKDAYS.indexOf(weekday);
  if (wdIndex >= 0) {
    const delta = (wdIndex - today.getUTCDay() + 7) % 7 || 7;
    return finish(addDays(today, delta));
  }

  // 15-04-2026 / 15/4/26 / 15.04.2026 — day-first, as written in India.
  const dmy = q.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmy) {
    const [, dd, mm, yy] = dmy;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    const d = new Date(Date.UTC(year, Number(mm) - 1, Number(dd)));
    if (isValid(d, Number(dd), Number(mm))) return finish(d);
  }

  // "15-04" / "15/4" — no year, assume the next occurrence.
  const dm = q.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (dm) {
    const [, dd, mm] = dm;
    let d = new Date(Date.UTC(today.getUTCFullYear(), Number(mm) - 1, Number(dd)));
    if (d < today) d = new Date(Date.UTC(today.getUTCFullYear() + 1, Number(mm) - 1, Number(dd)));
    if (isValid(d, Number(dd), Number(mm))) return finish(d);
  }

  return null;

  function finish(d: Date): ParsedDate | null {
    if (d < today) return null; // never book the past
    return {
      date: d,
      display: formatDate(d),
      isUrgent: daysBetween(d, today) <= 1,
    };
  }
}

function isValid(d: Date, dd: number, mm: number): boolean {
  return d.getUTCDate() === dd && d.getUTCMonth() === mm - 1;
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC', // the value is already a Kerala calendar day
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export { istToday, istDayOf, addDays, daysBetween };
