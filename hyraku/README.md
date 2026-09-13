# Hyraku — beta

WhatsApp-first home services, launching in **Kozhikode**. Workers register on WhatsApp, customers
book on WhatsApp, and a human assigns every job from a dispatch console.

**hyraku.in · hyraku.com**

---

## How Hyraku works

These are business decisions, and the code is built around them.

- **Workers first.** Hyraku recruits and approves workers before it takes a single booking.
  Bookings open, from a switch in the console, once there are enough workers in each trade.
- **Kozhikode only, to start.** Every job is in Kozhikode district. Workers can live anywhere in
  Kerala. Anyone asking for a booking or for work somewhere else gets a polite "not there yet"
  and goes on a waitlist, which is the evidence for where to open next.
- **Registration is free.** Workers never pay anything.
- **Hyraku never touches wages.** Pay is agreed and settled directly between customer and worker.
  No rate is ever shown to a customer or put in a message. Workers can optionally tell the team
  their usual rate, to help with matching.
- **Revenue is a flat service charge** (about ₹55 a booking), paid by UPI. *Not built yet* — see
  Known gaps.

---

## Run it

Needs Node 20+. Nothing else — no Docker, no Postgres, no Redis, no Meta account.

```bash
cd hyraku
npm run setup     # install, build the SQLite database, seed 39 workers
npm run dev       # API on :4000, console on :5173 (opens automatically)
```

Console password: `hyraku`

To start over at any point: `npm run db:reset`

To check nothing is broken, with `npm run dev` running: `npm run smoke`. It runs 57 end-to-end
checks through the simulator. It changes the demo data, so run `npm run db:reset` afterwards.

---

## The demo, in order

The screen is split on purpose — WhatsApp on the left, the operator's console on the right.
The point being made is that they are the same system, live.

The console opens in **pre-launch mode** (the amber switch in the top bar). That is the real
starting state, so the demo starts there.

### Part 1 — recruiting workers

**1. Website → WhatsApp.** On the *Website* tab, tap **Register as a worker — free**. The message
lands in the phone on the left.

**2. Register.** Answer as the worker. When asked where you live, pick somewhere other than
Kozhikode — say *Malappuram*. The bot then asks whether you can travel to Kozhikode for work.
Tap **Yes, I can**, skip the rate question, and attach any three photos when asked.

**3. The turn-away.** Reset the phone, register again, and this time tap **No** at the Kozhikode
question — or type *"I want to work in Thrissur"*. You get a polite reply that there's no work there
yet, and nothing is registered. That happens straight after trade and home district, not after
eight questions.

**4. Review.** The *Workers* tab shows the registration with its documents, the time the terms
were accepted, and a **Reply free for …** badge. Approving inside that window is a free
WhatsApp message. After it, WhatsApp needs a paid template, so review quickly. Approve.

**5. Coverage.** The *Coverage* tab answers "do we have enough workers?" per trade — forty painters
and no plumber is not a launch — and shows where workers live and who is waiting outside Kozhikode.

### Part 2 — a customer arrives early

**6. Pre-launch reply.** Back on *Website*, tap **I need a worker**. The bot explains Hyraku is
launching soon and offers to message them on launch day. Tap **Yes, notify me**. They now count
under *Customers waiting for launch*.

### Part 3 — launch day

**7. Open bookings.** Click the switch in the top bar. It turns green.

**8. Book.** Tap **Electrician** on the *Website* tab. The bot skips the trade question and asks for
the area, as a list of Kozhikode towns. Pick one, type `tomorrow` for the date (try something
nonsensical first to show it recovers), and confirm. Nothing anywhere mentions a price.

**9. Try outside Kozhikode.** Pick **Outside Kozhikode** and type *Thrissur*. You get a polite
reply saying Hyraku isn't in Thrissur yet, and no booking is created.

**10. Assign in one tap.** On *Dispatch*, the request is flagged **Urgent** and sorted to the top.
Hit **Assign**. Workers are ranked by trade, then how close they live (in Kozhikode, next door, or
travelling in), rating and load, with the reasoning shown. Pick the top one.

**11. Both sides are told.** The customer gets the worker's name and number and is told to agree
the pay directly. Switch the phone dropdown to that worker to see their job offer.

