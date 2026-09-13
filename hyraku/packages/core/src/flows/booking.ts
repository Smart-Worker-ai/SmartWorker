import { prisma } from '@hyraku/db';
import type { Flow, FlowContext, OutboundMessage } from '../types.js';
import { buttons, exit, fail, list, ok, text } from '../types.js';
import {
  SERVICE_AREAS,
  SERVICE_DISTRICTS,
  TRADES,
  isServiced,
  matchDistrict,
  matchDistrictExact,
  matchTrade,
  serviceAreaLabel,
  tradeLabel,
} from '../catalog.js';
import { formatDate, parseDate } from '../dates.js';
import { addToWaitlist } from '../launch.js';

// The customer booking flow.
//
// Two things it deliberately never does. It never asks which worker or whether
// anyone is free — assignment is a human decision made in the console. And it
// never mentions a rate — pay is agreed between customer and worker on site.
//
// Jobs are only taken in serviced districts. Anyone outside gets a proper
// answer and goes on the waitlist, rather than a booking we cannot fulfil.

const areaId = (town: string) => `area:${town.toLowerCase().replace(/\s+/g, '_')}`;

function allAreas(): { district: string; town: string }[] {
  return SERVICE_DISTRICTS.flatMap((d) => (SERVICE_AREAS[d] ?? []).map((town) => ({ district: d, town })));
}

export const bookingFlow: Flow = {
  id: 'booking',

  order: [
    'name',
    'trade',
    'area',
    'area_other',
    'outside_district',
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
              ...TRADES.map((t) => ({ id: t.id, title: t.label, description: t.labelMl })),
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

    area: {
      id: 'area',
      ask: () =>
        list(
          `Hyraku currently works in *${serviceAreaLabel()} district*.\n\nWhere is the work?`,
          'Choose area',
          [
            {
              title: serviceAreaLabel(),
              rows: [
                ...allAreas().map((a) => ({ id: areaId(a.town), title: a.town })),
                { id: 'area_other', title: `Another area`, description: `Somewhere else in ${serviceAreaLabel()}` },
                { id: 'outside', title: `Outside ${serviceAreaLabel()}`, description: 'A different district' },
              ],
            },
          ]
        ),
      accept: (ctx) => {
        const id = ctx.input.replyId;
        if (id === 'area_other') return ok({}, 'area_other');
        if (id === 'outside') return ok({}, 'outside_district');

        const picked = allAreas().find((a) => areaId(a.town) === id);
        if (picked) return ok({ district: picked.district, town: picked.town }, 'date');

        // Typed instead of tapped.
        return placeFromText(ctx, 'Please choose an area from the list.');
      },
    },

    area_other: {
      id: 'area_other',
      ask: () => text(`Which town or area in ${serviceAreaLabel()}? Type the name.`),
      accept: (ctx) => placeFromText(ctx, 'Please type the town or area name.'),
    },

    outside_district: {
      id: 'outside_district',
      ask: () => text('Which district is the work in?'),
      accept: (ctx) => {
        const d = matchDistrict(ctx.input.text ?? '');
        if (!d) return fail('That does not look like a Kerala district. Try again.');
        if (isServiced(d)) return ok({}, 'area');
        return exit('outside_service_area', { requestedDistrict: d });
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
      ask: (ctx) =>
        buttons(summarise(ctx), [
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

  async onExit(reason, ctx): Promise<OutboundMessage[]> {
    if (reason !== 'outside_service_area') return [text('Thank you — we have noted that.')];

    const district = ctx.data.requestedDistrict as string;

    if (ctx.data.name && !ctx.name) {
      await prisma.user.update({ where: { id: ctx.userId }, data: { name: ctx.data.name } });
    }
    await addToWaitlist({
      phone: ctx.phone,
      userId: ctx.userId,
      role: 'customer',
      reason,
      district,
      trade: ctx.data.trade ?? null,
    });

    return [
      text(
        `Sorry — Hyraku isn't available in ${district} yet.\n\n` +
          `We're starting in ${serviceAreaLabel()} and adding districts as our team of workers grows. ` +
          `We've noted your request, and we'll message you here as soon as we start taking bookings in ${district}.\n\n` +
          `Thank you for thinking of us.`
      ),
    ];
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

/**
 * Typed location. A district name we do not serve ends the flow politely; a
 * serviced district name asks for the area within it; anything else is taken
 * as a town inside the service area.
 */
function placeFromText(ctx: FlowContext, emptyMessage: string) {
  const v = (ctx.input.text ?? '').trim();
  if (v.length < 2) return fail(emptyMessage);

  const district = matchDistrictExact(v);
  if (district && !isServiced(district)) {
    return exit('outside_service_area', { requestedDistrict: district });
  }

  const known = allAreas().find((a) => a.town.toLowerCase() === v.toLowerCase());
  if (known) return ok({ district: known.district, town: known.town }, 'date');

  if (district && isServiced(district)) {
    return ok({ district, town: `${district} City` }, 'date');
  }

  return ok({ district: SERVICE_DISTRICTS[0], town: v.slice(0, 60) }, 'date');
}

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
    `\nYou agree the pay directly with the worker.\n\nShall I send it?`
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
