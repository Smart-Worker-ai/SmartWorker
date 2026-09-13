// Kerala reference data.
//
// List sizes are not arbitrary: a WhatsApp interactive list caps at 10 rows
// across all sections, so anything offered as a list must fit in 10 including
// its escape hatches.

export interface Trade {
  id: string;
  label: string;
  labelMl: string;
}

export const TRADES: Trade[] = [
  { id: 'electrician',   label: 'Electrician',   labelMl: 'ഇലക്ട്രീഷ്യൻ' },
  { id: 'plumber',       label: 'Plumber',       labelMl: 'പ്ലംബർ' },
  { id: 'carpenter',     label: 'Carpenter',     labelMl: 'ആശാരി' },
  { id: 'ac_technician', label: 'AC Technician', labelMl: 'എ.സി ടെക്നീഷ്യൻ' },
  { id: 'painter',       label: 'Painter',       labelMl: 'പെയിന്റർ' },
  { id: 'mason',         label: 'Mason',         labelMl: 'കൊത്തുപണിക്കാരൻ' },
  { id: 'welder',        label: 'Welder',        labelMl: 'വെൽഡർ' },
];

// ─── Where Hyraku works ──────────────────────────────────────────────────────
//
// Jobs happen only in these districts. Workers may live anywhere in Kerala.
// Opening a new district is adding its name here — every flow, the ranking and
// the console read from this list rather than naming Kozhikode themselves.

export const SERVICE_DISTRICTS: string[] = ['Kozhikode'];

export function isServiced(district: string | null | undefined): boolean {
  return Boolean(district) && SERVICE_DISTRICTS.includes(district as string);
}

/** "Kozhikode", or "Kozhikode and Malappuram" once there are two. */
export function serviceAreaLabel(): string {
  if (SERVICE_DISTRICTS.length === 1) return SERVICE_DISTRICTS[0];
  return `${SERVICE_DISTRICTS.slice(0, -1).join(', ')} and ${SERVICE_DISTRICTS.at(-1)}`;
}

/** Areas offered as list rows when a customer books in Kozhikode. */
export const SERVICE_AREAS: Record<string, string[]> = {
  Kozhikode: [
    'Kozhikode City',
    'Vatakara',
    'Koyilandy',
    'Feroke',
    'Ramanattukara',
    'Mukkam',
    'Thamarassery',
    'Koduvally',
  ],
};

/** Bordering districts. A worker living next door ranks above one across the state. */
export const NEIGHBOURS: Record<string, string[]> = {
  Kozhikode: ['Malappuram', 'Kannur', 'Wayanad'],
};

// ─── Kerala ──────────────────────────────────────────────────────────────────

export const ALL_KERALA_DISTRICTS = [
  'Kozhikode',
  'Malappuram',
  'Kannur',
  'Wayanad',
  'Kasaragod',
  'Palakkad',
  'Thrissur',
  'Ernakulam',
  'Idukki',
  'Kottayam',
  'Alappuzha',
  'Pathanamthitta',
  'Kollam',
  'Thiruvananthapuram',
] as const;

// Worker home district as a list: the nine most likely to register for work in
// Kozhikode, nearest first, plus "Other" = 10 rows.
export const HOME_DISTRICT_CHOICES = ALL_KERALA_DISTRICTS.slice(0, 9);

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

  // Word-anchored. A plain substring test matched "ac" inside "back door" and
  // sent a carpentry job to the AC technicians. Short needles must be whole
  // words; longer ones may be prefixes ("paint" → "painting").
  for (const [needle, tradeId] of Object.entries(synonyms)) {
    const escaped = needle.replace(/[/.]/g, '\\$&');
    const pattern = needle.length <= 3 ? `(^|\\W)${escaped}($|\\W)` : `\\b${escaped}`;
    if (new RegExp(pattern).test(q)) return tradeById(tradeId);
  }
  return TRADES.find((t) => q.includes(t.label.toLowerCase().split(' ')[0]));
}

/**
 * Strict: the text *is* a district name, give or take the word "district".
 *
 * Use this wherever a match turns someone away. Kozhikode has a Wayanad Road
 * and a Kannur Road, and "Kannur Road, near the bus stand" is a Kozhikode
 * address, not a request for Kannur.
 */
export function matchDistrictExact(input: string): string | undefined {
  const q = input.trim().toLowerCase().replace(/[.,!]+$/, '').replace(/\s+district$/, '').trim();
  const hit = matchDistrict(q);
  if (!hit) return undefined;
  const aliasesFor: Record<string, string[]> = {
    Kozhikode: ['calicut'], Thiruvananthapuram: ['trivandrum', 'tvm'], Ernakulam: ['cochin', 'kochi'],
    Thrissur: ['trichur'], Palakkad: ['palghat'], Alappuzha: ['alleppey'], Kollam: ['quilon'], Kannur: ['cannanore'],
  };
  const names = [hit.toLowerCase(), ...(aliasesFor[hit] ?? [])];
  return names.includes(q) ? hit : undefined;
}

/**
 * Match a typed district. Also accepts the common English spellings people
 * still use — "Calicut" is Kozhikode to most of the state.
 */
export function matchDistrict(input: string): string | undefined {
  const q = input.trim().toLowerCase();
  if (q.length < 3) return undefined;

  const aliases: Record<string, string> = {
    calicut: 'Kozhikode',
    trivandrum: 'Thiruvananthapuram',
    tvm: 'Thiruvananthapuram',
    cochin: 'Ernakulam',
    kochi: 'Ernakulam',
    trichur: 'Thrissur',
    palghat: 'Palakkad',
    alleppey: 'Alappuzha',
    quilon: 'Kollam',
    cannanore: 'Kannur',
  };
  for (const [alias, district] of Object.entries(aliases)) {
    if (new RegExp(`\\b${alias}\\b`).test(q)) return district;
  }

  return ALL_KERALA_DISTRICTS.find(
    (d) => d.toLowerCase() === q || d.toLowerCase().startsWith(q) || q.includes(d.toLowerCase())
  );
}