**Optional:** tick *"Ask the worker to accept first"* before assigning. The customer is then told
nothing until the worker taps **Accept**.

---

## What is real and what is simulated

Only the transport is simulated. Everything else is the production path.

| | |
|---|---|
| **Real** | Database, schema, conversation flows, service-area rules, waitlist, worker ranking, assignment, document storage, message log, admin API, template registry, webhook signature verification, media download logic |
| **Simulated** | The delivery of a message to a physical phone |

The simulator injects exactly the `InboundMessage` the Cloud API webhook produces, and renders
the same stored outbound messages that would have been sent. Nothing in `packages/core` knows
which channel it is on.

Going live is `CHANNEL=cloud` plus credentials. No code changes.

---

## Opening a new district

Everything reads the service area from one place, `packages/core/src/catalog.ts`:

1. Add the district to `SERVICE_DISTRICTS`.
2. Add its main towns to `SERVICE_AREAS` — at most 8, so the WhatsApp list stays within 10 rows.
3. Add its bordering districts to `NEIGHBOURS`, for ranking.

Before opening, the *Coverage* tab shows how many approved workers already live there and who is
waiting for it. The `district_open_for_workers` and `bookings_now_open` templates are for messaging
that waitlist.

---

## Layout

```
hyraku/
├── apps/
│   ├── api/          Express — WhatsApp webhook, simulator, admin API
│   └── console/      React — simulator, workers, coverage, dispatch, site
├── packages/
│   ├── core/         The domain. Channel-agnostic.
│   │   ├── engine.ts     inbound → dedup → route → flow → replies
│   │   ├── flows/        registration, booking, intent routing
│   │   ├── catalog.ts    trades, Kerala districts, and the service area
│   │   ├── launch.ts     bookings switch and waitlist
│   │   ├── dispatch.ts   assignment and the notifications it triggers
│   │   ├── ranking.ts    candidate scoring for the console
│   │   └── storage.ts    documents (local now, R2 later — same API)
│   ├── whatsapp/     Cloud API client, webhook parsing, template registry
│   └── db/           Prisma schema, client, seed
└── scripts/
    └── smoke.mjs     end-to-end checks through the simulator
```

### Decisions worth knowing

**Identity is separate from role.** One `User` keyed on the phone number WhatsApp already
verified, with `CustomerProfile` and `WorkerProfile` hanging off it. One person can be both — a
plumber who needs an electrician at home.

**Customers are never approved.** The row is created the moment someone messages. Only workers
have an approval lifecycle. Opening the chat is the opt-in, and `optInSource` records it.

**The bot never decides who is free.** It captures a request and hands it to a person. It has no
way to promise something untrue, which is why there is no availability logic in it at all.

**`messages.waMessageId` is unique.** Meta retries webhooks it thinks failed. Without that
constraint a retry is a second booking, and WhatsApp is the only booking path there is.

**`conversations.lastInboundAt` guards the 24-hour window.** WhatsApp only allows free-form
messages within 24 hours of the person's last message. `deliver()` checks it and falls back to a
template automatically, so no call site has to remember.

**Documents are persisted on receipt.** Meta's media URLs expire in minutes and need an auth
header even then, so nothing may store a Meta URL.

**Assignments are their own table.** Reassignment is history, not an overwrite — you can always
see who was offered a job and who declined.

**The service area is data, not code.** No flow names Kozhikode. They all read
`SERVICE_DISTRICTS`, so opening a district doesn't mean editing conversations.

**Turning someone away is a normal ending, not an error.** A flow step can end the conversation
with a reason (`exit(...)`). The flow's `onExit` writes the waitlist entry and sends a proper
reply, so nobody is stuck being asked the same question again.

**Turn-aways use strict district matching.** Kozhikode has a Wayanad Road and a Kannur Road. A
typed area only counts as another district when it is just that district's name. Otherwise a
Kozhikode customer on Kannur Road would be told Hyraku doesn't serve them.

**Rates are team-only by construction.** `usualDailyRate` is optional and is read only by the
console. No template has a rate parameter, and the smoke test fails if any message sent to a
customer contains `₹` or `/day`.

**Bookings open from a database switch.** It isn't an env var, so launch day is a click in the
console, not a redeploy.

---

## Going live

Ordered by what blocks what.

