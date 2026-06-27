# Smart Workers — Production Architecture Report

> Derived from the actual codebase (2026-06-26), not generic templates. Every
> recommendation below is justified by a concrete implementation fact, with the
> source file noted in **[brackets]**.

---

## 1. What this system actually is

A three-sided home-services marketplace for Kerala, India:

| Component | Audience | Tech (verified) |
|---|---|---|
| Customer Mobile App | Homeowners booking workers | Flutter + Dio + **Firebase phone auth** `[smart_workers_customer/pubspec.yaml, lib/main.dart]` |
| Worker Portal App | Workers managing jobs | Flutter + Dio, **no Firebase** `[workers_portal_app/pubspec.yaml]` |
| Worker Registration Website | New workers sign up | React 18 + Vite 6 `[worker_website/frontend/package.json]` |
| Admin Panel | Staff approving/managing | React 18 + Vite 6 + Recharts `[admin_portal/frontend/package.json]` |

Behind those four clients run **four backend services** plus **two datastores**:

| Service | Runtime | Port | State | Source |
|---|---|---|---|---|
| `node_backend` (customer API) | Express / Node 20 | 3000 | **SQLite file + in-memory vault** | `workers-portal-backend/` |
| `worker_backend` (registration API) | FastAPI / Py 3.11 | 8000 | Postgres + S3/R2 | `worker_website/backend/` |
| `admin_backend` (admin API) | FastAPI / Py 3.11 | 8001 | **Stateless proxy** | `admin_portal/backend/` |
| `sms-gateway` | TypeScript / Node 20 | 3100 (+worker, +scheduler) | Postgres + Redis | `sms-gateway/` |
| PostgreSQL 16 | — | 5432 | 2 logical DBs | `docker-compose.yml` |
| Redis 7 | — | 6379 | BullMQ queues | `sms-gateway/docker/` |

---

## 2. Per-service deep findings (the facts that drive the design)

### 2.1 `node_backend` — the authoritative customer API

- **Express 4, Node ≥18, ESM** `[workers-portal-backend/package.json]`. Helmet + CORS + Morgan + global error handler `[src/app.js:10-46]`. Graceful SIGINT/SIGTERM with 10s drain `[src/server.js:9-18]`.
- **Database = SQLite via `better-sqlite3` only.** Opens `/data/smartworkers.db`, `journal_mode=WAL`, `foreign_keys=ON` `[src/config/database.js:9-18]`. `pg` is in `package.json` and `DATABASE_URL` is parsed `[env.js:10]` **but never consumed** — Postgres is **not** wired. 8 tables (customers, workers, bookings, feedback, grievances, email_accounts, email_otps, login_attempts) created at boot; **32 workers seeded on first run** `[database.js:129-186]`.
- **Vault documents live in an in-memory `Map`** `[vault.controller.js:5]`, AES-256-GCM encrypt/decrypt with key = SHA-256 of `ENCRYPTION_KEY` `[utils/encryption.js:3-21]`. **Every restart wipes all vault data.**
- **Uploads:** no Multer, no disk. Client is handed a Supabase storage URL (`env.supabaseUrl` referenced but **missing from env.js** — undefined) or a dev localhost URL `[vault.controller.js:7-24]`. Effectively **not production-wired**.
- **Auth:** email OTP (6-digit, 10-min, stored in `email_otps`) `[auth.service.js:35-96]`; email+password (PBKDF2 100k/SHA-512, 5-attempt/15-min lockout) `[auth.service.js:100-171]`; **Firebase phone via local RS256 public-key verification** against `securetoken@system` JWKs — **no firebase-admin SDK**, validates `aud == FIREBASE_PROJECT_ID` `[firebase-verify.service.js:1-76]`. JWT 30-day expiry `[auth.service.js:24]`.
- **SMS:** inline — custom Android gateway first, Fast2SMS fallback `[email.service.js:34-130]`. **Does not call the `sms-gateway` service.**
- **Email:** Nodemailer SMTP, lazy singleton `[email.service.js:1-32]`.
- **No WebSockets, no socket.io, no cron/setInterval background jobs.** Confirmed absent.
- **Admin sync target:** `POST /api/v1/admin/workers` guarded by `x-admin-secret` header `[admin.routes.js:13-20]` — this is what the Python admin & worker backends call.
- Dockerfile: `node:20-alpine`, tini, non-root, `/health` healthcheck `[Dockerfile]`. `railway.toml` present (nixpacks).

