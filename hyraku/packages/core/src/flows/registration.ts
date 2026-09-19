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
import { suggestTier } from '../rates.js';

const TERMS_VERSION = '2026-09-01';
const TERMS_URL = 'https://hyraku.in/terms';

// Registration, for all three kinds of worker.
//
// An *individual* works alone. An *agent* is a labour contractor who supplies a
// crew. A *supervisor* is an on-site lead. Agents and supervisors also carry a
// trade of their own, because both may take jobs personally.
//
// Someone registering through an agent or supervisor enters their referral
// code, or arrives on a link that carries it. That link is attribution and it
// decides who answers a job offer for them — nothing more. It gives the lead no
// authority over this person's profile, documents or rating.
//
// This is a long interview, and every abandonment leaves half a worker in the
// database. The web form is the primary path for exactly that reason; the step
// machine here is the same shape a WhatsApp Flow submits, so moving to one
// later replaces the transport, not the model.
//
// Where they live, and whether they can work where the jobs are, come right
// after the trade. Someone who cannot should find out after four answers, not
// after fourteen.

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

const isLead = (ctx: FlowContext) => ctx.data.kind === 'agent' || ctx.data.kind === 'supervisor';

export const registrationFlow: Flow = {
  id: 'registration',

  order: [
    'kind',
    'referral',
    'name',
    'trade',
    'crew_trades',
    'crew_size',
    'district',
    'district_other',
    'town',
    'work_location',
    'works_with_crews',
    'age',
    'gender',
    'experience',
    'usual_rate',
    'doc_aadhaar',
    'doc_pvc',
    'pvc_number',
    'doc_photo',
    'terms',
  ],

  steps: {
    kind: {
      id: 'kind',
      // A referral link already answered this: only a worker follows one.
      skipIf: (ctx) => Boolean(ctx.data.kind),
      ask: () =>
        buttons(
          'How will you work with Hyraku?\n\n' +
            '*On my own* — you take jobs yourself.\n' +
            '*Agent* — you supply workers to jobs.\n' +
            '*Supervisor* — you lead a team on site.',
          [
            { id: 'individual', title: 'On my own' },
            { id: 'agent', title: 'Agent' },
            { id: 'supervisor', title: 'Supervisor' },
          ]
        ),
      accept: (ctx) => {
        const v = ctx.input.replyId ?? (ctx.input.text ?? '').trim().toLowerCase();
        if (['individual', 'agent', 'supervisor'].includes(v)) return ok({ kind: v });
        if (/^(own|myself|alone|single)/i.test(v)) return ok({ kind: 'individual' });
        return fail('Please tap one of the three.');
      },
    },

    referral: {
      id: 'referral',
      // Leads have nobody above them, and a code that arrived on a link is
      // already resolved.
      skipIf: (ctx) => isLead(ctx) || Boolean(ctx.data.leadId),
      ask: () =>
        buttons(
          'Are you joining through an agent or a supervisor?\n\n' +
            'If so, type the code they gave you. If you are joining on your own, tap Skip.',
          [{ id: 'skip', title: 'Skip' }]
        ),
      accept: async (ctx) => {
        const typed = (ctx.input.text ?? '').trim().toUpperCase();
        if (ctx.input.replyId === 'skip' || /^SKIP$/i.test(typed)) return ok({ leadId: null });

        const lead = await prisma.workerProfile.findUnique({
          where: { referralCode: typed },
          include: { user: true },
        });
        if (!lead || lead.status !== 'approved') {
          return fail('That code is not one of ours. Check it, or tap *Skip* to join on your own.');
        }
        return ok({
          leadId: lead.id,
          leadName: lead.user.name,
          leadKind: lead.kind,
          referredByCode: typed,
        });
      },
    },

    name: {
      id: 'name',
      ask: () => text('What is your full name, as it appears on your Aadhaar?'),
      accept: (ctx) => {
        const v = (ctx.input.text ?? '').trim();
        if (v.length < 3) return fail('Please type your full name.');
        return ok({ name: v.slice(0, 120) });
      },
    },

    trade: {
      id: 'trade',
      ask: (ctx) =>
        list(
          isLead(ctx)
            ? 'What is your own trade? You can list what your team covers next.'
            : 'What is your trade?',
          'Choose your trade',
          [
            {
              title: 'Trades',
              rows: TRADES.map((t) => ({ id: t.id, title: t.label, description: t.labelMl })),
            },
          ]
        ),
      accept: (ctx) => {
        const id = ctx.input.replyId;
        if (id && TRADES.some((t) => t.id === id)) return ok({ trade: id });
        const typed = matchTrade(ctx.input.text ?? '');
        if (typed) return ok({ trade: typed.id });
        return fail('Please pick your trade from the list.');
      },
    },

    crew_trades: {
      id: 'crew_trades',
      skipIf: (ctx) => !isLead(ctx),
      ask: () =>
        text(
          'Which trades does your team cover? Type them separated by commas — ' +
            'for example *electrician, plumber*.\n\nType *same* if it is only your own trade.'
        ),
      accept: (ctx) => {
        const raw = (ctx.input.text ?? '').trim();
        if (/^same$/i.test(raw)) return ok({ crewTrades: [ctx.data.trade] });

        const matched = raw
          .split(',')
          .map((part) => matchTrade(part)?.id)
          .filter((id): id is string => Boolean(id));

        if (matched.length === 0) {
          return fail('We could not match any of those to a trade. Try again, or type *same*.');
        }
        return ok({ crewTrades: [...new Set([...matched, ctx.data.trade])] });
      },
    },

    crew_size: {
      id: 'crew_size',
      skipIf: (ctx) => !isLead(ctx),
      ask: () =>
        text(
          'How many workers can you bring to a job?\n\n' +
            'Register as many as you like — there is no limit. This is the number we will ' +
            'count on when a job needs a team, so give us the figure you can actually field ' +
            'on the day.'
        ),
      accept: (ctx) => {
        const n = Number((ctx.input.text ?? '').replace(/\D/g, ''));
        if (!Number.isInteger(n) || n < 1 || n > 500) {
          return fail('Please give a number of workers.');
        }
        return ok({ claimedCrewSize: n });
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
          return ok({ serviceAreas: [...SERVICE_DISTRICTS] });
        }

        // "I want to work in Thrissur" — a preference for a district we are not in.
        const named = matchDistrict(typed);
        if (named && isServiced(named)) return ok({ serviceAreas: [...SERVICE_DISTRICTS] });
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

    works_with_crews: {
      id: 'works_with_crews',
      // Only asked of people who will be working on their own. Anyone joining
      // through a lead is on a crew already, and leads run them.
      skipIf: (ctx) => isLead(ctx) || Boolean(ctx.data.leadId),
      ask: () =>
        buttons(
          'Some jobs need more than one worker, and you would be working alongside ' +
            "a team from an agent or a supervisor.\n\nAre you happy to take those jobs?\n\n" +
            'Saying no only means you will be offered jobs on your own.',
          [
            { id: 'yes', title: 'Yes, happy to' },
            { id: 'no', title: 'On my own only' },
          ]
        ),
      accept: (ctx) => {
        const v = ctx.input.replyId ?? (ctx.input.text ?? '').trim().toLowerCase();
        if (v === 'yes' || /^(yes|yeah|ok|sure|athe)\b/i.test(v)) return ok({ worksWithCrews: true });
        if (v === 'no' || /^(no|nope|illa)\b/i.test(v)) return ok({ worksWithCrews: false });
        return fail('Please tap one of the two.');
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

    experience: {
      id: 'experience',
      ask: () => text('How many years have you been doing this work?'),
      accept: (ctx) => {
        const n = Number((ctx.input.text ?? '').replace(/\D/g, ''));
        if (!Number.isInteger(n) || n < 0 || n > 60) return fail('Please give a number of years.');
        return ok({ experienceYears: n });
      },
    },

    usual_rate: {
      id: 'usual_rate',
      ask: () =>
        buttons(
          'Roughly how much do you usually charge for a day of work?\n\n' +
            'Hyraku sets a standard rate for each trade, and this helps our team place you ' +
            'on the right one. The customer pays you directly — Hyraku never takes a share.',
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
      'Now send a photo of your *Aadhaar card*.\n\nA masked Aadhaar is best — we only need it ' +
        'to confirm who you are, and we never store the number itself.',
      'docAadhaar'
    ),

    doc_pvc: mediaStep(
      'doc_pvc',
      'Send a photo of your *Police Verification Certificate*.\n\n' +
        'Customers are letting you into their homes, so every Hyraku worker has one. ' +
        'If you do not have it yet, you can still finish registering — we will hold your ' +
        'application and you can send it later.',
      'docPvc'
    ),

    pvc_number: {
      id: 'pvc_number',
      ask: () => text('What is the certificate number, and which police station issued it?'),
      accept: (ctx) => {
        const v = (ctx.input.text ?? '').trim();
        if (v.length < 4) return fail('Please type the certificate number and the station.');
        return ok({ pvcRaw: v.slice(0, 160) });
      },
    },

    doc_photo: mediaStep(
      'doc_photo',
      'Last one: a clear *photo of your face*. Customers see this when we assign you a job.',
      'docPhoto'
    ),

    terms: {
      id: 'terms',
      ask: () =>
        buttons(
          `Almost done.\n\nBy joining you agree to Hyraku's terms and to us storing your ` +
            `documents for verification: ${TERMS_URL}\n\n` +
            `We share your name, photo, rate and phone number with customers you are assigned to. ` +
            `Asking a customer for more than your Hyraku rate, or paying for better jobs, ends ` +
            `your account permanently.`,
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

    await prisma.user.update({ where: { id: ctx.userId }, data: { name: d.name } });

    const existing = await prisma.workerProfile.findUnique({ where: { userId: ctx.userId } });
    if (existing) {
      return [
        text(
          `You are already registered with us as ${existing.workerUid}.\n\n` +
            `Current status: *${existing.status}*. Reply here if something needs changing.`
        ),
      ];
    }

    const kind = (d.kind ?? 'individual') as 'individual' | 'agent' | 'supervisor';
    const lead = kind === 'individual' ? ((d.leadId as string) ?? null) : null;

    const worker = await prisma.workerProfile.create({
      data: {
        userId: ctx.userId,
        workerUid: await nextWorkerUid(),
        kind,
        leadId: lead,
        referredByCode: (d.referredByCode as string) ?? null,
        // A lead hands this out; it is how their workers are attributed to them.
        referralCode: kind === 'individual' ? null : await uniqueReferralCode(),
        trade: d.trade,
        crewTrades: (d.crewTrades as string[]) ?? [],
        claimedCrewSize: (d.claimedCrewSize as number) ?? null,
        // Only asked of people working on their own — see the step's skipIf.
        worksWithCrews: kind === 'individual' && !lead ? (d.worksWithCrews ?? null) : null,
        district: d.district,
        town: d.town,
        serviceAreas: (d.serviceAreas as string[]) ?? [...SERVICE_DISTRICTS],
        usualDailyRate: d.usualDailyRate ?? null,
        // Suggested only. The team sets the published rate from the rate card
        // at approval, and that is what a customer ever sees.
        rateTier: suggestTier(d.experienceYears ?? 0),
        experienceYears: d.experienceYears ?? 0,
        age: d.age ?? null,
        gender: d.gender ?? null,
        status: 'pending',
        pvcStation: (d.pvcRaw as string) ?? null,
        // Consent as evidence, not assumption: what they agreed to, and when.
        acceptedTerms: true,
        acceptedTermsAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });

    if (lead) {
      await prisma.affiliationEvent.create({
        data: { workerId: worker.id, toLeadId: lead, reason: 'registered_via_referral' },
      });
    }

    const docs = [
      ['aadhaar', d.docAadhaar],
      ['pvc', d.docPvc],
      ['photo', d.docPhoto],
    ] as const;

    for (const [kindOfDoc, doc] of docs) {
      if (!doc?.storageKey) continue;
      await prisma.workerDocument.create({
        data: {
          workerId: worker.id,
          kind: kindOfDoc,
          storageKey: doc.storageKey,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes ?? 0,
          sha256: doc.sha256 ?? null,
          receivedVia: 'whatsapp',
        },
      });
    }

    const who =
      kind === 'individual'
        ? d.leadName
          ? `${tradeLabel(worker.trade)} · with ${d.leadName}`
          : tradeLabel(worker.trade)
        : `${kind === 'agent' ? 'Agent' : 'Supervisor'} · ${tradeLabel(worker.trade)}`;

    const leadNote =
      worker.referralCode
        ? `\n\n*Your team code: ${worker.referralCode}*\nShare it with your workers so their ` +
          `registrations come through to you.`
        : '';

    return [
      text(
        `Thank you, ${String(d.name).split(' ')[0]}! Your registration is submitted.\n\n` +
          `*Your Hyraku ID: ${worker.workerUid}*\n` +
          `${who} · lives in ${worker.town}, ${worker.district}${leadNote}\n\n` +
          `Our team will check your documents and message you here once you are approved. ` +
          `You will start getting job offers for ${serviceAreaLabel()} on this number.`
      ),
    ];
  },
};

async function nextWorkerUid(): Promise<string> {
  const [row] = await prisma.$queryRaw<Array<{ uid: string }>>`SELECT next_worker_uid() AS uid`;
  return row.uid;
}

/** HYA-7K2M. No vowels, so it cannot spell anything, and no 0/O or 1/I. */
async function uniqueReferralCode(): Promise<string> {
  const ALPHABET = '23456789BCDFGHJKLMNPQRSTVWXYZ';
  for (let attempt = 0; attempt < 10; attempt++) {
    const body = Array.from(
      { length: 4 },
      () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    ).join('');
    const code = `HYA-${body}`;
    const clash = await prisma.workerProfile.findUnique({ where: { referralCode: code } });
    if (!clash) return code;
  }
  throw new Error('could not allocate a referral code');
}
