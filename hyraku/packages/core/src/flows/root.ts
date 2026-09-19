import { prisma } from '@hyraku/db';
import type { FlowContext, OutboundMessage } from '../types.js';
import { buttons, text } from '../types.js';
import { matchTrade, serviceAreaLabel, tradeLabel } from '../catalog.js';
import { formatDate } from '../dates.js';
import { addToWaitlist, bookingsOpen } from '../launch.js';

// Intent routing. Everything arrives here first — either a tapped button, or
// the text a wa.me link or Click-to-WhatsApp ad prefilled, or something typed.
//
// The prefilled text is the important path: the ad or the website already knows
// what they clicked, so it hands that context over in the message body and the
// bot skips straight past the questions it would otherwise have to ask.
//
// Before launch, booking intent does not start a booking. Hyraku recruits its
// workers first, so a customer who arrives early gets a clear "not yet" and the
// offer of a message on launch day — never a booking nobody can fulfil.

// Order of precedence matters more than the patterns do. "I want to register as
// a worker" contains "want", which reads as booking intent — so the register
// signals have to be unambiguous and checked first, or the site's own
// "Work with us" link routes people into the booking flow.
const REGISTER_WORDS =
  /\b(register|registration|sign\s?-?up|signup|join)\b|work with us|work for you|രജിസ്റ്റർ/i;
const BOOK_WORDS = /\b(book|booking|need|want|hire|service|help|repair|fix)\b/i;
const STATUS_WORDS = /\b(my (bookings?|jobs?|requests?)|status|booked)\b/i;

export async function routeIntent(ctx: FlowContext): Promise<OutboundMessage[]> {
  const reply = ctx.input.replyId;
  const body = (ctx.input.text ?? '').trim();
  const open = await bookingsOpen();

  if (reply?.startsWith('notify_launch')) return notifyAtLaunch(ctx, reply.split(':')[1]);
  if (reply === 'book') return open ? enter(ctx, 'booking') : preLaunch();
  if (reply === 'register') return enter(ctx, 'registration');
  if (reply === 'my_jobs') return myJobs(ctx);

  if (body) {
    // Links can name a specific worker: "...book HY-000042".
    const uid = body.match(/\bHY-\d{6}\b/i)?.[0];
    if (uid) ctx.data.requestedWorkerUid = uid.toUpperCase();

    const trade = matchTrade(body);

    if (REGISTER_WORDS.test(body)) return enter(ctx, 'registration');
    if (STATUS_WORDS.test(body)) return myJobs(ctx);
    if (BOOK_WORDS.test(body) || trade || uid) {
      if (!open) return preLaunch(trade?.id);
      if (trade) ctx.data.trade = trade.id;
      return enter(ctx, 'booking');
    }
  }

  return greeting(ctx, open);
}

function enter(ctx: FlowContext, flowId: string): OutboundMessage[] {
  ctx.data.__enterFlow = flowId;

  if (flowId === 'booking' && ctx.data.trade) {
    return [text(`Got it — you need a ${tradeLabel(ctx.data.trade)}. Just a few quick questions.`)];
  }
  if (flowId === 'registration') {
    return [
      text(
        'Welcome to Hyraku! Registering as a worker is completely free.\n\n' +
          'It takes about two minutes, and you will need photos of your Aadhaar and bank passbook ready.'
      ),
    ];
  }
  return [];
}

function preLaunch(trade?: string): OutboundMessage[] {
  const want = trade ? `a ${tradeLabel(trade).toLowerCase()}` : 'a worker';
  return [
    buttons(
      `Thanks for reaching out about ${want}!\n\n` +
        `Hyraku is launching soon in *${serviceAreaLabel()}*. We're building our team of verified workers first, ` +
        `so bookings aren't open just yet.\n\n` +
        `Shall we message you here the day bookings open?`,
      [
        // The trade rides in the button id: nothing about this chat is stored
        // until they tap, so this is the only place to keep it.
        { id: `notify_launch:${trade ?? ''}`, title: 'Yes, notify me' },
        { id: 'register', title: 'I want to work' },
      ]
    ),
  ];
}

async function notifyAtLaunch(ctx: FlowContext, trade?: string): Promise<OutboundMessage[]> {
  await addToWaitlist({
    phone: ctx.phone,
    userId: ctx.userId,
    role: 'customer',
    reason: 'bookings_closed',
    district: null,
    trade: trade || null,
  });
  return [
    text(
      `Done — we'll message you here as soon as bookings open in ${serviceAreaLabel()}.\n\n` +
        `If you know a good electrician, plumber or carpenter, send them our way — registering is free.`
    ),
  ];
}

function greeting(ctx: FlowContext, open: boolean): OutboundMessage[] {
  const hello = ctx.name ? `Hello ${ctx.name.split(' ')[0]}!` : 'Hello!';

  if (!open) {
    return [
      buttons(
        `${hello} This is *Hyraku* — verified electricians, plumbers, carpenters and more, ` +
          `launching soon in ${serviceAreaLabel()}.\n\n` +
          `We're building our team of workers right now. What would you like to do?`,
        [
          { id: 'register', title: 'Work with us' },
          { id: 'notify_launch:', title: 'Notify me at launch' },
        ]
      ),
    ];
  }

  return [
    buttons(
      `${hello} This is *Hyraku* — verified electricians, plumbers, carpenters and more in ${serviceAreaLabel()}.\n\nWhat would you like to do?`,
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
      // Only accepted work. A proposed assignment is not a promise we get to
      // make, and naming a worker who has not agreed yet is how a customer
      // ends up ringing someone who never took the job.
      assignments: {
        where: { status: 'accepted' },
        include: { members: { include: { worker: { include: { user: true } } } } },
      },
    },
  });

  if (jobs.length === 0) {
    return [
      buttons('You have no bookings yet.', [{ id: 'book', title: 'Book a service' }]),
    ];
  }

  const lines = jobs.map((j) => {
    const crew = j.assignments[0]?.members ?? [];
    const who = crew.length
      ? `\n   ${crew
          .map((m) => `${m.worker.user.name} (${m.worker.user.phone}) — ₹${m.agreedRate}/day`)
          .join('\n   ')}`
      : '';
    return (
      `*${j.refNo}* — ${j.workersNeeded > 1 ? `${j.workersNeeded} × ` : ''}${tradeLabel(j.trade)}\n` +
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