> **Architecture consequence:** `node_backend` is **stateful and pinned to one host**. SQLite single-writer + in-memory vault mean **you cannot run a second replica and cannot move it freely between nodes** without a persistent volume. This is the single biggest constraint in the whole system.

### 2.2 `worker_backend` — registration API (the well-built one)

- **FastAPI, uvicorn `--workers ${UVICORN_WORKERS:-2}`, Alembic `upgrade head` on container start** `[Dockerfile:65]`.
- **Real Postgres:** SQLAlchemy async, `DATABASE_URL` → `postgresql+asyncpg`, `pool_size=10, max_overflow=20`; SQLite only as dev fallback; **prod refuses to boot without `DATABASE_URL`** `[db.py:26-52, config.py:92-96]`.
- **Models:** workers, worker_sessions, worker_events, referral_downloads, worker_earnings, **sync_retries** `[models.py:28-189]`. Alembic revisions 0001→0002 (**drop OTP table — "moved to sms-gateway service"**)→0003 (worker UID `SW-XXXXXX`, referral, events, earnings) `[alembic/versions/]`.
- **Object storage:** boto3 S3/R2, presigned URLs (1h), magic-byte file validation via `python-magic`; **prod refuses to boot without S3 config** `[storage.py, security.py:29-71, config.py:110-114]`. Local `uploads/` is dev-only.
- **OTP is delegated to the `sms-gateway`** (OTP table dropped) — `POST /api/auth/request-otp` is slowapi-rate-limited `[routers/auth.py:51]`. Sessions = 24h httpOnly cookie + Bearer fallback.
- **Cross-service sync:** on admin approval, POSTs the worker to `${CUSTOMER_BACKEND_URL}/admin/workers` with `x-admin-secret`; **on failure enqueues to `sync_retries` dead-letter table** `[routers/workers.py:572-627]`. Drain job `python -m workers.sync_drain` with backoff `[30s,60s,5m,15m,1h,6h]`, max 6 attempts `[workers/sync_drain.py]`.
- Referral system: QR PNG data-URL, public download-redirect that awards credits `[routers/workers.py:303-398]`.
- Security: slowapi per-IP, env allow-list CORS (no wildcard in prod), HSTS+nosniff+DENY headers, structlog JSON `[main.py:44-71]`.

> **Consequence:** `worker_backend` is **stateless** (state in Postgres + S3) and **horizontally scalable** — *except* `sync_drain`, which must run as a **single** scheduled instance.

### 2.3 `admin_backend` — stateless proxy

- FastAPI, **no database of its own** `[admin_portal/backend/]`. Fans out via httpx to `CUSTOMER_BACKEND_URL` (node) and `WORKER_BACKEND_URL` (worker) `[routers/*.py]`.
- Auth: `ADMIN_USERNAME` + bcrypt `ADMIN_PASSWORD_HASH`, HS256 JWT (12h), **CSRF double-submit** (`admin_session` httpOnly cookie + `csrf_token` cookie + `X-CSRF-Token` header) `[routers/auth.py:62-98, deps.py:41-71]`; prod refuses default secrets `[config.py:50-83]`.
- Worker approval = orchestration: approve in worker_backend → fetch detail → POST to node_backend `/admin/workers` with `x-admin-secret` `[routers/workers.py:117-147]`.
- slowapi login limit 10/min, env CORS allow-list, structlog. No Alembic (no DB).

> **Consequence:** fully **stateless → trivially horizontally scalable**, but it is a **hard dependency hub** — if node or worker backend is down, admin functions degrade.

