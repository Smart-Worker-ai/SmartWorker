const ML_MONTHS = [
  'ജനുവരി',
  'ഫെബ്രുവരി',
  'മാർച്ച്',
  'ഏപ്രിൽ',
  'മെയ്',
  'ജൂൺ',
  'ജൂലൈ',
  'ഓഗസ്റ്റ്',
  'സെപ്റ്റംബർ',
  'ഒക്ടോബർ',
  'നവംബർ',
  'ഡിസംബർ',
];

const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getAdvanceMonths(count = 4, from = new Date()) {
  const months = [];
  const start = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    months.push({
      nameEn: `${EN_MONTHS[monthIndex]} ${year}`,
      nameMl: `${ML_MONTHS[monthIndex]} ${year}`,
      year,
      monthIndex,
      daysInMonth: new Date(year, monthIndex + 1, 0).getDate(),
      startDayOffset: d.getDay(),
    });
  }
  return months;
}

export function dateKey(day, month) {
  const monthShort = month.nameEn.split(' ')[0].slice(0, 3);
  return `${day} ${monthShort} ${month.year}`;
}

export function dateFromParts(day, month) {
  return new Date(month.year, month.monthIndex, day);
}

export function parseDateKey(key) {
  const m = String(key || '').trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!m) return null;
  const monthIndex = EN_MONTHS.findIndex((n) => n.slice(0, 3).toLowerCase() === m[2].toLowerCase());
  if (monthIndex < 0) return null;
  return new Date(Number(m[3]), monthIndex, Number(m[1]));
}

export function startOfToday(from = new Date()) {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate());
}

export function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

export function earliestBookableDate(leadDays, from = new Date()) {
  return addDays(startOfToday(from), leadDays);
}

export function windowEndDate(start, maxDays) {
  return addDays(start, Math.max(1, maxDays) - 1);
}

function ymd(d) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function isSameDay(a, b) {
  return a && b && ymd(a) === ymd(b);
}

export function isOnOrAfter(a, b) {
  return a && b && ymd(a) >= ymd(b);
}

export function isInInclusiveRange(d, start, end) {
  return d && start && end && ymd(d) >= ymd(start) && ymd(d) <= ymd(end);
}

export function nextWorkDates(month, leadDays = 2) {
  const earliest = earliestBookableDate(leadDays);
  const inMonth =
    earliest.getFullYear() === month.year && earliest.getMonth() === month.monthIndex;
  const soonestDay = inMonth ? earliest.getDate() : earliest > dateFromParts(1, month) ? null : 1;
  const weekday = new Date(month.year, month.monthIndex, soonestDay || 1).getDay();
  const daysUntilMonday = (8 - weekday) % 7 || 7;
  const nextMonday = (soonestDay || 1) + daysUntilMonday;
  return {
    tomorrow: Math.min((soonestDay || 1) + 1, month.daysInMonth),
    in2days: soonestDay == null ? month.daysInMonth : Math.min(soonestDay, month.daysInMonth),
    nextMonday: Math.min(nextMonday, month.daysInMonth),
  };
}
