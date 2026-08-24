# Crewzo Dispatch Layer — Build Plan

> **Version** v0.2 · **Date** 2026-08-24 · **Status** Approved to detail, no code written yet
> **Rendered version:** https://claude.ai/code/artifact/eec6af17-0b8d-4edd-909a-7dfffec2ba64

Turning the existing browse-and-book marketplace into an admin-controlled dispatch
system: broadcast job offers, worker interest, geo-verified site arrival, and a two-OTP
work handshake.

---

## Contents

1. [The short version](#the-short-version)
2. [What already exists](#1--what-already-exists)
3. [The core change: marketplace to dispatch](#2--the-core-change-marketplace-to-dispatch)
4. [New tables](#3--new-tables)
5. [The full job lifecycle](#4--the-full-job-lifecycle)
6. [Notifications](#5--notifications)
7. [Geolocation](#6--geolocation)
8. [OTP handshake](#7--otp-handshake)
9. [Feedback](#8--feedback)
10. [Revenue model](#9--revenue-model)
11. [App or website](#10--app-or-website)
12. [Cost](#11--cost)
13. [Build order](#12--build-order)
14. [Where I would push back](#13--where-i-would-push-back)
15. [Decisions locked](#14--decisions-locked)

---

## The short version

This is not a new set of software. Roughly **65% of what was described already exists**
in this repo — two Flutter apps, three backends, an admin portal, an SMS gateway. What is
actually being asked for is a **dispatch layer** bolted onto the existing booking system,
plus push notifications (which do not exist yet at all).

Building it as a fresh product set would mean re-writing auth, worker profiles, the admin
portal and both apps for no gain. The decision taken is to **extend Crewzo** and version
it as v2. That is roughly **11–13 weeks** of build versus 6+ months greenfield.

Two things, if built literally as first described, will hurt in production — an admin gate
on *every* booking, and broadcasting *every* job to *every* worker. Both are covered in
[§13](#13--where-i-would-push-back).

Four scope questions are settled and folded in: extend rather than rebuild, all three
roles take work directly, filtered broadcast, and a flat service charge with wages left
off-platform. That last one has consequences well beyond the payment screen — see
[§9](#9--revenue-model).

---

## 1 — What already exists

Measured against what the new flow needs:

| Component | Stack | Reusable for dispatch? |
|---|---|---|
| `workers-portal-backend` | Node / Express | **Keep.** Auth, workers, bookings, feedback, grievances all land here. Becomes the dispatch engine. |
| `admin_portal` | FastAPI + React | **Extend.** Today it only *lists* bookings by proxy. Needs approve / assign / override screens — the biggest single piece of new UI. |
| `smart_workers_customer` | Flutter | **Extend.** Booking flow changes from "pick a worker" to "describe a job". Add OTP display + live job status. |
| `workers_portal_app` | Flutter | **Extend.** Already ships `flutter_map` + `latlong2`. Needs offers inbox, geofence check-in, OTP entry. |
| `worker_website` | FastAPI + React | **Keep as-is.** Registration and admin verification stay unchanged. |
| `sms-gateway` | Node | **Keep.** Becomes the fallback channel for workers with no data or no app. |
| Push notifications | — | **Missing.** No FCM in either `pubspec.yaml`. Everything here hangs off this. Build first. |
| Roles beyond "worker" | — | **Missing.** No agent or supervisor concept anywhere in the schema. |
| Job geolocation | — | **Missing.** Bookings store `address` as free text. No geofence is possible today. |

---

## 2 — The core change: marketplace to dispatch

Today the customer picks a specific worker and a booking row is created against that
worker immediately. The new flow inverts this: the customer describes a *need*, and the
worker is decided later, by admin, out of a pool of volunteers.

Those are two genuinely different objects, and cramming both into the existing `bookings`
table is where this design goes wrong. The fix:

- **A job request** is what the customer creates. Trade, date, duration, address *with a
  map pin*, notes. It has no worker.
- **A job offer** is one row per notified worker per request. This is the notification's
  audit trail — sent, seen, interested, declined, expired, admin-approved, admin-rejected.
- **A booking** is created only when admin assigns a worker. It stays the record
  everything downstream already points at, so feedback and grievances keep working
  untouched.

Keeping the old direct-booking path alive alongside this is also possible — a customer who
already trusts a particular worker skips the broadcast and goes straight to admin review.
Worth having; costs almost nothing once the state machine exists.

---

## 3 — New tables

| Table | Purpose | Notable columns |
|---|---|---|
| `job_requests` | Customer's stated need, pre-assignment | `status, trade, lat, lng, geofence_m, scheduled_at, days, admin_note, approved_by, approved_at` |
| `job_offers` | One row per notified recipient. Drives the popup and the audit trail. | `request_id, recipient_id, recipient_role, state, sent_at, seen_at, responded_at, expires_at, admin_decision` |
| `job_events` | Append-only timeline. Never update in place — disputes are settled from this. | `booking_id, actor_id, type, lat, lng, accuracy_m, is_mocked, payload, created_at` |
| `work_otps` | Start + completion codes, hashed | `booking_id, kind, code_hash, attempts, expires_at, consumed_at` |
| `devices` | FCM tokens per user per device | `user_id, role, fcm_token, platform, last_seen_at` |
| `user_roles` | Worker / agent / supervisor. All three accept work directly, so this is a priority tier, not a delegation tree — which keeps the offer logic simple. | `user_id, role, tier, districts, trades` |
| `service_charges` | What Crewzo bills the customer per booking. Wages are not modelled here — see §9. | `booking_id, tier, amount, gst, status, gateway_ref, charged_at, refunded_at` |

> **Migrate to Postgres before this ships.** The Node backend still runs SQLite by
> default. Concurrent offer responses and the append-only event log both want real
> transactions and proper row locking. Railway Postgres is already provisioned — it is a
> `DATABASE_URL` away.

---

## 4 — The full job lifecycle

The two **GATE** stages are the admin gates. Nothing crosses them without a human decision.

| Stage | Actor | What happens |
|---|---|---|
| `submitted` | Customer | Describes the job, drops a map pin, picks date and duration. No worker involved yet. |
| `admin_review` — **GATE 1** | Admin | Approves, edits, or rejects. Only on approval does anything reach a worker. Rejection returns a reason to the customer. |
| `broadcast` | System | One `job_offer` row per *matched* worker, agent and supervisor — filtered by trade, district and availability, ordered by rating and distance. Each row fires a push notification and an in-app popup. Offers carry an expiry, and admin has a widen-the-broadcast button. |
| `collecting_interest` | Workers | Each recipient responds `interested` or `declined`. Silence becomes `expired`. Admin watches the count live. |
| `assigning` — **GATE 2** | Admin | Sees each interested worker beside their profile — trade, rating, past jobs, distance, documents — and approves exactly one. The rest are notified they were not selected. |
| `assigned` | System | Booking row created. **Start OTP** generated and shown in the customer app on that booking. Worker gets the address and the pin. |
| `en_route` | Worker | Optional. Worker taps "on my way"; customer sees an ETA. One location sample logged. |
| `in_progress` | Worker | Worker taps "start work". Server checks three things together: correct start OTP, device inside the geofence, and GPS accuracy good enough to trust. All three pass, or the start is refused with the specific reason. |
| `worker_completed` | Worker | Marks the work done, optionally with photos. **Completion OTP** is generated at this moment — not earlier — and appears in the customer app. |
| `completed` | Both | Customer reads the completion OTP aloud, worker enters it. Location logged again. Job closes. |
| `feedback_window` | Both | Both sides rate each other. Ratings stay hidden until both submit or seven days pass — this is what stops retaliatory reviews. |

### Escape hatches to build, not discover later

- **Nobody shows interest.** Offer window expires with zero takers → admin is alerted, can
  widen the broadcast or call the customer. Without this, requests silently rot.
- **Customer absent at completion.** They cannot read out an OTP they are not there to see.
  Worker raises "customer unavailable" → admin verifies by phone and force-completes,
  logged as an override.
- **Assigned worker no-shows.** Admin un-assigns and re-opens the request to the remaining
  interested workers without a fresh broadcast.
- **Mid-job cancellation.** Both sides need it, with a reason, and it must not corrupt the
  ratings.

---

## 5 — Notifications

Two delivery paths, because "popup" means different things depending on whether the app is
open.

- **App in foreground** — a WebSocket (or SSE) connection pushes the offer and the app
  renders a modal immediately. This is the real popup.
- **App backgrounded or killed** — Firebase Cloud Messaging delivers a high-priority data
  notification. Tapping it opens the same modal. FCM is free at any volume Crewzo will hit.
- **No app, no data** — the existing SMS gateway sends a short message. Kerala has coverage
  gaps, and older agents may not install anything.

One rule matters more than the transport choice: **a notification is a side effect of
writing a `job_offer` row, never a standalone send.** Push delivery is unreliable and
duplicates happen. If the row is the truth and the push is only a nudge, a worker who
missed the push still finds the offer waiting in their inbox, and you can prove afterwards
who was told what and when.

> **Also notify on the admin decisions.** A worker who taps "interested" and hears nothing
> for two hours assumes the app is broken. Push on approve, on reject, and on offer expiry.

---

## 6 — Geolocation

### Checkpoints, not continuous tracking

Sample location at four moments — offer accepted, en route, work start, work complete —
plus a low-frequency heartbeat while a job is `in_progress` and the app is open.
Continuous background tracking costs battery complaints, a Play Store background-location
review with a mandatory video demo, and a privacy exposure that is not needed. Checkpoints
answer the actual question: was he there when he said he was.

### The customer must drop a pin

A geofence needs coordinates. Today bookings hold a free-text address, which cannot be
verified against anything. Adding a map pin step to the customer booking flow is a hard
prerequisite — with `flutter_map` and OpenStreetMap it costs nothing in licensing.
Suggested radius **120 m**, tunable per job, because phone GPS in a dense Kerala town
realistically lands within 10–50 m.

### Treat GPS as evidence, not as a lock

Mock-location apps are trivial to install. Android exposes `Position.isMocked` — record it
and flag the job to admin, but do not hard-block, because false positives will strand
honest workers on real sites. The genuinely strong control is the completion OTP: the
customer physically has to hand it over. Geo catches sloppiness; the OTP catches fraud.

---

## 7 — OTP handshake

|  | Start OTP | Completion OTP |
|---|---|---|
| **Created** | On assignment | Only when worker marks the work done |
| **Shown to** | Customer, on that booking screen | Customer, on that booking screen |
| **Entered by** | Worker, at the site | Worker, after the customer inspects |
| **Proves** | Worker actually arrived and met the customer | Customer saw the finished work and released it |
| **Also checks** | Inside geofence + GPS accuracy threshold | Location logged; no gate |
| **Validity** | Job window ± 2 h | 30 min, regenerable by the customer |

Non-negotiables on both: 6 digits, stored as a hash, bound to one booking id, capped at 5
attempts then locked pending admin reset, and — critically — **never delivered to the
worker through any channel.** No SMS, no push, no email. The moment a code reaches the
worker's device by itself, both controls are worthless.

---

## 8 — Feedback

The `feedback` table already exists for customer→worker. Add the reverse direction, and
make both blind until either both parties have submitted or seven days elapse.

Worker ratings should then feed back into the broadcast: when a request goes out, order and
prioritise recipients by rating, completion rate, and distance. That is what stops the
highest-rated workers from drowning in offers they never see, and it is the cheapest
quality lever available.

---

## 9 — Revenue model

**Decision taken:** the customer pays Crewzo a **service charge for the booking**. Wages
are negotiated and settled **directly between customer and worker**, off-platform, and
per-worker rates come off the product entirely.

That is a clean, defensible model — Crewzo sells dispatch and trust, not labour arbitrage.
It also has four consequences that reach much further into the build than a payments
screen.

| Money | Who sets it | Where it flows | Does Crewzo see it? |
|---|---|---|---|
| **Service charge** | Crewzo, by tier | Customer → Crewzo, on assignment | **Yes — the revenue** |
| Wages | Negotiated customer ↔ worker | Direct, cash or UPI | No |
| Materials, travel, overtime | Direct | Direct | No |

### 1. A percentage is not available

If the wage never passes through the system, there is no number to take a cut of.
Commission is off the table by construction. The service charge therefore has to be a
**flat fee, tiered** — by trade, by number of days, possibly by district. Put those tiers
in admin configuration, not in code, because they will be tuned repeatedly in the first six
months.

### 2. Published wages have to come out of the product

`daily_rate` currently appears **95 times across 26 files** — worker cards, booking
summary, the existing `payment_screen.dart`, admin profile modal, the worker registration
form, both Flutter apps and the Python worker backend model. This is not a one-line change
and should not be scheduled as one.

Recommendation: *keep the column* and strip only the customer-facing surfaces. An
indicative rate range is genuinely useful to admin when deciding which interested worker to
assign, and to the worker as a profile field. Reword it in the registration form from "your
daily rate" to "your indicative range", mark it admin-visible, and remove it from every
customer view.

### 3. Charge at assignment, not at submission

The customer should not pay before they know they actually have a worker. Billing the
moment admin assigns removes almost every refund case that would otherwise have to be built
and staffed: if nobody takes the job, nothing was ever charged. The remaining refund paths
are narrow — assigned worker no-shows, or the customer cancels before start — and both can
be admin-triggered.

Practically: UPI through Razorpay is the right collection method for Kerala. UPI is
typically zero-rated, cards and netbanking run around 2% plus GST — worth re-checking
current rates before committing, and worth nudging customers toward UPI in the payment
screen.

### 4. The completion OTP no longer protects money

In an escrow model, OTP2 would gate the release of funds. Here the wage is cash between two
people standing in a room, so it does not. Keep the OTP — it is still proof of completion,
dispute evidence and the trigger for the ratings window — but stop thinking of it as
payment protection, because it is not, and designing as though it is will lead to the wrong
escalation flows.

> **The structural risk in this model is disintermediation.** A one-time booking fee plus
> direct wage settlement gives both parties an obvious incentive to exchange phone numbers
> once and never book through the platform again. This is the biggest threat to the
> business, not to the software, and it is worth designing against from day one: keep the
> fee low enough that evading it is not worth the effort; make repeat booking demonstrably
> faster than a phone call (saved sites, one-tap rebook of a known worker); attach the
> things they would lose by going direct — verified ratings, job history, dispute support,
> insurance if it is ever added — to platform bookings only; and track the repeat-booking
> ratio per worker as the early warning signal.

> **Still open:** is there a worker-side charge too — registration fee, monthly
> subscription, or a per-job listing fee? Only the customer side has been specified. It
> changes the worker onboarding flow, so it is worth answering before phase one.

---

## 10 — App or website

Splits by audience rather than resolving to a single answer.

| Audience | Verdict | Why |
|---|---|---|
| **Worker / agent** | **Native app only** | Background push, geolocation with accuracy metadata, and mock-location detection. A web app cannot do the last one at all, and iOS web push cannot be relied on. The Flutter app already exists — this is the cheap path, not the expensive one. |
| **Customer** | **App + thin web** | The app carries push and the OTP screen. The web page removes install friction for a first-time booker, which matters enormously for acquisition. `customer_website` already exists; give it booking, status and OTP view, and let the app own the rest. |
| **Admin** | **Web only** | Dense tables, side-by-side profile comparison, long shifts at a desk. Already built. |

> **Android first, iOS later.** The worker base is on Android almost without exception. iOS
> costs ₹8,300/year plus a real review cycle, and buys very few workers. Ship Android, add
> iOS for the customer app once volume justifies it.

---

## 11 — Cost

Recurring, at pilot scale (under roughly 500 bookings a month):

| Recurring | Notes | Per month |
|---|---|---|
| Railway — 3 backends + Postgres | Already running; Postgres adds a little | ₹2,100 – 3,800 |
| Vercel — 3 static frontends | Free tier is genuinely sufficient | ₹0 |
| Firebase Cloud Messaging | Free at any volume Crewzo will reach | ₹0 |
| Maps — OpenStreetMap + `flutter_map` | Already a dependency. No licence fee. | ₹0 |
| SMS — own Android gateway | Needs one spare handset and a SIM | ≈ ₹300 |
| SMS — Fast2SMS fallback | ₹0.20–0.25 per transactional message | ₹500 – 1,200 |
| Razorpay — service charge collection | UPI typically zero-rated; cards/netbanking ~2% + GST. Applies to the fee only, not to wages. | ≈ 0 – 2% of fees |
| Object storage — Cloudflare R2 | Worker photos and job photos, under 10 GB | ₹0 – 400 |
| **Total** | | **₹2,900 – 5,700** |

One-time:

| One-time | Notes | Cost |
|---|---|---|
| Google Play developer account | Once, forever | ₹2,100 |
| Apple Developer | Only if going iOS. Annual, not one-time. | ₹8,300 / yr |
| TRAI DLT registration | Mandatory in India for branded transactional SMS. Entity + header + template approval. Budget four to six weeks of lead time. | ₹5,000 – 7,000 |

### Build cost

Built in-house, the cost is time rather than cash — roughly **11–13 focused weeks**. For
comparison, quoting this scope out in the Indian market today:

| | Range | Notes |
|---|---|---|
| Freelance pair | ₹4 – 8 L | Two mid-level devs, 3 months. Cheapest, highest delivery risk. |
| Small studio | ₹8 – 14 L | Kerala or Bangalore boutique. Realistic market rate for this scope. |
| Mid agency | ₹18 – 30 L | Process, QA, contracts. Overkill at this stage. |

Those figures are for the dispatch layer only, on top of what already exists. Quoted
greenfield — everything from scratch — the same studios would be at ₹20–40 L. That gap is
the whole argument for extending rather than restarting.

---

## 12 — Build order

Genuinely sequential — each phase is unusable without the one before it. Ship and test each
before starting the next. Total **11–13 weeks**.

| # | Phase | Scope | Effort |
|---|---|---|---|
| 01 | **Foundations** | Postgres migration. New tables. Role tiers for worker, agent and supervisor. Map pin added to the customer booking flow. Published wages stripped from all customer-facing surfaces across both apps and both websites. No visible feature ships here — it is the ground everything else stands on. | 2 – 2.5 wks |
| 02 | **Dispatch core** | Job requests, job offers, the full state machine, and the two admin gates in the admin portal. Testable end to end with notifications faked as email. | 2 – 3 wks |
| 03 | **Notifications** | FCM in both Flutter apps, device token registry, WebSocket channel for the in-app popup, SMS fallback wired to the existing gateway. Fan-out and retry logic. | 1.5 – 2 wks |
| 04 | **Geo + OTP** | Geofenced start, both OTPs, the append-only event log, mock-location flagging, and every escape hatch from §4. The riskiest phase — budget field testing on real handsets in real Kerala towns, not the emulator. | 2 wks |
| 05 | **Service charge, ratings and admin ops** | Tiered service charge collected on assignment via Razorpay UPI, admin-configurable tiers, narrow refund paths. Two-way blind feedback, rating-weighted broadcast ordering, admin dashboards for stuck jobs, overrides and disputes. | 2 wks |
| 06 | **Harden and pilot** | Rotate every production secret. Play Store submission. DLT registration. Then a controlled pilot — one district, ten workers, two weeks — before opening it up. | 2 wks |

---

## 13 — Where I would push back

Five things. The first two decide whether this works at scale; the last three decide
whether it holds together in the field.

1. **An admin gate on every single booking will not survive growth.** At 20 bookings a day
   it is fine. At 200 it is a full-time job for a person who is asleep at 11pm when a
   customer books. Build the gates as described — but add auto-approval rules on day one: a
   returning customer, a standard job type, a value under some threshold, and a worker whose
   profile already matches the requirement all skip the queue and land in an audit log the
   admin reviews later. Same idea on assignment: if only one worker shows interest and they
   are qualified, auto-assign. Keep manual override always available.

2. **Do not notify every worker about every job.** A plumber in Kannur receiving carpentry
   offers from Kollam will mute the app within a week, and then dispatch stops working for
   everyone. Filter the broadcast by trade, district and availability, order by rating and
   distance, and give admin a "widen the broadcast" button for when a request goes
   unanswered. Supervisors and agents can reasonably get a wider feed than individual
   workers.

3. **Do not schedule the wage removal as a small task.** 95 references across 26 files,
   spanning both Flutter apps, both React sites, the Node backend and the Python worker
   backend — including an existing `payment_screen.dart` built around a per-worker rate.
   Half-removing it is worse than not starting: a customer who sees a rate on one screen and
   negotiates a different number on site will file a grievance, and someone will have to
   arbitrate it.

4. **Kerala connectivity will break the completion step.** A worker finishing in a basement
   or a rural interior with no signal cannot submit. The worker app needs an offline queue
   that stores the start and complete events with their timestamp and location, then syncs
   when signal returns — with the server trusting the recorded timestamp, not the arrival
   time.

5. **The revenue model is sound but leaky, and the leak is not technical.** Covered in full
   in §9 — a booking fee with off-platform wages is the easiest model to launch and the
   easiest to route around. Build the retention hooks in the first version, not after the
   repeat rate is noticed falling.

---

## 14 — Decisions locked

Recorded so the build has one source of truth. Anything reopened should be reopened against
this list.

| # | Area | Decision |
|---|---|---|
| 01 | **Scope** | **Extend Crewzo as v2.** No greenfield. Both Flutter apps, all three backends, the admin portal and the SMS gateway carry forward. The dispatch layer is added on top of the existing schema. |
| 02 | **Roles** | **Worker, agent and supervisor all take work directly.** Seniority tiers rather than a delegation hierarchy. Same offer flow for every recipient; the tier affects broadcast priority and ordering, nothing else. Keeps `job_offers` flat. |
| 03 | **Broadcast** | **Filtered, with an admin widen button.** Match on trade, district and availability. Order by rating and distance. Admin widens manually when a request goes unanswered, and gets alerted when the offer window expires with zero takers. |
| 04 | **Revenue** | **Flat service charge to the customer; wages off-platform.** Crewzo bills a tiered booking fee, charged on assignment. Customer and worker negotiate and settle wages directly, and per-worker rates come out of every customer-facing surface. See §9. |
| — | **Still open** | **Is there a worker-side charge?** Registration fee, subscription, or per-job listing fee. Only the customer side has been specified. Answer before phase one, since it changes worker onboarding. |

---

*Plan v0.2 · 2026-08-24 · Four decisions locked · No code written yet.*
