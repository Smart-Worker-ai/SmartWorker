import { prisma } from '@hyraku/db';
import type { FlowContext, OutboundMessage } from '../types.js';
import { buttons, text } from '../types.js';
import { matchTrade, tradeLabel } from '../catalog.js';
import { formatDate } from '../dates.js';

// Intent routing. Everything arrives here first — either a tapped button, or
// the text a wa.me deep link prefilled, or something the person typed.
//
// The deep link is the important path: the website already knows what they
// clicked, so it hands that context over in the message body and the bot skips
// straight past the questions it would otherwise have to ask.

// Order of precedence matters more than the patterns do. "I want to register as
// a worker" contains "want", which reads as booking intent — so the register
// signals have to be unambiguous and checked first, or the site's own
// "Work with us" deep link routes people into the booking flow.
const REGISTER_WORDS =
  /\b(register|registration|sign\s?-?up|signup|join)\b|work with us|work for you|രജിസ്റ്റർ/i;
const BOOK_WORDS = /\b(book|booking|need|want|hire|service|help|repair|fix)\b/i;
const STATUS_WORDS = /\b(my (bookings?|jobs?|requests?)|status|booked)\b/i;

export async function routeIntent(ctx: FlowContext): Promise<OutboundMessage[]> {
  const reply = ctx.input.replyId;
  const body = (ctx.input.text ?? '').trim();

  if (reply === 'book') return enter(ctx, 'booking');
  if (reply === 'register') return enter(ctx, 'registration');
  if (reply === 'my_jobs') return myJobs(ctx);

  if (body) {
    // Deep links can name a specific worker: "...book HY-000042".
    const uid = body.match(/\bHY-\d{6}\b/i)?.[0];
    if (uid) ctx.data.requestedWorkerUid = uid.toUpperCase();

    const trade = matchTrade(body);

    if (REGISTER_WORDS.test(body)) return enter(ctx, 'registration');
    if (STATUS_WORDS.test(body)) return myJobs(ctx);
    if (BOOK_WORDS.test(body) || trade || uid) {
      if (trade) ctx.data.trade = trade.id;
      return enter(ctx, 'booking');
    }
  }

  return greeting(ctx);
}

function enter(ctx: FlowContext, flowId: string): OutboundMessage[] {
  ctx.data.__enterFlow = flowId;

  if (flowId === 'booking' && ctx.data.trade) {
    return [text(`Got it — you need a ${tradeLabel(ctx.data.trade)}. Just a few quick questions.`)];
  }
  if (flowId === 'registration') {
    return [
      text(
        'Welcome to Hyraku. Let us get you registered as a worker.\n\n' +
          'It takes about two minutes, and you will need photos of your Aadhaar and bank passbook ready.'
      ),
    ];
  }
  return [];
}

function greeting(ctx: FlowContext): OutboundMessage[] {
  const hello = ctx.name ? `Hello ${ctx.name.split(' ')[0]}!` : 'Hello!';
  return [
    buttons(
      `${hello} This is *Hyraku* — verified electricians, plumbers, carpenters and more across Kerala.\n\nWhat would you like to do?`,
      [
        { id: 'book', title: 'Book a service' },
        { id: 'register', title: 'Work with us' },
        { id: 'my_jobs', title: 'My bookings' },
      ]
    ),
  ];
}

async function myJobs(ctx: FlowContext): Promise<OutboundMessage[]> {
  const jobs = await prisma.jobRequest.findMany({
    where: { customerId: ctx.userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      assignments: {
        where: { status: { in: ['proposed', 'accepted'] } },
        include: { worker: { include: { user: true } } },
      },
    },
  });

  if (jobs.length === 0) {
    return [
      buttons('You have no bookings yet.', [{ id: 'book', title: 'Book a service' }]),
    ];
  }

  const lines = jobs.map((j) => {
    const worker = j.assignments[0]?.worker;
    const who = worker ? `\n   Worker: ${worker.user.name} (${worker.user.phone})` : '';
    return (
      `*${j.refNo}* — ${tradeLabel(j.trade)}\n` +
      `   ${formatDate(j.preferredDate)} · ${j.town}\n` +
      `   Status: ${prettyStatus(j.status)}${who}`
    );
  });

  return [
    buttons(`Your recent bookings:\n\n${lines.join('\n\n')}`, [
      { id: 'book', title: 'Book another' },
    ]),
  ];
}

export function prettyStatus(status: string): string {
  const map: Record<string, string> = {
    new: 'Finding you a worker',
    assigning: 'Finding you a worker',
    assigned: 'Worker assigned',
    confirmed: 'Confirmed',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status;
}
