import { prisma } from '@hyraku/db';
import type { Flow, FlowContext, OutboundMessage, Step } from '../types.js';
import { buttons, exit, fail, list, ok, text } from '../types.js';
import {
  ALL_KERALA_DISTRICTS,
  HOME_DISTRICT_CHOICES,
  SERVICE_DISTRICTS,
  TRADES,
  isServiced,
  matchDistrict,
  matchTrade,
  serviceAreaLabel,
  tradeLabel,
} from '../catalog.js';
import { addToWaitlist } from '../launch.js';

const TERMS_VERSION = '2026-09-01';
const TERMS_URL = 'https://hyraku.in/terms';

// Worker registration.
//
// This is the flow that most needs WhatsApp Flows in production — thirteen
// fields as a chat interview is long, and every abandonment leaves half a
// worker in the database. The step machine here is the same shape a Flow
// submits, so moving to one later replaces the transport, not the model.
//
// Workers may live anywhere in Kerala, but every job is in a serviced district
// (today, Kozhikode). There is no "where would you like to work" question —
// only "can you work where the jobs are". Someone who cannot, or who asks for a
// district we are not in, gets a proper answer and goes on the waitlist rather
// than being registered for work that does not exist.
//
// Documents are collected after the fields rather than inside them: photos are
// the step people most often need a second attempt at, and putting them last
// means an abandoned upload still leaves a reviewable registration.

function mediaStep(id: string, prompt: string, dataKey: string): Step {
  return {
    id,
    ask: () => ({ kind: 'media_request', body: prompt, accept: 'image/*' }),
    accept: (ctx) => {
      const media = ctx.input.media;
      if (!media?.storageKey) {
        return fail('Please send it as a photo attachment rather than text.');
      }
      return ok({
        [dataKey]: {
          storageKey: media.storageKey,
          mimeType: media.mimeType,
          sizeBytes: media.sizeBytes ?? 0,
          sha256: media.sha256 ?? null,
        },
      });
    },
  };
}