**1. Meta accounts — hours, not weeks.**
- Facebook Page, Instagram professional account, Meta Business Portfolio.
- Connect the number to the WhatsApp Cloud API. If it is already on the WhatsApp Business app,
  use **coexistence** (available in India): the phone app keeps working on the same number.
- Submit **business verification** the same day, then let it run. It does *not* block launch.
  Unverified accounts can reply to customer-started chats without limit. Only messages Hyraku
  starts outside a 24-hour window are capped, at 250 people a day, and verification raises that.
- Submit the templates in `packages/whatsapp/src/templates.ts`. **Have a native speaker check
  the Malayalam first.** The two launch announcements are MARKETING category and cost more.
- Meta Verified (the paid badge) is optional and has nothing to do with the above.

**2. A public server.** Meta's webhook needs a public HTTPS address, and today Hyraku runs on a
laptop. Nothing in step 3 works until this exists.

**3. Infrastructure**
- Postgres — change `provider` and `url` in `schema.prisma`, run `prisma migrate dev`. No model
  changes; enums and arrays are already modelled as strings for exactly this.
- Cloudflare R2 — swap the two private functions in `core/src/storage.ts`. The public API and
  every caller stay as they are.
- Set the retention policy on the bucket **before** the first Aadhaar image arrives.

**4. Switch the channel**

```env
CHANNEL=cloud
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_APP_SECRET=...
WHATSAPP_VERIFY_TOKEN=...
```

Point Meta's callback at `POST /webhook/whatsapp`. The `GET` handshake is already implemented.

---

## Known gaps

Deliberately out of scope for the beta, in rough priority order.

- **What registration collects — needs a decision.** It still asks for a **bank passbook** photo,
  plus **age and gender**. Hyraku never pays workers, so the passbook is sensitive financial data
  kept for no purpose: a data-protection risk under the DPDP Act, and one more reason people
  abandon the form. Removing a step is one line in `flows/registration.ts`.
- **The ₹55 service charge.** Not built, and it is needed before bookings open. Planned shape,
  with no payment gateway:
  - A **merchant** UPI ID (PhonePe, Paytm or Google Pay for Business are free), not a personal one.
  - An https page per booking, e.g. `hyraku.in/pay/HY-4821`. It shows the amount and reference, a
    **Pay with UPI** button (`upi://pay?...`) and a QR code. WhatsApp won't make `upi://` links
    tappable, so the link has to be a normal web page.
  - A plain UPI link gives **no payment confirmation**. The customer sends the 12-digit **UTR**
    in chat, and the team checks it against the merchant app. Don't accept screenshots, because
    fake ones are common, and reject any UTR that has already been used.
  - Collect after assignment, and share the worker's contact details once the UTR arrives.
    Today the confirmation sends the worker's phone number straight away.
- **Messaging the waitlist.** The waitlist is recorded and counted, and the templates to message
  it exist, but there's no "notify everyone" button yet. It's needed on launch day.
- **Public website.** The *Website* tab is a stand-in. Production wants Next.js with
  server-rendered per-trade and per-district pages — the site's job is being found on Google and
  handing the visitor to WhatsApp, and a client-rendered SPA gives that up.
- **WhatsApp Flows.** Registration is thirteen questions in sequence. A Flow renders it as one
  native form inside WhatsApp. The step machine here is the same shape a Flow submits, so this
  replaces the transport, not the model.
- **Malayalam and Manglish.** The catalogue carries Malayalam labels and templates are drafted in
  both languages, but intent routing is English keyword matching. Manglish needs a model.
- **Reminders and ratings.** `job_reminder` and `feedback_request` templates exist but nothing
  schedules them. Needs a queue — BullMQ, which the previous platform's `sms-gateway` already had.
- **Admin capacity.** Manual assignment is right for now and caps throughput at one person's
  attention. Ranked candidates are the groundwork for auto-assign when volume demands it.
- **"Ready" means 5 approved workers per trade.** That's a working number in `Coverage.jsx`,
  not a researched one. Adjust it once there's real data on no-shows and demand.
- **From the old dispatch plan** (`docs/dispatch-v2-plan` branch), still worth building: the
  start/finish OTP handshake, geofenced check-in using WhatsApp location messages, and an
  append-only job event log for settling disputes.
