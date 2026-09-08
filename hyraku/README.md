# Hyraku — beta

WhatsApp-first home services for Kerala. Customers book on WhatsApp, workers register on
WhatsApp, and a human assigns every job from a dispatch console.

**hyraku.in · hyraku.com**

---

## Run it

Needs Node 20+. Nothing else — no Docker, no Postgres, no Redis, no Meta account.

```bash
cd hyraku
npm run setup     # install, build the SQLite database, seed 36 Kerala workers
npm run dev       # API on :4000, console on :5173 (opens automatically)
```

Console password: `hyraku`

To start over at any point: `npm run db:reset`

---

## The demo, in order

The screen is split on purpose — WhatsApp on the left, the operator's console on the right.
The point being made is that they are the same system, live.

**1. Website → WhatsApp.** Start on the *Website* tab. Tap **Electrician**. Watch the message
land in the phone on the left. The bot never asks which trade, because the link already said so.

**2. Book the job.** Answer as the customer. Try typing `tomorrow` for the date, and something
nonsensical first to show it recovers rather than dead-ends. Confirm.

**3. It appears in Dispatch.** Switch to the *Dispatch* tab. The request is there within a few
seconds with a reference number, flagged **Urgent** because it is for tomorrow, sorted to the top.

**4. Assign in one tap.** Hit **Assign**. Workers are already ranked — right trade, nearest,
best rated, not already booked that day, with the reasoning shown. Pick the top one.

**5. Both sides are told.** The customer gets a confirmation with the worker's name and number.
Switch the phone dropdown to that worker and you will see the job offer they received — full
address, customer phone, rate, reference.

**6. Worker registration.** Switch to a fresh number, type `register`. Fill it in, attach any
three photos when asked. The registration appears in *Workers* awaiting review, with the
documents and a timestamped record of the terms they accepted. Approve them — they are told on
WhatsApp, and they are immediately assignable.

**Optional:** tick *"Ask the worker to accept first"* before assigning. The customer is then told
nothing until the worker taps **Accept**. That is the switch for moving off pure admin dispatch.

---

## What is real and what is simulated

Only the transport is simulated. Everything else is the production path.

| | |
|---|---|
| **Real** | Database, schema, booking rules, conversation state machine, worker ranking, assignment, document storage, message log, admin API, template registry, webhook signature verification, media download logic |
| **Simulated** | The delivery of a message to a physical phone |

The simulator injects exactly the `InboundMessage` the Cloud API webhook produces, and renders
the same stored outbound messages that would have been sent. Nothing in `packages/core` knows
which channel it is on.

Going live is `CHANNEL=cloud` plus credentials. No code changes.

---

## Layout

```
hyraku/
├── apps/
│   ├── api/          Express — WhatsApp webhook, simulator, admin API
│   └── console/      React — simulator + dispatch + approvals + site
└── packages/
    ├── core/         The domain. Channel-agnostic.
    │   ├── engine.ts     inbound → dedup → route → flow → replies
    │   ├── flows/        booking, registration, intent routing
    │   ├── dispatch.ts   assignment and the notifications it triggers
    │   ├── ranking.ts    candidate scoring for the console
    │   ├── catalog.ts    Kerala trades and districts
    │   └── storage.ts    documents (local now, R2 later — same API)
    ├── whatsapp/     Cloud API client, webhook parsing, template registry
    └── db/           Prisma schema, client, seed
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

---

## Going live

Ordered by lead time. The first item is the long pole and needs starting before anything else.

**1. Meta — start now, takes weeks.**
- Business verification
- WhatsApp Business Account and a dedicated number, not one on personal WhatsApp
- Display name approval
- Submit the six templates in `packages/whatsapp/src/templates.ts`, English and Malayalam

**2. Infrastructure**
- Postgres — change `provider` and `url` in `schema.prisma`, run `prisma migrate dev`. No model
  changes; enums and arrays are already modelled as strings for exactly this.
- Cloudflare R2 — swap the two private functions in `core/src/storage.ts`. The public API and
  every caller stay as they are.
- Set the retention policy on the bucket **before** the first Aadhaar image arrives.

**3. Switch the channel**

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
- **Payments.** Not modelled. A Razorpay link in chat is the likely shape.