### 2.4 `sms-gateway` — production-grade, partially wired

- **Three processes** `[package.json scripts]`:
  - **API** `dist/index.js` :3100 — HMAC-SHA256 auth (`x-signature/x-timestamp/x-nonce`, ±5-min window, Redis nonce replay-cache) `[api/middleware/auth.ts, utils/crypto.ts:60]`. Routes: `/api/v1/otp/{send,verify}`, `/api/v1/messages/{send,:id/status}`, `/api/v1/webhooks/dlr/:provider`, `/health{,/ready,/status}`, `/metrics` `[api/routes]`.
  - **Queue worker** `dist/workers/index.js` — BullMQ consumer, 4 priority queues `sms-gw:{otp,transactional,notification,bulk}`, concurrency OTP=10/others=5 `[queue/index.ts:16-18, sendWorker.ts]`.
  - **Scheduler** `dist/workers/scheduler.js` — **designed single-replica** `[scheduler.ts:2]`; OTP cleanup 60s, DLR timeout 120s, record cleanup 3600s, DLQ monitor 30s.
- **Datastores:** Postgres via Knex — **separate `sms_gateway` DB**, 3 tables (messages, otp_records, audit_events), inline migrations `[models/database.ts:51-136]`; Redis for BullMQ + nonces.
- **5 SMS providers** (Twilio, Plivo, MSG91, TextLocal, Fast2SMS) + Mock, **per-provider/per-country circuit breaker** (5 fails → open, 30s reset) and 3-attempt failover `[providers/, utils/circuitBreaker.ts]`.
- **Observability built in:** Prometheus `/metrics` + a `docker/docker-compose.yml` bundling Prometheus + Grafana `[sms-gateway/docker/docker-compose.yml]`.
- **Integration status:** `worker_backend` delegates OTP to it (table dropped, `SMS_GATEWAY_*` env in DEPLOYMENT.md). `node_backend` **does NOT** — it still uses inline Fast2SMS. **Mixed/half-wired.**

> **Consequence:** if you deploy the gateway, you also commit to **Redis + a second Postgres DB + a scheduler that must never run as >1 replica**. The circuit-breaker state is **in-memory per worker** `[circuitBreaker.ts:19]`, so running multiple queue workers means each has its own breaker view (acceptable, but note it).

### 2.5 Frontends

- Both React 18 + Vite 6, build to static `dist/`. **Two deploy paths exist in-repo:**
  - **Vercel:** `vercel.json` rewrites `/api/:path*` → Railway backend URLs `[*/frontend/vercel.json]`.
  - **nginx container:** `nginx.conf` proxies `/api/` → `worker_backend:8000` / `admin_backend:8001`, plus `/uploads/` `[*/frontend/nginx.conf]`, built by root `docker-compose.yml` on 5174/5175.
- API base is **proxy-relative** (`/api`), so the frontend is portable — the backend URL is decided by Vercel rewrite or nginx, not baked into JS.

### 2.6 Flutter clients

- **Both hardcode** `baseUrl = https://smart-workers-backend-production.up.railway.app/api/v1` `[*/lib/core/constants/api_constants.dart]` → **only talk to `node_backend`**.
- Customer app: Firebase phone OTP → exchanges Firebase ID token for app JWT via `/auth/verify-firebase-phone` `[auth_provider.dart]`.
- **No WebSocket/realtime in either app.** Tokens in `flutter_secure_storage`.

---

## 3. Communication map (verified)

```
Customer App ─┐
Worker App   ─┴─ HTTPS /api/v1 ─────────────▶ node_backend (3000, SQLite)
                                                   ▲   │  x-admin-secret POST /admin/workers
Worker Website (React) ─ /api ─▶ worker_backend ───┘   │
   (8000, Postgres+S3)  │                              │
   │ delegates OTP (HMAC)│                             │
   ▼                     │                             │
sms-gateway (3100) ◀─────┘                             │
   ├─ BullMQ ▶ Redis                                   │
   └─ Knex   ▶ Postgres[sms_gateway]                   │
                                                       │
Admin Panel (React) ─ /api ─▶ admin_backend (8001, stateless)
                                  ├─ httpx ▶ node_backend  /admin/* ──┘
                                  └─ httpx ▶ worker_backend /workers/admin/*
```

