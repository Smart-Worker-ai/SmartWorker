# SmartWorker monorepo VAPT (companion)

| Field | Value |
|---|---|
| Target | Rest of `prod-deployed` besides Hyraku |
| Review date | 2–3 November 2026 |
| Source | `prod-deployed` @ `310f778` plus this report commit |
| Review type | White-box source review. No live exploitation. |
| Companion | [Hyraku report](../hyraku/docs/VAPT-REPORT-2026-11-02.md) |

Two review passes of these trees ran out of model quota before they wrote their notes. This file records the findings they had already confirmed in code, plus a short re-check of the highest-severity items. No exploit steps or payloads are included.

**In scope:** `workers-portal-backend/`, `worker_website/`, `admin_portal/`, `customer_website/`, `sms-gateway/`, `smart_workers_customer/`, `workers_portal_app/`, `docs/`, `ops/`, and a repo-wide secrets scan of git-tracked files.

**Out of scope here:** the live Hyraku VPS (covered in the companion report).

---

## Executive summary

These products are not what `hyraku.com` serves today. They still sit on the same `prod-deployed` branch. The worst issues are account-takeover paths in the customer OTP flow, public worker PII, a development-mode SMS-gateway auth skip, and a possible unauthenticated file read if the admin portal serves its frontend from the API process.

**Overall risk for this slice: High** (Critical if the Node OTP SMS path is enabled in a live environment).

| Severity | Count (this companion) |
|---|---|
| Critical | 2 |
| High | 6 |
| Medium | 10 |
| Low / Info | 8 |

---

## Critical

### SW-01 — Email OTP can be sent to a caller-chosen phone

| | |
|---|---|
| Severity | Critical (if SMS is configured) |
| Location | `workers-portal-backend/src/services/auth.service.js:35–52`; `auth.controller.js:17–22` |

`POST /send-otp` takes `email` and optional `phone`. The service emails the OTP to the address, then SMS-es the **same** OTP to `phone` if the caller sent one. It does not check that the phone belongs to that email.

**Impact:** A caller can request an OTP for someone else’s email and have the SMS go to their own phone.

**Required fix:** Never take a destination phone from the request. SMS only to the phone already stored for that email. Rate-limit send and verify. Generate OTP with `crypto.randomInt`, not `Math.random`. Do not return `devOtp` unless a dedicated local flag is set.

---

### GW-01 — SMS gateway skips HMAC in development

| | |
|---|---|
| Severity | Critical if `NODE_ENV=development` on a reachable host |
| Location | `sms-gateway/src/api/middleware/auth.ts:15–18`; `.env.example` defaults to development |

If `config.isDevelopment` is true and `x-signature` is missing, the send/OTP routes run with no HMAC.

**Impact:** Anyone who can reach the gateway can send SMS (open relay / cost abuse).

**Required fix:** Never skip HMAC except behind an explicit `ALLOW_INSECURE_DEV=true` that refuses to start when bound on a non-loopback address. Production `NODE_ENV` must be `production`. Do not copy `.env.example` onto a server as-is.

---

## High

### SW-02 — Public worker API returns mobile, email, and address

| | |
|---|---|
| Severity | High |
| Location | `worker_website/backend/routers/workers.py:132–159`, `430–462` |

`GET /public` and `GET /{worker_id}` use `_worker_to_dict`, which includes `mobile`, `email`, and `address`. The by-id route does not require `approved` / `verified`.

**Required fix:** Public list/detail must return only name, trade, town, rating, photo. Hide contact fields. By-id must apply the same approved/verified filter as the list.

---

### SW-03 — Admin portal catch-all joins the URL onto the filesystem

| | |
|---|---|
| Severity | High (needs verification that `frontend/dist` exists in the running image) |
| Location | `admin_portal/backend/main.py:116–125` |

`os.path.join(dist_path, full_path)` then `os.path.isfile` + `FileResponse`, with no “must stay under dist” check.

**Required fix:** Resolve the path, then reject anything whose real path is not under `dist_path`. Or serve the SPA only from nginx and remove this route.

---

### SW-04 — No OTP attempt cap / weak OTP on the Node backend

| | |
|---|---|
| Severity | High |
| Location | `workers-portal-backend/src/services/auth.service.js:44–47` |

6-digit OTP from `Math.random`, 10-minute life, no recorded attempt limit on verify.

**Required fix:** `crypto.randomInt`, max 5 verifies per code, per-email and per-IP send limits.

---

### GW-02 — OTP rate limits key off the calling container IP

| | |
|---|---|
| Severity | High |
| Location | `sms-gateway/src/services/rateLimiter.ts`; callers do not forward the end-user IP |

Limits are per `req.ip`. Internal backends share one NAT/container IP, so one noisy user (or attacker) can exhaust the platform OTP budget.

**Required fix:** Rate-limit on the destination phone (already partly present) and on an `X-End-User-IP` header that only HMAC-authenticated callers may set. Do not treat the backend’s IP as a person.

---

### GW-03 — OTP body stored in plaintext (DB and Redis jobs)

| | |
|---|---|
| Severity | High |
| Location | `sms-gateway` message persist + queue job payload |

