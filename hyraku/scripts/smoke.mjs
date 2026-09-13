// End-to-end smoke test. Drives the real API through the WhatsApp simulator.
//
//   npm run dev        (or just the API: npm run dev:api)
//   npm run smoke
//
// It resets the phones it uses and flips the bookings switch, so run it against
// a demo database, never a live one. `npm run db:reset` afterwards gives a clean
// demo state again.

const BASE = process.env.HYRAKU_API ?? 'http://localhost:4000';
const KEY = process.env.ADMIN_PASSWORD ?? 'hyraku';

const PHONES = {
  earlyCustomer: '+919846020001',
  customer: '+919846020002',
  outsideCustomer: '+919846020003',
  kasaragodWorker: '+919846020004',
  thrissurWorker: '+919846020005',
  kollamWorker: '+919846020006',
  localWorker: '+919846020007',
};

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// ─── plumbing ────────────────────────────────────────────────────────────────

async function call(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': KEY, ...(opts.headers ?? {}) },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${path} → ${res.status} ${body}`);
  return body ? JSON.parse(body) : null;
}

const send = (phone, msg) => call('/api/sim/send', { method: 'POST', body: JSON.stringify({ phone, ...msg }) });
const thread = (phone) => call(`/api/sim/thread/${encodeURIComponent(phone)}`);
const reset = (phone) => call(`/api/sim/reset/${encodeURIComponent(phone)}`, { method: 'POST' });
const setOpen = (open) => call('/api/admin/settings', { method: 'POST', body: JSON.stringify({ bookingsOpen: open }) });

const outbound = (t) => t.messages.filter((m) => m.direction === 'out');
const last = (t) => outbound(t).at(-1);
const recentText = (t, n = 3) => outbound(t).slice(-n).map((m) => m.body ?? '').join('\n');

let failures = 0;
function check(cond, label) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
}
const section = (title) => console.log(`\n── ${title}`);

async function say(phone, ...steps) {
  for (const s of steps) {
    await send(phone, typeof s === 'string' ? { text: s } : s);
  }
  return thread(phone);
}

async function uploadDocs(phone) {
  for (let i = 0; i < 3; i++) await send(phone, { media: { data: PNG, mimeType: 'image/png' } });
}

// ─── run ─────────────────────────────────────────────────────────────────────

const health = await call('/health');
check(health.ok, `API reachable at ${BASE} (channel: ${health.channel})`);

for (const p of Object.values(PHONES)) await reset(p);
await setOpen(false);

section('Pre-launch: customers are offered a launch message, not a booking');
{
  let t = await say(PHONES.earlyCustomer, 'Hi Hyraku, I want to book an Electrician');
  const m = last(t);
  check(/launching soon/i.test(m.body), 'booking intent gets the pre-launch reply');
  check(t.activeFlow === null, 'no booking flow is started');
  const notify = m.payload.buttons?.find((b) => b.id.startsWith('notify_launch'));
  check(notify?.id === 'notify_launch:electrician', 'the trade survives into the notify button');

  t = await say(PHONES.earlyCustomer, { replyId: notify.id, text: notify.title });
  check(/as soon as bookings open/i.test(last(t).body), 'tapping it confirms they will be told');

  t = await say(PHONES.earlyCustomer, { replyId: notify.id, text: notify.title });
  const cov = await call('/api/admin/coverage');
  check(cov.waitlist.customersForLaunch === 1, 'asking twice is still one waitlist entry');
  check(cov.trades.find((x) => x.trade === 'electrician').customersWaiting === 1, 'coverage shows the waiting electrician customer');

  t = await say(PHONES.earlyCustomer, 'hi');
  const ids = last(t).payload.buttons.map((b) => b.id);
  check(ids.includes('register') && !ids.includes('book'), 'pre-launch greeting leads with registration, offers no booking');
}

section('Registration: a worker who cannot come to Kozhikode');
{
  const t = await say(
    PHONES.kasaragodWorker,
    'I want to register as a worker',
    'Ramesh Kumar',
    { replyId: 'electrician', text: 'Electrician' },
    { replyId: 'kasaragod', text: 'Kasaragod' },
    'Kanhangad'
  );
  const ask = last(t);
  check(/all Hyraku jobs are in \*Kozhikode district\*/.test(ask.body), 'asked about Kozhikode straight after trade and home district');

  const done = await say(PHONES.kasaragodWorker, { replyId: 'cannot_travel', text: 'No' });
  const reply = last(done).body;
  check(/only has work in Kozhikode district/.test(reply), 'told politely there is no work for them yet');
  check(/as soon as we have work in Kasaragod/.test(reply), 'promised a message when Kasaragod opens');
  check(done.activeFlow === null, 'registration ends cleanly');

  const all = await call('/api/admin/workers?status=all');
  check(!all.some((w) => w.phone === PHONES.kasaragodWorker), 'no worker profile was created');
}