External: Firebase (customer phone OTP), SMTP (Resend/Brevo/Gmail) from node + worker, SMS provider APIs from sms-gateway, S3/R2 from worker_backend.

---

## 4. Components that should be isolated as separate services

Already separated in code; deployment should preserve the boundaries:

1. **`sms-gateway`** — its own DB, Redis, 3 processes, metrics. Keep isolated; scale workers independently.
2. **`sync_drain`** (worker_backend) and **`scheduler`** (sms-gateway) — **singleton scheduled jobs**, must not be co-scaled with the API replicas.
3. **`node_backend`** — isolate onto a **single pinned host with a persistent volume** until SQLite→Postgres + vault→durable-store migration lands (see §6).
4. **Object storage** — already external (S3/R2). Keep uploads off the app filesystem.

---

## 5. Current deployment assumptions found in-repo (and their gaps)

| Assumption (in repo) | Reality / Gap |
|---|---|
| Railway hosts all 3 backends; Vercel hosts frontends `[PROJECT_REFERENCE.md]` | Works, but `node_backend` SQLite on Railway = **ephemeral FS → data loss on redeploy**. |
| Root `docker-compose.yml` is the prod composition | **Incomplete**: no `node_backend`, no `sms-gateway`, no Redis, no Caddy service — yet `Caddyfile` proxies `node_backend:3000`. |
| `DEPLOY.md`: single Hetzner VPS + Caddy + R2 + managed PG ~$6/mo | Sound direction; under-provisioned once Redis + 2 PG DBs + sms-gateway (3 procs) are included. |
| Secrets via env files | **Live Gmail app password + admin password are committed in `PROJECT_REFERENCE.md`** — must be rotated and purged. |

---

## 6. Pre-production blockers (implementation-driven, not optional)

These come straight from the code and **must** be resolved before real daily users:

1. **`node_backend` SQLite → Postgres.** `pg` is already a dependency; the DB layer must be ported to use `DATABASE_URL`. Until then the customer API is single-host and the Railway FS loses data on redeploy.
2. **Vault in-memory `Map` → durable encrypted store.** Today every restart deletes all workers' uploaded documents.
3. **node_backend uploads/Supabase path is undefined** (`env.supabaseUrl` missing) — wire to the same R2 bucket the worker_backend uses, or remove the feature.
4. **Rotate & purge committed secrets** (Gmail app password `<REDACTED-ROTATE-GMAIL-APP-PW>`, `<REDACTED-ROTATE-ADMIN-PW>`, `ADMIN_SECRET`).
5. **Decide the SMS story**: either wire `node_backend` to the `sms-gateway` (consistent, observable, multi-provider failover) or keep inline Fast2SMS and treat sms-gateway as worker-only. Don't ship both half-wired.
6. **Reconcile `docker-compose.yml` with the real service set** (add node_backend, sms-gateway, redis, caddy) — see `04_DEPLOYMENT.md`.

---

## 7. Target production topology (recommendation)

Given the constraints above, the recommended shape is **a single-region container stack on one well-sized VPS, fronted by Caddy and Cloudflare**, with Postgres and object storage managed/separated — i.e. an evolution of the existing `DEPLOY.md` direction, completed and corrected. Rationale and sizing in `02_INFRASTRUCTURE.md`; the full diagram is in `06_DIAGRAM.md`.

Why not Kubernetes / multi-node now: the **SQLite-bound `node_backend` cannot be replicated**, customer base is regional (Kerala), and there are no realtime/high-throughput paths. K8s adds cost and operational burden the workload doesn't justify yet. The clean upgrade path (once node_backend is on Postgres) is documented in `08_SCALING.md`.
