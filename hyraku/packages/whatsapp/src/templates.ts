// The template registry.
//
// This file is a deliverable, not just code: these are the message bodies to
// submit to Meta for approval, in both languages, before the system can send
// anything outside a customer service window. Approval takes real time and
// rejections are often unexplained, so submit early.
//
// `params` is load-bearing. Meta assembles an approved template from
// positional {{1}}..{{n}} values and rejects any send whose parameter count
// does not match, so the array here must agree with the placeholders in both
// language bodies and with every template() call site. A test enforces all
// three agree; it is not a convention.
//
// Categories matter for cost and approval. Anything triggered by an event the
// recipient is party to is UTILITY. The two launch announcements tell people
// something new exists, which Meta treats as MARKETING however politely it is
// worded — they cost more, and need the opt-in the waitlist records.

export type TemplateCategory = 'UTILITY' | 'AUTHENTICATION' | 'MARKETING';

export interface TemplateDefinition {
  name: string;
  category: TemplateCategory;
  /** Ordered {{n}} substitutions, for the submission form and for sending. */
  params: string[];
  body: { en: string; ml: string };
  /** Quick-reply button titles, declared at creation and fixed thereafter. */
  buttons?: string[];
}

export const TEMPLATES: TemplateDefinition[] = [
  // ── Registration ─────────────────────────────────────────────────────────
  {
    name: 'registration_approved',
    category: 'UTILITY',
    params: ['worker_uid', 'trade', 'service_area'],
    body: {
      en:
        'You are approved on Hyraku. Your ID is {{1}} ({{2}}). ' +
        'Job offers for {{3}} will arrive on this number, so keep notifications on. ' +
        'Your rate is shown on your profile and the customer pays you directly.',
      ml:
        'ഹൈരാകുവിൽ നിങ്ങളുടെ രജിസ്ട്രേഷൻ അംഗീകരിച്ചു. നിങ്ങളുടെ ഐഡി {{1}} ({{2}}). ' +
        '{{3}}-ലെ ജോലി അറിയിപ്പുകൾ ഈ നമ്പറിൽ വരും. ' +
        'നിങ്ങളുടെ കൂലി പ്രൊഫൈലിൽ കാണാം, ഉപഭോക്താവ് നേരിട്ട് നൽകും.',
    },
  },
  {
    name: 'registration_rejected',
    category: 'UTILITY',
    params: ['reason'],
    body: {
      en: 'We could not approve your Hyraku registration. {{1}} Reply here and we will help you fix it.',
      ml: 'നിങ്ങളുടെ ഹൈരാകു രജിസ്ട്രേഷൻ അംഗീകരിക്കാനായില്ല. {{1}} സഹായത്തിന് ഇവിടെ മറുപടി അയക്കുക.',
    },
  },
  {
    name: 'registration_suspended',
    category: 'UTILITY',
    params: ['reason'],
    body: {
      en: 'Your Hyraku account has been paused. {{1}} Reply here to talk to us.',
      ml: 'നിങ്ങളുടെ ഹൈരാകു അക്കൗണ്ട് താൽക്കാലികമായി നിർത്തി. {{1}} ഞങ്ങളോട് സംസാരിക്കാൻ ഇവിടെ മറുപടി അയക്കുക.',
    },
  },
  {
    name: 'registration_terminated',
    category: 'UTILITY',
    params: ['reason'],
    body: {
      en: 'Your Hyraku account has been closed permanently. {{1}} You will not receive further job offers.',
      ml: 'നിങ്ങളുടെ ഹൈരാകു അക്കൗണ്ട് ശാശ്വതമായി അടച്ചു. {{1}} ഇനി ജോലി അറിയിപ്പുകൾ ലഭിക്കില്ല.',
    },
  },

  // ── Recruitment ──────────────────────────────────────────────────────────
  {
    // Sent to workers on the waitlist when their district opens.
    name: 'district_open_for_workers',
    category: 'MARKETING',
    params: ['district'],
    body: {
      en: 'Hyraku now has work in {{1}}. You asked us to tell you — reply REGISTER to join. Registration is free.',
      ml: 'ഹൈരാകുവിന് ഇപ്പോൾ {{1}}-ൽ ജോലികളുണ്ട്. രജിസ്റ്റർ ചെയ്യാൻ REGISTER എന്ന് മറുപടി അയക്കുക. രജിസ്ട്രേഷൻ സൗജന്യമാണ്.',
    },
  },
  {
    // Sent once, on launch day, to customers who tapped "notify me".
    name: 'bookings_now_open',
    category: 'MARKETING',
    params: ['service_area'],
    body: {
      en: 'Hyraku is now taking bookings in {{1}}. You asked us to let you know — reply here to book a verified worker.',
      ml: 'ഹൈരാകു ഇപ്പോൾ {{1}}-ൽ ബുക്കിംഗ് സ്വീകരിക്കുന്നു. വിശ്വസ്തനായ ഒരു തൊഴിലാളിയെ ബുക്ക് ചെയ്യാൻ ഇവിടെ മറുപടി അയക്കുക.',
    },
  },

  // ── Jobs ─────────────────────────────────────────────────────────────────
  {
    name: 'worker_job_offer',
    category: 'UTILITY',
    params: ['trade', 'date', 'location', 'reference'],
    body: {
      en:
        'New job from Hyraku: {{1}} on {{2}} at {{3}}. Reference {{4}}. ' +
        'Open this chat for the address, the customer details and your rate.',
      ml:
        'ഹൈരാകുവിൽ നിന്ന് പുതിയ ജോലി: {{2}}-ന് {{3}}-ൽ {{1}}. റഫറൻസ് {{4}}. ' +
        'വിലാസം, ഉപഭോക്താവിന്റെ വിവരങ്ങൾ, നിങ്ങളുടെ കൂലി എന്നിവയ്ക്ക് ഈ ചാറ്റ് തുറക്കുക.',
    },
    buttons: ['Accept', 'Decline'],
  },
  {
    name: 'worker_job_accepted',
    category: 'UTILITY',
    params: ['reference', 'date', 'location'],
    body: {
      en: 'Confirmed — Hyraku job {{1}} on {{2}} at {{3}}. We have told the customer to expect you.',
      ml: 'സ്ഥിരീകരിച്ചു — ഹൈരാകു ജോലി {{1}}, {{2}}-ന് {{3}}-ൽ. നിങ്ങൾ വരുമെന്ന് ഉപഭോക്താവിനോട് പറഞ്ഞിട്ടുണ്ട്.',
    },
  },
  {
    name: 'worker_job_declined',
    category: 'UTILITY',
    params: ['reference'],
    body: {
      en: 'No problem — Hyraku job {{1}} will be offered to someone else.',
      ml: 'കുഴപ്പമില്ല — ഹൈരാകു ജോലി {{1}} മറ്റൊരാൾക്ക് നൽകും.',
    },
  },
  {
    name: 'booking_confirmed',
    category: 'UTILITY',
    params: ['reference', 'worker_name', 'trade', 'date', 'rate', 'phone'],
    body: {
      en:
        'Your Hyraku booking {{1}} is confirmed. {{2}} ({{3}}) will come on {{4}}. ' +
        'Their rate is {{5}}, paid to them directly. They will call you from {{6}} before arriving.',
      ml:
        'നിങ്ങളുടെ ഹൈരാകു ബുക്കിംഗ് {{1}} സ്ഥിരീകരിച്ചു. {{4}}-ന് {{2}} ({{3}}) വരും. ' +
        'കൂലി {{5}}, നേരിട്ട് നൽകുക. എത്തുന്നതിന് മുൻപ് {{6}} എന്ന നമ്പറിൽ നിന്ന് വിളിക്കും.',
    },
  },
  {
    // A crew is accepted before anyone knows which people. The lead and the
    // headcount are what is true at that moment; the names follow.
    name: 'booking_crew_confirmed',
    category: 'UTILITY',
    params: ['reference', 'headcount', 'trade', 'date', 'lead_name', 'phone'],
    body: {
      en:
        'Your Hyraku booking {{1}} is confirmed: {{2}} × {{3}} on {{4}}. ' +
        '{{5}} is leading the job and will call you from {{6}}. ' +
        'We will send you the names of everyone coming before the day.',
      ml:
        'നിങ്ങളുടെ ഹൈരാകു ബുക്കിംഗ് {{1}} സ്ഥിരീകരിച്ചു: {{4}}-ന് {{2}} × {{3}}. ' +
        '{{5}} ജോലിക്ക് നേതൃത്വം നൽകും, {{6}} എന്ന നമ്പറിൽ നിന്ന് വിളിക്കും. ' +
        'വരുന്നവരുടെ പേരുകൾ ദിവസത്തിന് മുൻപ് അയക്കാം.',
    },
  },
  {
    name: 'crew_roster',
    category: 'UTILITY',
    params: ['reference', 'headcount', 'date'],
    body: {
      en: 'Hyraku booking {{1}}: the {{2}} workers coming on {{3}} are listed in this chat, with their rates.',
      ml: 'ഹൈരാകു ബുക്കിംഗ് {{1}}: {{3}}-ന് വരുന്ന {{2}} തൊഴിലാളികളുടെ പേരും കൂലിയും ഈ ചാറ്റിൽ ഉണ്ട്.',
    },
  },
  {
    name: 'job_reminder',
    category: 'UTILITY',
    params: ['reference', 'worker_name', 'date', 'location'],
    body: {
      en: 'Reminder: Hyraku booking {{1}} — {{2}} is scheduled for {{3}} at {{4}}.',
      ml: 'ഓർമ്മപ്പെടുത്തൽ: ഹൈരാകു ബുക്കിംഗ് {{1}} — {{3}}-ന് {{4}}-ൽ {{2}} വരും.',
    },
  },
  {
    name: 'feedback_request',
    category: 'UTILITY',
    params: ['reference', 'worker_name'],
    body: {
      en: 'How did the job go? Booking {{1}} with {{2}} is marked complete. Reply 1-5 to rate.',
      ml: 'ജോലി എങ്ങനെയുണ്ടായിരുന്നു? {{2}}-നൊപ്പമുള്ള ബുക്കിംഗ് {{1}} പൂർത്തിയായി. 1-5 റേറ്റ് ചെയ്യാൻ മറുപടി അയക്കുക.',
    },
  },
];

export function templateByName(name: string): TemplateDefinition | undefined {
  return TEMPLATES.find((t) => t.name === name);
}

/** Highest {{n}} referenced in a body — what Meta will expect to be given. */
export function placeholderCount(body: string): number {
  const found = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  return found.length ? Math.max(...found) : 0;
}
