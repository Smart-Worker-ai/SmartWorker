// Kerala reference data, carried over from the previous platform's seed set.
//
// The list sizes here are not arbitrary: a WhatsApp interactive list message
// caps at 10 rows across all sections, so anything offered as a list must fit
// in 10 including the escape hatch. That constraint is why districts are the
// nine we actually serve plus "Other", not all fourteen.

export interface Trade {
  id: string;
  label: string;
  labelMl: string;
  typicalRate: number;
}

export const TRADES: Trade[] = [
  { id: 'electrician',   label: 'Electrician',   labelMl: 'ഇലക്ട്രീഷ്യൻ',   typicalRate: 850 },
  { id: 'plumber',       label: 'Plumber',       labelMl: 'പ്ലംബർ',          typicalRate: 760 },
  { id: 'carpenter',     label: 'Carpenter',     labelMl: 'ആശാരി',           typicalRate: 960 },
  { id: 'ac_technician', label: 'AC Technician', labelMl: 'എ.സി ടെക്നീഷ്യൻ', typicalRate: 1050 },
  { id: 'painter',       label: 'Painter',       labelMl: 'പെയിന്റർ',        typicalRate: 680 },
  { id: 'mason',         label: 'Mason',         labelMl: 'കൊത്തുപണിക്കാരൻ', typicalRate: 910 },
  { id: 'welder',        label: 'Welder',        labelMl: 'വെൽഡർ',           typicalRate: 1050 },
];

// Nine served districts + "Other" = exactly 10 list rows.
export const DISTRICTS = [
  'Ernakulam',
  'Thiruvananthapuram',
  'Thrissur',
  'Kozhikode',
  'Kottayam',
  'Palakkad',
  'Malappuram',
  'Kollam',
  'Kannur',
] as const;

export const ALL_KERALA_DISTRICTS = [
  ...DISTRICTS,
  'Pathanamthitta',
  'Alappuzha',
  'Idukki',
  'Wayanad',
  'Kasaragod',
] as const;

export function tradeById(id: string): Trade | undefined {
  return TRADES.find((t) => t.id === id);
}

export function tradeLabel(id: string): string {
  return tradeById(id)?.label ?? id;
}

/** Loose match so free text ("ac guy", "wiring", "പ്ലംബർ") still lands on a trade. */
export function matchTrade(input: string): Trade | undefined {
  const q = input.trim().toLowerCase();
  if (!q) return undefined;

  const direct = TRADES.find(
    (t) => t.id === q || t.label.toLowerCase() === q || t.labelMl === input.trim()
  );
  if (direct) return direct;

  const synonyms: Record<string, string> = {
    electric: 'electrician', wiring: 'electrician', current: 'electrician',
    light: 'electrician', fan: 'electrician', switch: 'electrician',
    pipe: 'plumber', tap: 'plumber', leak: 'plumber', water: 'plumber',
    bathroom: 'plumber', toilet: 'plumber',
    wood: 'carpenter', furniture: 'carpenter', door: 'carpenter', cupboard: 'carpenter',
    ac: 'ac_technician', 'a/c': 'ac_technician', aircon: 'ac_technician',
    fridge: 'ac_technician', cooling: 'ac_technician',
    paint: 'painter', whitewash: 'painter', putty: 'painter',
    cement: 'mason', brick: 'mason', plaster: 'mason', tile: 'mason', wall: 'mason',
    weld: 'welder', gate: 'welder', grill: 'welder', steel: 'welder',
  };

  for (const [needle, tradeId] of Object.entries(synonyms)) {
    if (q.includes(needle)) return tradeById(tradeId);
  }
  return TRADES.find((t) => q.includes(t.label.toLowerCase().split(' ')[0]));
}

export function matchDistrict(input: string): string | undefined {
  const q = input.trim().toLowerCase();
  return ALL_KERALA_DISTRICTS.find(
    (d) => d.toLowerCase() === q || d.toLowerCase().startsWith(q) || q.includes(d.toLowerCase())
  );
}
