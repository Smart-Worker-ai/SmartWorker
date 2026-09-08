import { prisma } from '@hyraku/db';
import type { Flow, FlowContext, OutboundMessage, Step } from '../types.js';
import { buttons, fail, list, ok, text } from '../types.js';
import { DISTRICTS, TRADES, matchDistrict, matchTrade, tradeById, tradeLabel } from '../catalog.js';

const TERMS_VERSION = '2026-09-01';
const TERMS_URL = 'https://hyraku.in/terms';

// Worker registration.
//
// This is the flow that most needs WhatsApp Flows in production — thirteen
// fields as a chat interview is long, and every abandonment leaves half a
// worker in the database. The step machine here is the same shape a Flow
// submits, so moving to one later replaces the transport, not the model.
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

  order: [
    'name',
    'age',
    'gender',
    'trade',
    'experience',
    'district',
    'town',
    'service_areas',
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
        list('Which district do you live in?', 'Choose district', [
          {
            title: 'Districts',
            rows: DISTRICTS.map((d) => ({ id: d.toLowerCase(), title: d })),
          },
        ]),
      accept: (ctx) => {
        const picked =
          DISTRICTS.find((d) => d.toLowerCase() === ctx.input.replyId) ??
          matchDistrict(ctx.input.text ?? '');
        if (!picked) return fail('Please choose a district from the list.');
        return ok({ district: picked });
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

    service_areas: {
      id: 'service_areas',
      ask: (ctx) =>
        buttons(
          `Which districts will you travel to for work?\n\n` +
            `Type them separated by commas, or tap below to work only in ${ctx.data.district}.`,
          [{ id: 'same', title: `Only ${String(ctx.data.district).slice(0, 12)}` }]
        ),
      accept: (ctx) => {
        if (ctx.input.replyId === 'same') return ok({ serviceAreas: ctx.data.district });

        const parts = (ctx.input.text ?? '')
          .split(',')
          .map((s) => matchDistrict(s))
          .filter((d): d is string => Boolean(d));

        if (parts.length === 0) {
          return fail('I did not recognise those. Type district names separated by commas.');
        }
        return ok({ serviceAreas: [...new Set(parts)].join(', ') });
      },
    },

    daily_rate: {
      id: 'daily_rate',
      ask: (ctx) => {
        const typical = tradeById(ctx.data.trade)?.typicalRate ?? 800;
        return text(
          `What is your daily rate in rupees?\n\n` +
            `Most ${tradeLabel(ctx.data.trade).toLowerCase()}s on Hyraku charge around ₹${typical}.`
        );
      },
      accept: (ctx) => {
        const n = Number((ctx.input.text ?? '').replace(/[^\d]/g, ''));
        if (!Number.isFinite(n) || n < 200 || n > 10000) {
          return fail('Please give a daily rate between ₹200 and ₹10,000.');
        }
        return ok({ dailyRate: n });
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
        serviceAreas: d.serviceAreas ?? d.district,
        dailyRate: d.dailyRate ?? 800,
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
          `${tradeLabel(worker.trade)} · ${worker.town}, ${worker.district} · ₹${worker.dailyRate}/day\n\n` +
          `Our team will verify your documents and message you here once you are approved. ` +
          `After that you will start receiving job offers on this number.`
      ),
    ];
  },
};

async function nextWorkerUid(): Promise<string> {
  const count = await prisma.workerProfile.count();
  return `HY-${String(count + 1).padStart(6, '0')}`;
}
