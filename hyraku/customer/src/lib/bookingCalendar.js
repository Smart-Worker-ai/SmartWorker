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

export function nextWorkDates(month) {
  const now = new Date();
  const isCurrent =
    now.getFullYear() === month.year && now.getMonth() === month.monthIndex;
  const tomorrow = isCurrent ? now.getDate() + 1 : 1;
  const inTwo = tomorrow + 1;
  const weekday = new Date(month.year, month.monthIndex, tomorrow).getDay();
  const daysUntilMonday = (8 - weekday) % 7 || 7;
  const nextMonday = tomorrow + daysUntilMonday;
  return {
    tomorrow: Math.min(tomorrow, month.daysInMonth),
    in2days: Math.min(inTwo, month.daysInMonth),
    nextMonday: Math.min(nextMonday, month.daysInMonth),
  };
}