export const registrationFlow: Flow = {
  id: 'registration',

  // Where they live, and whether they can work where the jobs are, come right
  // after the trade. Someone who cannot work in the service area should find out
  // after a couple of questions, not after answering eight.
  order: [
    'name',
    'trade',
    'district',
    'district_other',
    'town',
    'work_location',
    'age',
    'gender',
    'experience',
    'daily_rate',
    'doc_aadhaar',
    'doc_passbook',
    'doc_photo',
    'terms',
  ],

  steps: {
    name: {
      id: 'name',
      ask: () => text('What is your full name, as it appears on your Aadhaar?'),
      accept: (ctx) => {
        const v = (ctx.input.text ?? '').trim();
        if (v.length < 3) return fail('Please type your full name.');
        return ok({ name: v.slice(0, 120) });
      },
    },

    age: {
      id: 'age',
      ask: () => text('How old are you?'),
      accept: (ctx) => {
        const n = Number((ctx.input.text ?? '').replace(/\D/g, ''));
        if (!Number.isInteger(n) || n < 18 || n > 70) {
          return fail('Please give an age between 18 and 70.');
        }
        return ok({ age: n });
      },
    },

    gender: {
      id: 'gender',
      ask: () =>
        buttons('Gender?', [
          { id: 'male', title: 'Male' },
          { id: 'female', title: 'Female' },
          { id: 'other', title: 'Other' },
        ]),
      accept: (ctx) => {
        const v = ctx.input.replyId ?? (ctx.input.text ?? '').trim().toLowerCase();
        if (!['male', 'female', 'other'].includes(v)) return fail('Please choose one.');
        return ok({ gender: v });
      },
    },

    trade: {
      id: 'trade',
      ask: () =>
        list('What is your trade?', 'Choose your trade', [
          {
            title: 'Trades',
            rows: TRADES.map((t) => ({
              id: t.id,
              title: t.label,
              description: t.labelMl,
            })),
          },
        ]),
      accept: (ctx) => {
        const id = ctx.input.replyId;
        if (id && TRADES.some((t) => t.id === id)) return ok({ trade: id });
        const typed = matchTrade(ctx.input.text ?? '');
        if (typed) return ok({ trade: typed.id });
        return fail('Please pick your trade from the list.');
      },
    },

    experience: {
      id: 'experience',
      ask: () => text('How many years have you been doing this work?'),
      accept: (ctx) => {
        const n = Number((ctx.input.text ?? '').replace(/\D/g, ''));
        if (!Number.isInteger(n) || n < 0 || n > 60) {
          return fail('Please give a number of years.');
        }
        return ok({ experienceYears: n });
      },
    },

    district: {
      id: 'district',
      ask: () =>
        list('Which district do you *live* in?', 'Choose district', [
          {
            title: 'Districts',
            rows: [
              ...HOME_DISTRICT_CHOICES.map((d) => ({ id: d.toLowerCase(), title: d })),
              { id: 'other', title: 'Other district' },
            ],
          },
        ]),
      accept: (ctx) => {
        if (ctx.input.replyId === 'other') return ok({}, 'district_other');
        const picked =
          ALL_KERALA_DISTRICTS.find((d) => d.toLowerCase() === ctx.input.replyId) ??
          matchDistrict(ctx.input.text ?? '');
        if (!picked) return fail('Please choose a district from the list.');
        return ok({ district: picked }, 'town');
      },
    },

    district_other: {
      id: 'district_other',
      ask: () => text('Which district do you live in? Type the name.'),
      accept: (ctx) => {
        const d = matchDistrict(ctx.input.text ?? '');
        if (!d) return fail('That does not look like a Kerala district. Please type it again.');
        return ok({ district: d });
      },
    },

    town: {
      id: 'town',
      ask: (ctx) => text(`Which town or area in ${ctx.data.district}?`),
      accept: (ctx) => {
        const v = (ctx.input.text ?? '').trim();
        if (v.length < 2) return fail('Please type your town or area.');
        return ok({ town: v.slice(0, 60) });
      },
    },

    work_location: {
      id: 'work_location',
      // Already lives where the work is — nothing to ask.
      skipIf: (ctx) => isServiced(ctx.data.district),
      ask: (ctx) =>
        buttons(
          `Right now all Hyraku jobs are in *${serviceAreaLabel()} district*, at the customer's home or site.\n\n` +
            `You live in ${ctx.data.district}. Are you able to travel to ${serviceAreaLabel()} for work?`,
          [
            { id: 'can_travel', title: 'Yes, I can' },
            { id: 'cannot_travel', title: 'No' },
          ]
        ),
      accept: (ctx) => {
        const reply = ctx.input.replyId;
        const typed = (ctx.input.text ?? '').trim();

        // \b never matches after Malayalam letters (a JS regex without the u flag
        // does not treat them as word characters), so those are checked separately.
        if (
          reply === 'can_travel' ||
          /^(yes|yeah|ok|okay|sure|athe)\b/i.test(typed) ||
          typed.startsWith('അതെ')
        ) {
          return ok({ serviceAreas: SERVICE_DISTRICTS.join(', ') });
        }

        // "I want to work in Thrissur" — a preference for a district we are not in.
        const named = matchDistrict(typed);
        if (named && isServiced(named)) return ok({ serviceAreas: SERVICE_DISTRICTS.join(', ') });
        if (named) return exit('cannot_work_in_service_area', { preferredDistrict: named });

        if (
          reply === 'cannot_travel' ||
          /^(no|nope|illa)\b/i.test(typed) ||
          typed.startsWith('ഇല്ല')
        ) {
          return exit('cannot_work_in_service_area', { preferredDistrict: ctx.data.district });
        }

        return fail('Please tap *Yes, I can* or *No*.');
      },
    },

    daily_rate: {
      id: 'daily_rate',
      ask: () =>
        buttons(
          'Roughly how much do you usually charge for a day of work?\n\n' +
            'This is only for the Hyraku team. You agree your pay directly with each customer, ' +
            'and Hyraku never takes any part of it.',
          [{ id: 'skip', title: 'Skip' }]
        ),
      accept: (ctx) => {
        if (ctx.input.replyId === 'skip' || /^skip$/i.test((ctx.input.text ?? '').trim())) {
          return ok({ usualDailyRate: null });
        }
        const n = Number((ctx.input.text ?? '').replace(/[^\d]/g, ''));
        if (!Number.isFinite(n) || n < 200 || n > 10000) {
          return fail('Please type an amount in rupees, like *900* — or tap *Skip*.');
        }
        return ok({ usualDailyRate: n });
      },
    },

    doc_aadhaar: mediaStep(
      'doc_aadhaar',
      'Now send a photo of your *Aadhaar card*.\n\nIf you have a masked Aadhaar, send that one.',
      'docAadhaar'
    ),

    doc_passbook: mediaStep(
      'doc_passbook',
      'Send a photo of your *bank passbook* — the page showing your account number and IFSC.',
      'docPassbook'
    ),

    doc_photo: mediaStep(
      'doc_photo',
      'Last one: a clear *photo of your face*. Customers see this when we assign you a job.',
      'docPhoto'
    ),

    terms: {
      id: 'terms',
      ask: () =>
        buttons(
          `Almost done.\n\nBy joining you agree to Hyraku's terms and to us storing your documents for verification: ${TERMS_URL}\n\n` +
            `We will only share your name, photo and phone number with customers you are assigned to.`,
          [
            { id: 'accept', title: 'I accept' },
            { id: 'cancel', title: 'Cancel' },
          ]
        ),
      accept: (ctx) => {
        if (ctx.input.replyId === 'accept') return ok({ acceptedTerms: true }, null);
        if (/^(accept|i accept|yes|ok|sammatham)$/i.test((ctx.input.text ?? '').trim())) {
          return ok({ acceptedTerms: true }, null);
        }
        return fail('Tap *I accept* to finish, or *Cancel* to stop.');
      },
    },
  },

  async onExit(_reason, ctx): Promise<OutboundMessage[]> {
    const d = ctx.data;
    const district = (d.preferredDistrict as string) ?? (d.district as string);

    if (d.name) {
      await prisma.user.update({ where: { id: ctx.userId }, data: { name: d.name } });
    }
    await addToWaitlist({
      phone: ctx.phone,
      userId: ctx.userId,
      role: 'worker',
      reason: 'cannot_work_in_service_area',
      district,
      trade: d.trade ?? null,
    });

    const first = String(d.name ?? '').split(' ')[0] || 'there';
    return [
      text(
        `Thank you, ${first}.\n\n` +
          `Right now Hyraku only has work in ${serviceAreaLabel()} district, so we can't register you just yet.\n\n` +
          `We're opening more districts as Hyraku grows. We've saved your details, and we'll message you here as soon as we have work in ${district}.`
      ),
    ];
  },

  async complete(ctx: FlowContext): Promise<OutboundMessage[]> {
    const d = ctx.data;

    await prisma.user.update({
      where: { id: ctx.userId },
      data: { name: d.name },
    });

    const existing = await prisma.workerProfile.findUnique({ where: { userId: ctx.userId } });
    if (existing) {
      return [
        text(
          `You are already registered with us as ${existing.workerUid}.\n\n` +
            `Current status: *${existing.status}*. Reply here if something needs changing.`
        ),
      ];
    }

    const worker = await prisma.workerProfile.create({
      data: {
        userId: ctx.userId,
        workerUid: await nextWorkerUid(),
        trade: d.trade,
        district: d.district,
        town: d.town,
        serviceAreas: d.serviceAreas ?? SERVICE_DISTRICTS.join(', '),
        usualDailyRate: d.usualDailyRate ?? null,
        experienceYears: d.experienceYears ?? 0,
        age: d.age ?? null,
        gender: d.gender ?? null,
        status: 'pending',
        // Consent as evidence, not assumption: what they agreed to, and when.
        acceptedTerms: true,
        acceptedTermsAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });

    const docs = [
      ['aadhaar', d.docAadhaar],
      ['passbook', d.docPassbook],
      ['photo', d.docPhoto],
    ] as const;

    for (const [kind, doc] of docs) {
      if (!doc?.storageKey) continue;
      await prisma.workerDocument.create({
        data: {
          workerId: worker.id,
          kind,
          storageKey: doc.storageKey,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes ?? 0,
          sha256: doc.sha256 ?? null,
          receivedVia: 'whatsapp',
        },
      });
    }

    return [
      text(
        `Thank you, ${String(d.name).split(' ')[0]}! Your registration is submitted.\n\n` +
          `*Your Hyraku ID: ${worker.workerUid}*\n` +
          `${tradeLabel(worker.trade)} · lives in ${worker.town}, ${worker.district}\n\n` +
          `Our team will verify your documents and message you here once you are approved. ` +
          `After that you will start receiving job offers for ${serviceAreaLabel()} on this number.`
      ),
    ];
  },
};

async function nextWorkerUid(): Promise<string> {
  const count = await prisma.workerProfile.count();
  return `HY-${String(count + 1).padStart(6, '0')}`;
}
