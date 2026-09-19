# Hyraku

Home services in Kerala, launching in **Kozhikode**. Workers register on WhatsApp
or on the web, customers book the same two ways, and a person assigns every job
from a dispatch console.

**hyraku.in**

---

## How Hyraku works

These are business decisions. The code is built around them, so changing one
here means changing it in the code.

- **Workers first.** Hyraku recruits and approves workers before it takes a
  single booking. Bookings open from a switch in the console once there are
  enough workers in each trade.
- **Kozhikode only, to start.** Every job is in Kozhikode district. Workers may
  live anywhere in Kerala. Anyone asking for a booking or for work elsewhere
  gets a polite "not there yet" and goes on a waitlist, which is the evidence
  for where to open next.
- **Registration is free**, for everyone, always. Hyraku's only revenue is a
  flat service charge on a booking, paid by the customer.
- **Three kinds of worker.** An *individual* works alone. An *agent* is a labour
  contractor who supplies a crew. A *supervisor* is an on-site lead. Agents and
  supervisors may also take jobs personally.
- **Everyone is verified.** ID and a Police Verification Certificate, reviewed
  by an admin, before anyone is sent to a customer's home.
- **Rates are set by Hyraku** from a rate card, published on the worker's
  profile, and paid directly to the worker on site. Hyraku never handles the
  money. Demanding more than the published rate, or paying for preferential
  placement, ends the account permanently.
- **Phone-first, not WhatsApp-only.** Identity is a mobile number. WhatsApp is
  one of two ways to reach it; the web is the other. A worker without WhatsApp
  registers on the site and is dispatched by SMS and a phone call.

---

## Affiliation

A worker who registers through an agent or supervisor keeps that link in
`leadId`. It decides two things and nothing else:

1. **Who answers a job offer.** An individual answers for themselves. A crew
   worker's offer goes to their lead.
2. **Attribution** — whose recruiting brought them in.

It grants the lead no authority over that worker's profile, documents or
rating. Affiliation is expected to change, so moves are recorded in
`AffiliationEvent` rather than overwritten.

**Workers with no lead are dispatched by Hyraku directly.** What an agent
otherwise provides is made mechanical for them: a reliability score that feeds
ranking, a three-job probation, and offers that expire and cascade to the next
candidate rather than stalling on someone who is up a ladder.

---

## Who gets a job

| Workers needed | Who is eligible |
|---|---|
| 1 | Anyone approved, including an agent or supervisor working personally |
| 2–3 | Any mix. Individuals need `worksWithCrews` |
| 4+ | A lead takes the job. Opted-in individuals fill the remaining slots |

Everyone needs a current Police Verification Certificate to be dispatched at
all. Affiliation is never a ranking factor — customers get the best available
worker regardless of who recruited them.

---

## Layout

```
hyraku/
├── apps/
│   ├── api/          Express — public API, field portal, WhatsApp webhook
│   └── console/      React — dispatch, approvals, coverage
├── packages/
│   ├── core/         The domain. Transport-agnostic.
│   │   ├── engine.ts     inbound → dedup → route → flow → replies
│   │   ├── flows/        registration, booking, intent routing
│   │   ├── catalog.ts    trades, Kerala districts, and the service area
│   │   ├── launch.ts     bookings switch and waitlist
│   │   ├── dispatch.ts   assignment and the notifications it triggers
│   │   ├── ranking.ts    candidate scoring
│   │   └── storage.ts    documents
│   ├── whatsapp/     Cloud API client, webhook parsing, template registry
│   └── db/           Prisma schema, migrations, client
```

### Decisions worth knowing

**Identity is separate from role.** One `User` keyed on a mobile number, with
`CustomerProfile` and `WorkerProfile` hanging off it. One person can be both — a
plumber who needs an electrician at home.

**Customers are never approved.** The row is created the moment someone makes
contact. Only workers have an approval lifecycle.

**Police verification is a credential, not a status.** It is issued, it goes
stale, it is renewed. Approval never waits for it; dispatch always does. That
way recruiting runs at full speed while certificates are in process.

**The Aadhaar number is never stored** — only the image, masked by preference.
`pvcNumber` is the unique key instead, which makes it what stops a terminated
worker re-registering on a new number.

**An assignment is an offer to one responder for N slots.** `AssignmentMember`
names who actually turns up. That split is what lets a five-worker job be
accepted before its roster exists.

**Rates are snapshotted at acceptance.** A rate-card revision cannot rewrite
what a customer was already quoted.

**`messages.waMessageId` is unique, and the insert is allowed to fail.** Meta
retries webhooks it thinks failed. Reading before writing loses that race.

**`webhook_events` is written before Meta gets its 200.** Meta does not retry a
message it already acknowledged, so a crash between acknowledgement and
processing would otherwise lose it permanently.

**`conversations.lastInboundAt` guards the 24-hour window.** WhatsApp only
allows free-form messages within 24 hours of the person's last message.
`deliver()` checks it and falls back to a template automatically, so no call
site has to remember.

**Documents are persisted on receipt.** Meta's media URLs expire in minutes and
need an auth header even then, so nothing may store a Meta URL.

**The service area is data, not code.** No flow names Kozhikode. They all read
`SERVICE_DISTRICTS`, so opening a district is a catalogue change rather than a
conversation rewrite.

**Turning someone away is a normal ending, not an error.** A flow step can end
the conversation with a reason (`exit(...)`). The flow's `onExit` writes the
waitlist entry and sends a proper reply.

**Bookings open from a database switch**, not an env var, so launch day is a
click rather than a redeploy.

---

## Running it

Needs Node 20+, Postgres 16 and Redis.

```bash
cp .env.example .env    # fill every value — nothing has a default
npm install
npm run db:migrate
npm run dev             # API on :4000, console on :5173
```

---

## Deployment

Two hosts.

```
hyraku.in        main VPS    site, API, webhook, Postgres, Redis
                 admin VPS   console, reachable only over the private tunnel
```

The admin instance runs on its own machine with no public port and no domain.
Postgres listens on the tunnel interface only. Staff and field users live in
separate tables with different authentication factors, so a worker holds no
credential the admin instance will accept.

---

## Opening a new district

Everything reads the service area from `packages/core/src/catalog.ts`:

1. Add the district to `SERVICE_DISTRICTS`.
2. Add its main towns to `SERVICE_AREAS` — at most 8, so a WhatsApp list stays
   within 10 rows.
3. Add its bordering districts to `NEIGHBOURS`, for ranking.

The Coverage tab shows how many approved workers already live there and who is
waiting for it before you open.
