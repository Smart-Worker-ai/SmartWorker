// People type dates into WhatsApp the way they'd say them out loud. Rejecting
// "tomorrow" because it isn't ISO-8601 is the kind of thing that loses a
// booking, so parse generously and echo back what we understood.

const WEEKDAYS = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

function atNoon(d: Date): Date {
  // Times aren't collected in the beta — the admin agrees an arrival window on
  // assignment. Noon keeps the date stable across any timezone rendering.
  const out = new Date(d);
  out.setHours(12, 0, 0, 0);
  return out;
}

function startOfToday(): Date {
  return atNoon(new Date());
}

export interface ParsedDate {
  date: Date;
  /** How we'll read it back to the customer for confirmation. */
  display: string;
  /** Same-day or next-morning work — sorts to the top of the admin queue. */
  isUrgent: boolean;
}

export function parseDate(input: string): ParsedDate | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;

  const today = startOfToday();

  if (/^(today|ind?ay|innu|ഇന്ന്)$/.test(q)) {
    return finish(today, true);
  }

  if (/^(tomorrow|tmrw|naale|നാളെ)$/.test(q)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return finish(d, true);
  }

  if (/^day after( tomorrow)?$/.test(q)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return finish(d, false);
  }

  // "in 3 days"
  const inDays = q.match(/^in (\d{1,2}) days?$/);
  if (inDays) {
    const d = new Date(today);
    d.setDate(d.getDate() + Number(inDays[1]));
    return finish(d, Number(inDays[1]) <= 1);
  }

  // "next monday" / "monday"
  const weekday = q.replace(/^next\s+/, '');
  const wdIndex = WEEKDAYS.indexOf(weekday);
  if (wdIndex >= 0) {
    const d = new Date(today);
    const delta = (wdIndex - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + delta);
    return finish(d, false);
  }

  // 15-04-2026 / 15/4/26 / 15.04.2026 — day-first, as written in India.
  const dmy = q.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmy) {
    let [, dd, mm, yy] = dmy;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    const d = new Date(year, Number(mm) - 1, Number(dd));
    if (isValid(d, Number(dd), Number(mm))) return finish(atNoon(d), daysFromNow(d) <= 1);
  }

  // "15-04" / "15/4" — no year, assume the next occurrence.
  const dm = q.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (dm) {
    const [, dd, mm] = dm;
    const now = new Date();
    let d = new Date(now.getFullYear(), Number(mm) - 1, Number(dd));
    if (atNoon(d) < today) d = new Date(now.getFullYear() + 1, Number(mm) - 1, Number(dd));
    if (isValid(d, Number(dd), Number(mm))) return finish(atNoon(d), daysFromNow(d) <= 1);
  }

  return null;

  function finish(d: Date, urgentHint: boolean): ParsedDate | null {
    const normalized = atNoon(d);
    if (normalized < today) return null; // never book the past
    return {
      date: normalized,
      display: formatDate(normalized),
      isUrgent: urgentHint || daysFromNow(normalized) <= 1,
    };
  }
}

function isValid(d: Date, dd: number, mm: number): boolean {
  return d.getDate() === dd && d.getMonth() === mm - 1;
}

function daysFromNow(d: Date): number {
  return Math.round((atNoon(d).getTime() - startOfToday().getTime()) / 86_400_000);
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