section('Registration: a worker who names another district');
{
  const t = await say(
    PHONES.thrissurWorker,
    'register',
    'Joseph Antony',
    { replyId: 'plumber', text: 'Plumber' },
    { replyId: 'thrissur', text: 'Thrissur' },
    'Chalakudy',
    'I want to work in Thrissur only'
  );
  check(/as soon as we have work in Thrissur/.test(last(t).body), 'their stated preference is what goes on the waitlist');
}

section('Registration: from Kollam, via "Other district", willing to travel');
{
  let t = await say(
    PHONES.kollamWorker,
    'Hi Hyraku, I want to register as a worker',
    'Vishnu Prasad',
    { replyId: 'carpenter', text: 'Carpenter' },
    { replyId: 'other', text: 'Other district' },
    'Kollam',
    'Karunagappally',
    { replyId: 'can_travel', text: 'Yes, I can' },
    '34',
    { replyId: 'male', text: 'Male' },
    '11'
  );
  const rateAsk = last(t);
  check(/only for the Hyraku team/i.test(rateAsk.body), 'rate question says only the team sees it');
  check(rateAsk.payload.buttons?.some((b) => b.id === 'skip'), 'and it can be skipped');

  await send(PHONES.kollamWorker, { replyId: 'skip', text: 'Skip' });
  await uploadDocs(PHONES.kollamWorker);
  t = await say(PHONES.kollamWorker, { replyId: 'accept', text: 'I accept' });

  const reg = last(t).body;
  check(/Your Hyraku ID: HY-\d{6}/.test(reg), 'registration completes with an ID');
  check(!reg.includes('₹'), 'confirmation quotes no rate');
  check(/job offers for Kozhikode/.test(reg), 'told their offers will be for Kozhikode');

  const pending = await call('/api/admin/workers?status=pending');
  const me = pending.find((w) => w.phone === PHONES.kollamWorker);
  check(me?.district === 'Kollam', 'home district recorded as Kollam');
  check(me?.serviceAreas === 'Kozhikode', 'works in Kozhikode');
  check(me?.usualDailyRate === null, 'skipped rate stored as nothing, not a default');
  check(me?.documents.length === 3, 'three documents stored');
  check(Boolean(me?.replyWindowClosesAt), 'console knows when the free reply window closes');

  await call(`/api/admin/workers/${me.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'approved' }) });
  const approved = last(await thread(PHONES.kollamWorker)).body;
  check(/approved on Hyraku/.test(approved) && !approved.includes('₹'), 'approval message sent, with no rate');
}

section('Registration: a Kozhikode local is not asked about travelling');
{
  const t = await say(
    PHONES.localWorker,
    'join',
    'Muhammed Shafi',
    { replyId: 'painter', text: 'Painter' },
    { replyId: 'kozhikode', text: 'Kozhikode' },
    'Feroke'
  );
  check(t.stepId === 'age', 'goes straight from town to age');
  await reset(PHONES.localWorker);
}

section('Open bookings');
await setOpen(true);
check((await call('/api/admin/settings')).bookingsOpen === true, 'bookings switch is on');

section('Booking in Kozhikode');
let jobRef;
{
  let t = await say(PHONES.customer, 'Hi Hyraku, I need an electrician', 'Anjali Menon');
  const areaAsk = last(t);
  const rows = areaAsk.payload.sections.flatMap((s) => s.rows);
  check(areaAsk.payload.kind === 'list', 'area is offered as a list');
  check(rows.length <= 10, `list fits WhatsApp's 10-row limit (${rows.length})`);
  check(/Kozhikode district/.test(areaAsk.body), 'says up front that Hyraku works in Kozhikode');

  t = await say(
    PHONES.customer,
    { replyId: 'area:vatakara', text: 'Vatakara' },
    'tomorrow',
    { replyId: 'd1', text: '1 day' },
    '12 Beach Road, near the lighthouse',
    'Two fans and a switchboard'
  );
  const summary = last(t).body;
  check(/Vatakara, Kozhikode/.test(summary), 'summary shows the Kozhikode area');
  check(/pay directly/i.test(summary) && !summary.includes('₹'), 'summary says pay is agreed directly, quotes nothing');

  t = await say(PHONES.customer, { replyId: 'confirm', text: 'Confirm' });
  jobRef = last(t).body.match(/HY-\d{4}/)?.[0];
  check(Boolean(jobRef), `booking created (${jobRef})`);
}

section('Booking from outside Kozhikode');
{
  let t = await say(
    PHONES.outsideCustomer,
    'Hi Hyraku, I want to book a plumber',
    'Rahul Das',
    { replyId: 'outside', text: 'Outside Kozhikode' },
    'Thrissur'
  );
  const reply = last(t).body;
  check(/isn't available in Thrissur yet/.test(reply), 'told Hyraku is not in Thrissur yet');
  check(/starting in Kozhikode/.test(reply), 'told where Hyraku is');
  check(t.activeFlow === null, 'flow ends cleanly');

  t = await say(PHONES.outsideCustomer, 'Hi Hyraku, I need a plumber', { text: 'Malappuram' });
  check(/isn't available in Malappuram yet/.test(last(t).body), 'typing another district at the area question ends politely too');

  t = await say(PHONES.outsideCustomer, 'I need a plumber', 'Kannur Road, near the bus stand');
  check(t.stepId === 'date', '"Kannur Road" is a Kozhikode street, not a request for Kannur');
  await reset(PHONES.outsideCustomer);

  const jobs = await call('/api/admin/jobs?status=all');
  check(!jobs.some((j) => j.customer.phone === PHONES.outsideCustomer), 'no job was created for outside-area requests');

  const cov = await call('/api/admin/coverage');
  const thrissur = cov.districts.find((d) => d.district === 'Thrissur');
  check(thrissur.customersWaiting === 1 && thrissur.workersWaiting === 1, 'Thrissur shows one customer and one worker waiting');
}

section('Dispatch');
{
  const jobs = await call('/api/admin/jobs?status=open');
  const job = jobs.find((j) => j.refNo === jobRef);
  check(job?.district === 'Kozhikode' && job?.town === 'Vatakara', 'job is in Kozhikode, Vatakara');

  const cands = await call(`/api/admin/jobs/${job.id}/candidates`);
  check(cands.length > 0, `${cands.length} electricians ranked`);
  check(cands[0].reasons.includes('Lives in Kozhikode'), `a Kozhikode local ranks first (${cands[0].name})`);
  check(cands.some((c) => c.reasons.some((r) => r.startsWith('Travels from'))), 'workers from further away are still candidates');
  check(!('dailyRate' in cands[0]), 'candidates carry no customer-facing rate field');

  await call(`/api/admin/jobs/${job.id}/assign`, { method: 'POST', body: JSON.stringify({ workerId: cands[0].workerId }) });

  const confirmation = last(await thread(PHONES.customer)).body;
  check(/booking is confirmed/.test(confirmation), 'customer told the booking is confirmed');
  check(!confirmation.includes('₹') && /agree the pay/i.test(confirmation), 'confirmation quotes no rate and says pay is agreed directly');

  const offer = last(await thread(cands[0].phone)).body;
  check(/New job from Hyraku/.test(offer), 'worker received the job');
  check(!offer.includes('₹') && /Agree the pay directly/.test(offer), 'job offer quotes no rate');
}

section('Worker Accept / Decline');
{
  await say(
    PHONES.customer,
    'I need a carpenter',
    { replyId: 'area:mukkam', text: 'Mukkam' },
    'in 4 days',
    { replyId: 'd2', text: '2 days' },
    '7 Hill View, behind the school',
    { replyId: 'skip', text: 'Skip' },
    { replyId: 'confirm', text: 'Confirm' }
  );
  const job = (await call('/api/admin/jobs?status=open')).find((j) => j.trade === 'carpenter' && j.customer.phone === PHONES.customer);
  const cands = await call(`/api/admin/jobs/${job.id}/candidates`);
  await call(`/api/admin/jobs/${job.id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ workerId: cands[0].workerId, responseRequired: true }),
  });

  check(!last(await thread(PHONES.customer)).body.includes(cands[0].name), 'customer not told before the worker accepts');
  const accept = last(await thread(cands[0].phone)).payload.buttons?.find((b) => b.id.startsWith('accept:'));
  check(Boolean(accept), 'offer carries Accept / Decline');
  await send(cands[0].phone, { replyId: accept.id, text: 'Accept' });
  check(last(await thread(PHONES.customer)).body.includes(cands[0].name), 'customer told once they accept');
}

section('Guards that must not regress');
{
  // Scan before any reset below wipes the threads it needs to read.
  const anyRate = [];
  for (const p of [PHONES.earlyCustomer, PHONES.customer]) {
    for (const m of outbound(await thread(p))) if (/₹|\/day/.test(m.body ?? '')) anyRate.push(m.body);
  }
  check(anyRate.length === 0, 'no message sent to a customer mentions a rate');

  const dupe = `smoke.dupe.${Date.now()}`;
  await send(PHONES.customer, { text: 'hello', waMessageId: dupe });
  const before = (await thread(PHONES.customer)).messages.length;
  const replay = await send(PHONES.customer, { text: 'hello', waMessageId: dupe });
  check(replay.processed === false && (await thread(PHONES.customer)).messages.length === before, 'a replayed webhook does nothing');

  await reset(PHONES.customer);
  // "replace" and "cracked" both contain "ac". The old substring match checked
  // "ac" before "tile" and sent this to the AC technicians.
  const t = await say(PHONES.customer, 'Hi Hyraku, I need someone to replace a cracked floor tile');
  check(/need a Mason/.test(recentText(t)), '"replace a cracked tile" is masonry, not AC repair');
  await reset(PHONES.customer);
}

await setOpen(false);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
