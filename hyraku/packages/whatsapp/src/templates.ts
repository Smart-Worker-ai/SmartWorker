// The template registry.
//
// This file is a Phase 0 deliverable, not just code: these are the message
// bodies to submit to Meta for approval, in both languages, before any of the
// rest of the system can notify anyone. Approval takes real time and rejections
// are often unexplained, so submitting early is the single best schedule
// decision available.
//
// All of these are UTILITY category — each is triggered by a real event the
// recipient is party to, which is both the honest classification and the cheap
// one. Nothing here is marketing.

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
  {
    name: 'worker_job_offer',
    category: 'UTILITY',
    params: ['trade', 'date', 'location', 'rate', 'reference'],
    body: {
      en:
        'New job from Hyraku: {{1}} on {{2}} at {{3}}, ₹{{4}}/day. ' +
        'Reference {{5}}. Open this chat for the full address and customer details.',
      ml:
        'ഹൈരാകുവിൽ നിന്ന് പുതിയ ജോലി: {{2}}-ന് {{3}}-ൽ {{1}}, ദിവസം ₹{{4}}. ' +
        'റഫറൻസ് {{5}}. പൂർണ്ണ വിലാസത്തിന് ഈ ചാറ്റ് തുറക്കുക.',
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
        'They will call you from {{5}} before arriving.',
      ml:
        'നിങ്ങളുടെ ഹൈരാകു ബുക്കിംഗ് {{1}} സ്ഥിരീകരിച്ചു. {{4}}-ന് {{2}} ({{3}}) വരും. ' +
        'എത്തുന്നതിന് മുൻപ് {{5}} എന്ന നമ്പറിൽ നിന്ന് വിളിക്കും.',
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
    name: 'registration_approved',
    category: 'UTILITY',
    params: ['worker_uid', 'trade', 'rate'],
    body: {
      en:
        'You are approved on Hyraku. Your ID is {{1}} ({{2}}, ₹{{3}}/day). ' +
        'Job offers will arrive on this number — keep notifications on.',
      ml:
        'ഹൈരാകുവിൽ നിങ്ങൾ അംഗീകരിക്കപ്പെട്ടു. നിങ്ങളുടെ ഐഡി {{1}} ({{2}}, ദിവസം ₹{{3}}). ' +
        'ഈ നമ്പറിൽ ജോലി അറിയിപ്പുകൾ വരും.',
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
