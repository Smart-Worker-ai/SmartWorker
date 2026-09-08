import { prisma } from '@hyraku/db';
import type { Flow, FlowContext, OutboundMessage } from '../types.js';
import { buttons, fail, list, ok, text } from '../types.js';
import { DISTRICTS, TRADES, matchDistrict, matchTrade, tradeLabel } from '../catalog.js';
import { formatDate, parseDate } from '../dates.js';

// The customer booking flow.
//
// Note what it never asks: which worker, and whether anyone is free. Assignment
// is a human decision made in the console, which is what keeps this flow short
// and keeps the bot incapable of promising something that isn't true.

export const bookingFlow: Flow = {
  id: 'booking',

  order: [
    'name',
    'trade',
    'district',
    'district_other',
    'town',
    'date',
    'duration',
    'address',
    'notes',
    'confirm',
  ],

  steps: {
    name: {
      id: 'name',
      skipIf: (ctx) => Boolean(ctx.name || ctx.data.name),
      ask: () => text("First — what's your name?"),
      accept: (ctx) => {
        const v = (ctx.input.text ?? '').trim();
        if (v.length < 2) return fail('Please type your name.');
        return ok({ name: v.slice(0, 80) });
      },
    },

    trade: {
      id: 'trade',
      skipIf: (ctx) => Boolean(ctx.data.trade),
      ask: () =>
        list('What kind of work do you need?', 'Choose a trade', [
          {
            title: 'Trades',
            rows: [
              ...TRADES.map((t) => ({
                id: t.id,
                title: t.label,
                description: `Typically around ₹${t.typicalRate}/day`,
              })),
              { id: 'other', title: 'Something else', description: 'Tell us in your own words' },
            ],
          },
        ]),
      accept: (ctx) => {
        const id = ctx.input.replyId;
        if (id && id !== 'other' && TRADES.some((t) => t.id === id)) return ok({ trade: id });

        const typed = matchTrade(ctx.input.text ?? '');
        if (typed) return ok({ trade: typed.id });

        if (id === 'other') {
          return fail('No problem — describe the work in a few words and we will match it.');
        }
        return fail('Sorry, we could not match that to a trade. Pick one from the list.');
      },
    },

    district: {
      id: 'district',
      ask: () =>
        list('Which district is the work in?', 'Choose district', [
          {
            title: 'Districts we serve',
            rows: [
              ...DISTRICTS.map((d) => ({ id: d.toLowerCase(), title: d })),
              { id: 'other', title: 'Other district' },
            ],
          },
        ]),
      accept: (ctx) => {
        if (ctx.input.replyId === 'other') return ok({}, 'district_other');

        const picked =
          DISTRICTS.find((d) => d.toLowerCase() === ctx.input.replyId) ??
          matchDistrict(ctx.input.text ?? '');

        if (!picked) return fail('Please choose a district from the list.');
        return ok({ district: picked }, 'town');
      },
    },

    district_other: {
      id: 'district_other',
      ask: () => text('Which district? Type the name.'),
      accept: (ctx) => {
        const d = matchDistrict(ctx.input.text ?? '');
        if (!d) return fail('That does not look like a Kerala district. Try again.');
        return ok({ district: d });
      },
    },

    town: {
      id: 'town',
      ask: (ctx) => text(`Which town or area in ${ctx.data.district}?`),
      accept: (ctx) => {
        const v = (ctx.input.text ?? '').trim();
        if (v.length < 2) return fail('Please type the town or area name.');
        return ok({ town: v.slice(0, 60) });
      },
    },

    date: {
      id: 'date',
      ask: () =>
        text(
          'What day do you need them?\n\n' +
            'You can say *today*, *tomorrow*, a weekday like *Monday*, or a date like *15-04-2026*.'
        ),
      accept: (ctx) => {
        const parsed = parseDate(ctx.input.text ?? '');
        if (!parsed) {
          return fail(
            'Sorry, I could not read that as a date. Try *today*, *tomorrow*, or *15-04-2026*.'
          );
        }
        return ok({
          date: parsed.date.toISOString(),
          dateDisplay: parsed.display,
          isUrgent: parsed.isUrgent,
        });
      },
    },

    duration: {
      id: 'duration',
      ask: () =>
        buttons('How many days of work is it?', [
          { id: 'd1', title: '1 day' },
          { id: 'd2', title: '2 days' },
          { id: 'd3', title: '3 or more' },
        ]),
      accept: (ctx) => {
        const map: Record<string, number> = { d1: 1, d2: 2 };
        const id = ctx.input.replyId;

        if (id && map[id]) return ok({ durationDays: map[id] });
        if (id === 'd3') return fail('How many days? Type a number.');

        const n = Number((ctx.input.text ?? '').replace(/\D/g, ''));
        if (!Number.isInteger(n) || n < 1 || n > 30) {
          return fail('Please give a number of days between 1 and 30.');
        }
        return ok({ durationDays: n });
      },
    },

    address: {
      id: 'address',
      ask: () => text('What is the full address? Include a landmark if it helps them find it.'),
      accept: (ctx) => {
        const v = (ctx.input.text ?? '').trim();
        if (v.length < 8) return fail('Please give a bit more detail so the worker can find it.');
        return ok({ address: v.slice(0, 400) });
      },
    },

    notes: {
      id: 'notes',
      ask: () =>
        buttons('Anything else they should know? Describe the problem, or skip.', [
          { id: 'skip', title: 'Skip' },
        ]),
      accept: (ctx) => {
        if (ctx.input.replyId === 'skip') return ok({ notes: null });
        const v = (ctx.input.text ?? '').trim();
        if (/^(skip|no|none|nothing)$/i.test(v)) return ok({ notes: null });
        return ok({ notes: v.slice(0, 500) });
      },
    },

    confirm: {
      id: 'confirm',
      ask: (ctx) => buttons(summarise(ctx), [
        { id: 'confirm', title: 'Confirm' },
        { id: 'cancel', title: 'Cancel' },
      ]),
      accept: (ctx) => {
        if (ctx.input.replyId === 'confirm') return ok({}, null);
        if (/^(yes|ok|confirm|correct|sari|ശരി)$/i.test((ctx.input.text ?? '').trim())) {
          return ok({}, null);
        }
        return fail('Tap *Confirm* to send this request, or *Cancel* to start over.');
      },
    },
  },

  async complete(ctx: FlowContext): Promise<OutboundMessage[]> {
    const d = ctx.data;

    if (d.name && !ctx.name) {
      await prisma.user.update({ where: { id: ctx.userId }, data: { name: d.name } });
    }

    await prisma.customerProfile.upsert({
      where: { userId: ctx.userId },
      update: { defaultAddress: d.address, district: d.district, town: d.town },
      create: {
        userId: ctx.userId,
        defaultAddress: d.address,
        district: d.district,
        town: d.town,
      },
    });

    const job = await prisma.jobRequest.create({
      data: {
        refNo: await uniqueRefNo(),
        customerId: ctx.userId,
        trade: d.trade,
        district: d.district,
        town: d.town,
        address: d.address,
        preferredDate: new Date(d.date),
        durationDays: d.durationDays ?? 1,
        isUrgent: Boolean(d.isUrgent),
        notes: d.requestedWorkerUid
          ? [`Customer asked for ${d.requestedWorkerUid}`, d.notes].filter(Boolean).join(' — ')
          : d.notes ?? null,
        status: 'new',
        createdVia: 'whatsapp',
      },
    });

    // The promise made here is deliberately about *us*, not about a worker.
    // Nothing is committed on the worker's behalf until a human assigns one.
    const eta = job.isUrgent
      ? 'Because this is for today or tomorrow, we will call you within the hour.'
      : 'We will confirm your worker shortly — usually within a few hours.';

    return [
      text(
        `Done! Your request is in.\n\n` +
          `*Reference: ${job.refNo}*\n` +
          `${tradeLabel(job.trade)} · ${formatDate(job.preferredDate)} · ${job.town}\n\n` +
          `${eta}\n\nQuote ${job.refNo} if you need to reach us about it.`
      ),
    ];
  },
};

function summarise(ctx: FlowContext): string {
  const d = ctx.data;
  const days = d.durationDays === 1 ? '1 day' : `${d.durationDays} days`;
  return (
    `Please check this is right:\n\n` +
    `*Work:* ${tradeLabel(d.trade)}\n` +
    `*When:* ${d.dateDisplay} (${days})\n` +
    `*Where:* ${d.town}, ${d.district}\n` +
    `*Address:* ${d.address}\n` +
    (d.notes ? `*Notes:* ${d.notes}\n` : '') +
    `\nShall I send it?`
  );
}

async function uniqueRefNo(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const candidate = `HY-${Math.floor(1000 + Math.random() * 9000)}`;
    const clash = await prisma.jobRequest.findUnique({ where: { refNo: candidate } });
    if (!clash) return candidate;
  }
  return `HY-${Date.now().toString().slice(-6)}`;
}
