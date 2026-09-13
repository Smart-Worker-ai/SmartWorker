// The template registry.
//
// This file is a deliverable, not just code: these are the message bodies to
// submit to Meta for approval, in both languages, before the system can send
// anything outside a customer service window. Approval takes real time and
// rejections are often unexplained, so submit early.
//
// No template quotes a rate. Pay is agreed between customer and worker directly
// and Hyraku is not party to it.
//
// The Malayalam bodies are drafts. Have a native speaker check them before
// submission — Meta approves a template per language, and a clumsy translation
// is still a live message to a real worker.
//
// Categories matter for cost and for approval. Anything triggered by an event
// the recipient is party to is UTILITY. The two launch announcements tell people
// something new is available, which Meta treats as MARKETING however politely
// it is worded — they cost more, and need the opt-in the waitlist records.

export type TemplateCategory = 'UTILITY' | 'AUTHENTICATION' | 'MARKETING';

export interface TemplateDefinition {
  name: string;
  category: TemplateCategory;
  /** Ordered {{n}} substitutions, for the submission form and for sendTemplate. */
  params: string[];
  body: { en: string; ml: string };
  buttons?: string[];
}

export const TEMPLATES: TemplateDefinition[] = [
  // ── Worker recruitment — the launch phase ────────────────────────────────
  {
    name: 'registration_approved',
    category: 'UTILITY',
    params: ['worker_uid', 'trade', 'service_area'],
    body: {
      en:
        'You are approved on Hyraku. Your ID is {{1}} ({{2}}). ' +
        'Job offers for {{3}} will arrive on this number, so keep notifications on. ' +
        'You agree your pay directly with each customer.',
      ml:
        'ഹൈരാകുവിൽ നിങ്ങളുടെ രജിസ്ട്രേഷൻ അംഗീകരിച്ചു. നിങ്ങളുടെ ഐഡി {{1}} ({{2}}). ' +
        '{{3}}-ലെ ജോലി അറിയിപ്പുകൾ ഈ നമ്പറിൽ വരും. ' +
        'കൂലി ഓരോ ഉപഭോക്താവുമായി നേരിട്ട് തീരുമാനിക്കാം.',
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
    // Sent to workers on the waitlist when their district opens.
    name: 'district_open_for_workers',
    category: 'MARKETING',
    params: ['district'],
    body: {
      en: 'Hyraku now has work in {{1}}. You asked us to tell you — reply REGISTER to join. Registration is free.',
      ml: 'ഹൈരാകുവിന് ഇപ്പോൾ {{1}}-ൽ ജോലികളുണ്ട്. രജിസ്റ്റർ ചെയ്യാൻ REGISTER എന്ന് മറുപടി അയക്കുക. രജിസ്ട്രേഷൻ സൗജന്യമാണ്.',
    },
  },

  // ── Customer launch ──────────────────────────────────────────────────────
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

  // ── Bookings ─────────────────────────────────────────────────────────────
  {
    name: 'worker_job_offer',
    category: 'UTILITY',
    params: ['trade', 'date', 'location', 'reference'],
    body: {
      en:
        'New job from Hyraku: {{1}} on {{2}} at {{3}}. Reference {{4}}. ' +
        'Open this chat for the address and customer details, and agree the pay with the customer directly.',
      ml:
        'ഹൈരാകുവിൽ നിന്ന് പുതിയ ജോലി: {{2}}-ന് {{3}}-ൽ {{1}}. റഫറൻസ് {{4}}. ' +
        'വിലാസത്തിനും ഉപഭോക്താവിന്റെ വിവരങ്ങൾക്കും ഈ ചാറ്റ് തുറക്കുക. കൂലി ഉപഭോക്താവുമായി നേരിട്ട് തീരുമാനിക്കുക.',
    },
    buttons: ['Accept', 'Decline'],
  },
  {
    name: 'booking_confirmed',
    category: 'UTILITY',
    params: ['reference', 'worker_name', 'trade', 'date', 'phone'],
    body: {
      en:
        'Your Hyraku booking {{1}} is confirmed. {{2}} ({{3}}) will come on {{4}}. ' +
        'They will call you from {{5}} before arriving. You agree the pay with them directly.',
      ml:
        'നിങ്ങളുടെ ഹൈരാകു ബുക്കിംഗ് {{1}} സ്ഥിരീകരിച്ചു. {{4}}-ന് {{2}} ({{3}}) വരും. ' +
        'എത്തുന്നതിന് മുൻപ് {{5}} എന്ന നമ്പറിൽ നിന്ന് വിളിക്കും. കൂലി അവരുമായി നേരിട്ട് തീരുമാനിക്കാം.',
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