The OTP text is stored on the message row and in the queue job. Compose samples publish Redis without a password.

**Required fix:** Store a hash of the OTP, not the value. Do not keep the body on completed jobs. Require Redis AUTH (and do not publish 6379 on `0.0.0.0`).

---

### APP-01 — Worker app can show a server `devOtp`

| | |
|---|---|
| Severity | High if the API is not in `production` |
| Location | `workers_portal_app/lib/features/auth/otp_screen.dart` (reads `devOtp`); `auth.service.js:54–57` |

The API puts `devOtp` in the JSON when `NODE_ENV !== 'production'`. The app displays it.

**Required fix:** Remove `devOtp` from all responses. Never render a server OTP in the UI.

---

## Medium

### SW-05 — Profile phone can be set to any number

`auth.service.js` `completeProfile` writes caller `phone` with no proof. Combined with Firebase phone login (`verify-firebase-phone` looks up by phone), this can squat or confuse accounts.

**Fix:** Change phone only after a verified OTP/Firebase token for that number.

### SW-06 — Shared `x-admin-secret` in the browser

`worker_website/frontend` admin UI stores/sends the shared admin secret from `sessionStorage`. XSS or a shared PC leaks a god-key used across services.

**Fix:** Real admin login (as Hyraku does). Do not put the inter-service secret in JavaScript.

### SW-07 — Unauthenticated reviews

`workers-portal-backend` feedback create does not require a completed booking with that worker.

**Fix:** Allow a rating only after a completed booking id that belongs to the caller.

### SW-08 — RQ/Redis pickle + default gateway HMAC

`admin_portal/backend/sms_queue.py` talks to Redis without AUTH in the sample config; RQ uses pickle. A reachable Redis is code execution in the worker. HMAC default is a short dev string.

**Fix:** Redis AUTH + TLS, no pickle for untrusted jobs, refuse to start with the default HMAC secret.

### SW-09 — Committed SQLite with PII markers

`worker_website/backend/data/workers_portal.db` is tracked. Text search found phone-like and email-like strings and upload paths.

**Fix:** Remove the file from git (`git rm --cached`), add it to `.gitignore`, purge history if those rows are real people, rotate any session tokens that were in it.

### SW-10 — Rate limits ignore `X-Forwarded-For` on Railway

Uvicorn/Starlette defaults trust only 127.0.0.1. Behind a platform proxy, all clients share one IP (global throttle / lockout).

**Fix:** Configure trusted proxy IPs explicitly.

### SW-11 — DLR webhooks unauthenticated

`sms-gateway` delivery webhooks have no signature check (`WEBHOOK_VERIFY` unused).

**Fix:** Verify provider signatures; ignore unknown message ids.

### SW-12 — Admin JWT also returned in the JSON body

Undermines HttpOnly cookies.

**Fix:** Cookie only; do not echo the token.

### APP-02 — Worker release uses the debug key and the customer `applicationId`

`workers_portal_app/android/app/build.gradle.kts` — debug signing and `com.smartworkers.customer`.

**Fix:** Separate application ids; release keystore not in git.

### SEC-01 — Firebase Android key in git

`smart_workers_customer/android/app/google-services.json` contains a Google `AIza…` key (treat as public but restrict it).

**Fix:** In Google Cloud, restrict the key to that Android app + SHA-1, enable App Check, limit APIs. History still has the key.

---

## Low / Info

- Node CORS reflects origins; auth is bearer, so CSRF risk is lower than cookie apps.
- Account existence leak on 409 register.
- 30-day JWTs with no block-list check.
- Email HTML uses unsanitized names.
- Frontend nginx/Vercel configs lack CSP.
- Flutter apps use HTTPS and `flutter_secure_storage` (good). No `usesCleartextTraffic` / ATS bypass found.
- `sms-gateway` Dockerfiles run as non-root (good).
- `PROJECT_REFERENCE.md` history looks scrubbed (`***REMOVED-SECRET***`); still rotate anything that was ever in a clone.
- Compose Grafana default admin on the sms-gateway sample stack — do not expose that port.
- No `pubspec.lock` tracked for the Flutter apps (reproducible-build gap).

---

## What looked acceptable

- Worker KYC upload path uses magic-byte checks, size cap, and UUID names (`worker_website/backend/storage.py`).
- Customer Flutter tokens go to secure storage, not SharedPreferences.
- SMS gateway HMAC (when enabled) includes timestamp + nonce.
- Postgres init in `ops/` does not embed a live production password in git.
- Hyraku-specific issues remain in the companion report; they were not re-rated here.

---

## Fix order (this slice)

1. SW-01 and APP-01 / `devOtp`.
2. GW-01 — HMAC always on in any deployed gateway.
3. SW-02 — strip PII from public worker JSON.
4. SW-03 — lock the SPA file path (or stop serving files from FastAPI).
5. GW-02 / GW-03 — phone-based limits; hash OTPs; lock Redis.
6. SW-05, SW-06, SW-09.

None of this is on the live Hyraku VPS until those services are deployed. Do not rebuild Hyraku for this companion file alone.
