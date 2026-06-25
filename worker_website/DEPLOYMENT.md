# Deployment Guide — Smart Workers Worker Portal

This document describes how to deploy and operate the Worker Portal
(`worker_website`) for long-term, day-to-day production use, exposed publicly
to legitimate users over the internet.

All recommendations are derived from the project's actual implementation:

- **Backend** — FastAPI + async SQLAlchemy, packaged as a multi-stage Docker
  image (`backend/Dockerfile`), boots with `alembic upgrade head` then
  `uvicorn` with N workers, exposes `/health`, runs as a non-root user under
  `tini`.
- **Frontend** — React 18 + Vite, built to static assets and served by
  `nginx:1.27-alpine` (`frontend/Dockerfile`), which also reverse-proxies
  `/api` and `/uploads` to the backend (`frontend/nginx.conf`).
- **Database** — PostgreSQL via `asyncpg`, schema managed by Alembic
  (`backend/alembic/`). SQLite is a dev-only fallback.
- **Object storage** — S3-compatible (Cloudflare R2 / AWS S3 / MinIO),
  required in production (`backend/storage.py`, `config.py`).
- **External dependencies** — a self-hosted SMS Gateway service (OTP
  send/verify, HMAC-secured), the customer-facing Node.js backend, and an
  SMTP provider.
- **Background work** — `backend/workers/sync_drain.py` drains the
  `sync_retries` dead-letter table to the Node.js backend.

---

## 1. Recommended Deployment Approach

**Containerized deployment with Docker images, fronted by a reverse proxy
that terminates TLS, backed by managed PostgreSQL and managed S3-compatible
object storage.**

### Why this approach fits this codebase

| Evidence in the code | Implication |
|---|---|
| Backend already has a production multi-stage `Dockerfile` (non-root, `tini`, healthcheck, `alembic upgrade head` on boot) | The image is the intended production artifact — use it, not ad-hoc `uvicorn` on a VM. |
| `config.py` is fail-fast: required env vars raise on boot, `CORS_ORIGINS` rejects `*` in prod | The app expects configuration injected by an orchestrator, not baked in. Twelve-factor style. |
| Backend holds no local state in prod (S3 for files, Postgres for data, sessions in DB) | The backend is horizontally scalable — run multiple replicas behind the proxy. |
| Frontend is a static SPA built by Vite and served by nginx | Frontend and backend are independently deployable; the frontend is just files + a proxy. |
| `nginx.conf` proxies `/api` to `http://worker_backend:8000` | nginx is the natural in-cluster reverse proxy / edge for the SPA. |
| OTP, SMS, and customer sync live in **separate services** | This is a multi-service system; the portal must be deployed as one service among several, not a monolith. |

The application is **already structured for this model**. The deployment job is
to wire the pieces together reliably, not to restructure the app.

### What runs as a separate service

| Service | Source | Stateless? | Notes |
|---|---|---|---|
| Worker Portal **backend** | `backend/` (Docker) | Yes | Scale horizontally; N uvicorn workers per replica. |
| Worker Portal **frontend** | `frontend/` (nginx) | Yes | Static; cache aggressively at the edge. |
| **PostgreSQL** | Managed (Neon / RDS / Railway PG) | Stateful | The single source of truth. Do not self-host unless you must. |
| **Object storage** | Managed (Cloudflare R2 / S3) | Stateful | Worker uploads (passbook, Aadhaar, photos). |
| **SMS Gateway** | Separate repo/branch | Stateful | Owns OTP lifecycle; the portal is a thin client. |
| **SMTP provider** | Managed (Resend / Brevo) | — | Email OTP fallback + notifications. |
| **`sync_drain` worker** | `backend/workers/sync_drain.py` | — | Run as a scheduled job / sidecar, not in the web process. |

---

## 2. Production Architecture

```
                              Internet (HTTPS, public users)
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │   Edge reverse proxy / TLS     │
                         │  (Caddy / Traefik / nginx /    │
                         │   managed LB + ACME certs)     │
                         └───────────────┬────────────────┘
                          workers.example.com │ workers-api.example.com
                       (static SPA)        │ (API)
              ┌─────────────────────────┐  │  ┌──────────────────────────────┐
              │  Frontend (nginx)        │  │  │  Backend (FastAPI, N replicas) │
              │  - serves Vite build     │  │  │  - uvicorn, UVICORN_WORKERS=2+ │
              │  - proxies /api,/uploads ├──┼─▶│  - /health, /                  │
              └─────────────────────────┘  │  │  - alembic upgrade head on boot│
                                           │  └───────┬───────────┬────────────┘
                                           │          │           │
                                           │          ▼           ▼
                                           │   ┌────────────┐  ┌─────────────────┐
                                           │   │ PostgreSQL  │  │ Object storage   │
                                           │   │ (managed)   │  │ (R2 / S3)        │
                                           │   └────────────┘  └─────────────────┘
                                           │          ▲
                                           │          │ (drains sync_retries)
                                           │   ┌──────────────────┐
                                           │   │ sync_drain job    │
                                           │   │ (cron / sidecar)  │
                                           │   └────────┬──────────┘
                                           │            ▼
        ┌──────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
        │  SMS Gateway      │◀───┤  Backend (OTP calls) │    │ Customer Node.js │
        │  (HMAC, separate) │    └─────────────────────┘    │ backend (sync)   │
        └──────────────────┘                                 └──────────────────┘
                                  ┌──────────────┐
                                  │ SMTP provider │  (email OTP + notifications)
                                  └──────────────┘
```

**Request flow:** A public user hits `workers.example.com` (the SPA). The SPA
calls `/api/...`, which the proxy routes to the backend. The backend
authenticates via the SMS Gateway, persists to PostgreSQL, stores files in
object storage, and queues failed customer-backend syncs into `sync_retries`,
which the `sync_drain` job later flushes.

---

## 3. Infrastructure Overview

| Layer | Recommended (self-managed) | Recommended (PaaS) |
|---|---|---|
| Compute | Docker host / small K8s / Nomad | Railway, Fly.io, Render |
| Edge / TLS | Caddy or Traefik (auto-ACME) | Platform-managed TLS |
| Database | Managed Postgres (Neon, RDS, Cloud SQL) | Railway/Render Postgres |
| Object storage | Cloudflare R2 (zero egress) or AWS S3 | Same |
| DNS | Cloudflare | Same |
| SMTP | Resend / Brevo | Same |
| SMS Gateway | Deployed from its own repo/branch | Same |
| Secrets | Orchestrator secret store / SOPS / Vault | Platform secrets UI |
| Logs | stdout → log shipper (Loki/CloudWatch) | Platform log drain |

The codebase is **platform-agnostic**: a `railway.toml` exists (nixpacks
start command), and a production `Dockerfile` exists. Prefer the **Docker
image** as the canonical artifact — it pins Python 3.11, installs system libs
(`libmagic`, `libjpeg`), runs migrations on boot, and runs as non-root.
`railway.toml` is fine for the current Railway deployment but the Docker path
is more portable.

---

## 4. System Requirements

### Backend (per replica)
- **CPU:** 1 vCPU minimum, 2 vCPU recommended (2 uvicorn workers).
- **Memory:** 512 MB minimum, 1 GB recommended (Pillow image processing + boto3).
- **Disk:** Ephemeral; only `/app/data` and `/app/uploads` are created, and in
  prod uploads go to S3 — local disk is not the store of record.
- **Runtime:** Python 3.11 (pinned in the image). `libmagic1`, `libjpeg62-turbo`
  required (already in the runtime image).

### Frontend
- Build: Node.js 20 (pinned in `frontend/Dockerfile`).
- Serve: nginx 1.27-alpine. Negligible CPU/memory — it serves static files.

### Database
- PostgreSQL 14+ (16 used in `docker-compose.yml`). Start at 1 vCPU / 1 GB / 10 GB
  disk; grow disk with document/worker volume. `asyncpg` pool defaults to 10
  connections + 20 overflow **per backend replica** — size the DB connection
  limit accordingly (`replicas × 30` worst case).

### Object storage
- Any S3-compatible bucket. Cloudflare R2 recommended (no egress fees for
  publicly served documents).

---

## 5. Deployment Prerequisites

Before first deploy, provision and have credentials for:

1. **PostgreSQL** database + connection string.
2. **S3-compatible bucket** + endpoint, access key, secret key.
3. **SMS Gateway** deployed and reachable, with a shared HMAC secret.
4. **SMTP** account (host, port, user, pass, from-address).
5. **Customer Node.js backend** URL + the shared `ADMIN_SECRET`.
6. **Two DNS records** (SPA + API), e.g. `workers.example.com` and
   `workers-api.example.com`.
7. **TLS** — automatic via the proxy (ACME) or platform-managed.
8. A **container registry** if not building on the deploy host.

---

## 6. Environment Variable Configuration

Source of truth: `backend/.env.example`. `config.py` **fails to boot** if a
required prod var is missing — this is intentional.

### Required in production
| Variable | Purpose | Notes |
|---|---|---|
| `ENV` | `production` | Enables HSTS, secure cookies, blocks `*` CORS. |
| `DATABASE_URL` | Postgres DSN | `postgresql+asyncpg://...` (bare `postgresql://` is auto-rewritten). |
| `ADMIN_SECRET` | Cross-service admin auth | ≥32 random chars. **Must match** the customer backend. |
| `CORS_ORIGINS` | Allowed SPA origins | Comma-separated. **No `*`.** |
| `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Object storage | All four required, else boot fails. |
| `SMS_GATEWAY_URL`, `SMS_GATEWAY_HMAC_SECRET` | OTP gateway | Both required in prod. |
| `SELF_BASE_URL` | This service's public URL | Used to build absolute document URLs. |

### Recommended in production
| Variable | Default | Notes |
|---|---|---|
| `CUSTOMER_BACKEND_URL` | Railway URL | Where approved workers are synced. |
| `CUSTOMER_APK_URL` | Railway URL | Referral redirect target. |
| `S3_PUBLIC_URL_BASE` | _(blank)_ | Set if bucket has a public CDN domain; else presigned URLs. |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Gmail-ish | Email OTP fallback + notifications. |
| `SESSION_TTL_HOURS` | `24` | Worker session lifetime. |
| `MAX_DOC_SIZE_MB` / `MAX_PHOTO_SIZE_MB` | `5` / `2` | Upload caps. |
| `RATELIMIT_REGISTRATION` / `RATELIMIT_OTP_REQUEST` / `RATELIMIT_OTP_VERIFY` | `3/hour` / `5/hour` / `10/hour` | Per-IP. |
| `UVICORN_WORKERS` | `2` | Read by the Docker `CMD`. Set ≈ vCPU count. |

### Environment-specific values

These **must** differ between dev / staging / production:

- `ENV`, `DATABASE_URL`, `CORS_ORIGINS`, `SELF_BASE_URL`
- `ADMIN_SECRET`, `SMS_GATEWAY_HMAC_SECRET` (unique secrets per environment)
- S3 bucket/credentials (separate bucket per environment)
- `CUSTOMER_BACKEND_URL` / `CUSTOMER_APK_URL` (staging vs prod customer backend)
- SMTP credentials (use a sandbox sender in staging)

Never reuse production secrets in staging. Never commit `.env`.

---

## 7. Database Setup and Migrations

The schema is managed by **Alembic** (`backend/alembic/`), currently three
revisions (`0001_initial` → `0002_drop_otp_table` → `0003_worker_identity_referral`).

- **Migrations run automatically on container start** — the backend
  `Dockerfile` `CMD` is `alembic upgrade head && uvicorn ...`. A fresh deploy
  self-migrates.
- **SQLite is dev-only.** In prod, `DATABASE_URL` must be Postgres or the app
  refuses S3-less / DB-less boot.
- **First-time setup:** create an empty Postgres database; the first container
  boot creates all tables.
- **Multi-replica caution:** when running >1 replica, concurrent boots can race
  on `alembic upgrade head`. For zero-downtime rollouts, prefer a **dedicated
  one-shot migration step** (a release/pre-deploy job that runs
  `alembic upgrade head` once) and disable auto-migrate in the web command, or
  roll out replicas one at a time. For the current single-service scale, the
  on-boot migration is acceptable.
- **Creating new migrations:** `alembic revision --autogenerate -m "msg"`,
  review the generated file, commit it. Migrations are **forward-only** in
  practice — write a new migration to undo, don't hand-edit applied ones.

---

## 8. Reverse Proxy Configuration (high level)

Two routing concerns: serve the SPA, and route `/api` to the backend.

The repo's `frontend/nginx.conf` already does this **inside the cluster**:

```nginx
location /api/      { proxy_pass http://worker_backend:8000; ... }
location /uploads/  { proxy_pass http://worker_backend:8000; ... }
location /          { try_files $uri $uri/ /index.html; }   # SPA fallback
client_max_body_size 10m;                                    # matches upload caps
```

For a **public, internet-facing edge**, put a TLS-terminating proxy in front:

- **Option A — single hostname:** edge proxy → nginx (frontend). nginx serves
  the SPA and proxies `/api` to the backend. One DNS name, simplest.
- **Option B — split hostnames (recommended at scale):**
  `workers.example.com` → frontend (static, CDN-cached);
  `workers-api.example.com` → backend directly. Set `CORS_ORIGINS` to the SPA
  origin and `SELF_BASE_URL` to the API origin.

Edge proxy requirements:
- Forward `X-Forwarded-For` / `X-Forwarded-Proto` (rate limiting uses client IP;
  `nginx.conf` already sets these for the upstream).
- `client_max_body_size` ≥ `MAX_DOC_SIZE_MB` (keep at 10m to match nginx).
- Reasonable read timeout (60s set in `nginx.conf`).

The backend already emits security headers (`X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS in
prod) via `SecurityHeadersMiddleware` — don't duplicate/conflict them at the edge.

---

## 9. TLS / HTTPS Recommendations

- **Terminate TLS at the edge** with automatic certificates (Let's Encrypt via
  Caddy/Traefik, or platform-managed). Caddy/Traefik auto-renew; no manual cert
  rotation.
- **HTTPS only.** In prod (`ENV=production`) the backend sets session cookies
  `Secure` + `HttpOnly` + `SameSite=Lax` and emits HSTS
  (`max-age=31536000; includeSubDomains`). Serving over plain HTTP in prod
  breaks the auth cookie.
- **Redirect HTTP→HTTPS** at the edge.
- **TLS 1.2+ only**, modern cipher suites (proxy defaults are fine).
- If split hostnames, both the SPA and API hostnames need certificates.

---

## 10. Domain and DNS Considerations

- Two records recommended:
  - `workers.example.com` → frontend (SPA).
  - `workers-api.example.com` → backend API (if split).
- Point records at the edge proxy / load balancer, not directly at app
  containers.
- After DNS is set, update:
  - `CORS_ORIGINS` → the exact SPA origin(s) (scheme + host, no trailing slash).
  - `SELF_BASE_URL` → the public API base.
- If using Cloudflare, you get DNS + CDN + DDoS protection in one. Cache static
  SPA assets aggressively; **never cache `/api`**.
- Keep TTLs moderate (300s) during initial rollout for fast corrections.

---

## 11. Logging and Monitoring

### Logging
- The backend uses **structlog with JSON output** (`main.py`). Every request is
  logged by `AccessLogMiddleware` with method, path, status, and client IP;
  unhandled errors log `request_failed` with a traceback and return a generic
  500.
- **Log to stdout** (already the case) and let the orchestrator/platform ship
  logs to a central store (Loki, CloudWatch, Datadog). Do not write app logs to
  container disk.
- Useful structured events already emitted: `worker_registered`,
  `worker_login`, `otp_requested`, `otp_gateway_unavailable`,
  `worker_sync_failed_queued`, `referral_credit_awarded`.

### Monitoring
- **Liveness/readiness:** `GET /health` (returns `{"status":"healthy"}`) and
  `GET /` (service banner). Both are unauthenticated and cheap.
- **Metrics to watch** (per `README.md`): request latency p95/p99, 5xx rate, 4xx
  auth-failure rate, OTP verify success rate, upload success rate, DB query time
  (worker listing especially).
- **Suggested alerts:** 5xx rate > 5%, p95 latency > 500ms, `sync_retries` table
  growing unbounded (customer backend down), `otp_gateway_unavailable` spiking
  (SMS gateway down), disk/DB > 80%.
- **Error monitoring:** route the JSON logs into an error tracker, or add Sentry
  to the backend for exception aggregation (not yet wired — a recommended
  addition).

---

## 12. Backup and Recovery

| Asset | Backup strategy | Recovery |
|---|---|---|
| **PostgreSQL** | Managed automated daily snapshots + PITR (point-in-time recovery). Verify retention ≥ 7 days. | Restore snapshot → repoint `DATABASE_URL`. |
| **Object storage** | Enable bucket **versioning**; replicate to a second bucket/region for DR. | Restore object versions; presigned URLs regenerate from DB keys. |
| **Secrets/config** | Store in the orchestrator secret store + an encrypted offline copy (SOPS/Vault). | Re-inject env vars. |
| **`sync_retries` table** | Backed up with Postgres. Don't truncate without draining. | Re-run `sync_drain` after recovery. |

- Test restores **quarterly** — an untested backup is not a backup.
- The portal holds **no irreplaceable local state**: DB + object storage +
  secrets fully reconstitute it. Containers are disposable.
- After a DB restore, run `sync_drain` to flush any queued customer-backend syncs.

---

## 13. Update / Upgrade Strategy

- **Artifact:** build a new Docker image per release, tagged by version (and/or
  git SHA). Never deploy `latest` to prod.
- **Rollout:** rolling update behind the proxy — start new replicas, wait for
  `/health` to pass, drain old ones. The app is stateless, so this is safe.
- **Migrations:** because migrations run on boot, deploy **migration-compatible
  changes** (expand-then-contract: add columns/tables in release N, remove old
  ones in release N+1) so old and new replicas coexist during rollout.
- **Dependencies:** backend deps are pinned in `requirements.txt`; frontend deps
  are pinned to exact versions in `package.json`. Bump deliberately, run the
  test suite, then release.
- **SMS Gateway / customer backend:** coordinate `ADMIN_SECRET` /
  `SMS_GATEWAY_HMAC_SECRET` rotations across services — they're shared secrets.

---

## 14. Versioning and Release Workflow

- **App version** lives in `main.py` (`FastAPI(version="1.1.0")`) and
  `frontend/package.json`. Bump both on release; tag the repo `vX.Y.Z`.
- **Semantic versioning:** MAJOR for breaking API/schema changes, MINOR for
  features, PATCH for fixes.
- **Branch flow:** feature branch → PR → CI green → merge to `main` → tagged
  release → deploy. `develop` may serve as a staging integration branch.
- **CI gate:** the included `.github/workflows/ci.yml` runs backend pytest
  (against a Postgres service), frontend tests + build, and lint on every PR.
  Require it to pass before merge. Docker images build on `main`.

---

## 15. Health Checks and Service Validation

### Built-in
- Backend Docker `HEALTHCHECK` curls `/health` every 30s (15s start period, 3
  retries).
- `railway.toml` / `docker-compose.yml` use `/health` as the platform health
  probe.

### Post-deploy smoke test
```bash
# 1. Backend healthy
curl -fsS https://workers-api.example.com/health        # {"status":"healthy"}

# 2. Service banner
curl -fsS https://workers-api.example.com/               # {"service":"smart-workers-portal","status":"ok"}

# 3. Public listing responds (DB reachable)
curl -fsS https://workers-api.example.com/api/workers/public

# 4. SPA loads
curl -fsSI https://workers.example.com/                  # 200, text/html

# 5. SPA → API proxy works (if single-hostname)
curl -fsS https://workers.example.com/api/workers/public

# 6. CORS preflight from the SPA origin returns the right Allow-Origin
curl -fsSI -X OPTIONS https://workers-api.example.com/api/workers/public \
     -H "Origin: https://workers.example.com" \
     -H "Access-Control-Request-Method: GET"
```

Validate also: an OTP request reaches the SMS gateway (check
`otp_requested` vs `otp_gateway_unavailable` logs), and a test registration
writes to S3 and the DB.

---

## 16. Recommended Production Service Layout

```
deploy/                                  # infra-as-code (not in app repo necessarily)
├── docker-compose.prod.yml              # or k8s manifests / platform config
├── .env.production                      # injected as secrets, NEVER committed
└── proxy/
    └── Caddyfile | traefik.yml          # edge TLS + routing

# Container topology in production:
┌─ edge-proxy        (Caddy/Traefik)        : 443  → TLS, routing
├─ worker-frontend   (frontend/Dockerfile)  : 80   → nginx static + /api proxy
├─ worker-backend    (backend/Dockerfile)   : 8000 → FastAPI, 2+ replicas
│     env: DATABASE_URL, ADMIN_SECRET, S3_*, SMS_GATEWAY_*, CORS_ORIGINS, ...
├─ sync-drain        (backend image, alt cmd): cron → python -m workers.sync_drain
├─ postgres          (managed)              : 5432 → primary data store
└─ object-storage    (managed R2/S3)        : —    → worker documents

# External (own deployments):
├─ sms-gateway       (separate repo/branch)
└─ customer-backend  (Node.js, Railway)
```

Notes:
- `sync-drain` reuses the **backend image** with command
  `python -m workers.sync_drain`, scheduled (cron / platform scheduled job /
  k8s CronJob). Do **not** run it inside the web container.
- The frontend container's nginx upstream name (`worker_backend`) must resolve
  to the backend service on the container network (set service name / alias
  accordingly).

---

## 17. Operational Recommendations

### Scalability
- **Backend:** stateless → scale horizontally (more replicas) behind the proxy.
  Tune `UVICORN_WORKERS` ≈ vCPU per replica. Watch the Postgres connection
  ceiling (`replicas × ~30`).
- **Frontend:** static → push to a CDN; scales for free.
- **Database:** the first vertical bottleneck. Add read replicas / a connection
  pooler (PgBouncer) before scaling backend replicas aggressively.
- **Object storage:** effectively infinite; no action.

### Reliability
- Fail-fast config means a misconfigured deploy **won't half-start** — it
  refuses to boot, surfacing problems immediately.
- The `sync_retries` dead-letter table + `sync_drain` backoff (30s→6h, 6
  attempts) makes customer-backend sync resilient to transient outages.
- OTP/email/SMS failures are caught and logged, never crash a request.

### Availability
- Run **≥2 backend replicas** across availability zones if the platform allows.
- Use managed Postgres with automated failover.
- Health-check-gated rolling deploys avoid downtime.
- Target: define an SLO (e.g. 99.5%) and alert on burn.

### Maintainability
- One image, one config surface (env vars), migrations on boot.
- Pinned dependencies (backend + frontend) → reproducible builds.
- Test suite + CI gate protect `main`.

### Configuration management
- All config via environment variables; secrets in the orchestrator's secret
  store (or SOPS/Vault), never in the image or git.
- Keep a per-environment `.env` template; diff against `.env.example` when
  adding vars.

### Log management
- JSON logs to stdout → central aggregation. Retain ≥30 days. Index on
  `event`, `status`, `worker_id`.

### Error monitoring
- Add Sentry (or equivalent) to the backend for exception aggregation; alert on
  new error signatures and on `worker_sync_failed_queued` /
  `otp_gateway_unavailable` rates.

### Deployment automation (CI/CD concept)
- PR → CI (tests, lint, build) → merge `main` → build & tag image → deploy to
  staging → smoke test → promote to prod. The included GitHub Actions workflow
  covers the test/build half; add a deploy step for your platform.

### Rollback strategy
- **App:** redeploy the previous image tag — instant, since images are
  versioned and the app is stateless.
- **Database:** never auto-rollback migrations in prod. Use expand/contract so
  the previous image still works against the new schema; if a migration is bad,
  roll forward with a fix migration. Keep a tested PITR restore path for
  catastrophic cases.
- Always verify `/health` + smoke tests after a rollback.

---

## 18. Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| Container exits immediately on boot | Missing required env var (fail-fast) | Read the `[FATAL] Required env var ...` line in logs; set it. |
| Boot fails with DB error | `DATABASE_URL` wrong / DB unreachable / migration error | Verify DSN, network, run `alembic upgrade head` manually. |
| Boot fails: "Production requires S3 storage" | One of `S3_*` unset | Set all four S3 vars. |
| Boot fails: "Production requires SMS_GATEWAY_*" | Gateway vars unset | Set `SMS_GATEWAY_URL` + `SMS_GATEWAY_HMAC_SECRET`. |
| Login works but session drops immediately | Served over HTTP in prod | Secure cookie needs HTTPS — fix TLS / `X-Forwarded-Proto`. |
| CORS errors in browser | `CORS_ORIGINS` missing the SPA origin | Add exact origin (scheme+host, no trailing slash); no `*` in prod. |
| OTP never sends | SMS gateway down/misconfigured | Check `otp_gateway_unavailable` logs; verify gateway URL + HMAC. |
| Uploads rejected (4xx) | File too big / wrong type | Docs ≤5MB PDF/img, photo ≤2MB img; check `client_max_body_size`. |
| Worker missing from public list | Not approved/verified, or blocked | Approve via admin; blocked workers return 404 by design. |
| `sync_retries` growing | Customer backend down | Check `worker_sync_failed_queued`; fix backend; run `sync_drain`. |
| Rate-limit 429s for real users | Shared NAT IP or limits too low | Confirm `X-Forwarded-For` reaches the app; tune `RATELIMIT_*`. |
| 500s spiking after deploy | Bad release / migration | Roll back to previous image tag; inspect `request_failed` traces. |

---

## 19. First-Time Deployment Checklist

```
[ ] Provision managed PostgreSQL; capture DATABASE_URL (postgresql+asyncpg://...)
[ ] Create S3-compatible bucket; capture endpoint + access/secret keys; enable versioning
[ ] Deploy / confirm SMS Gateway reachable; agree on shared HMAC secret
[ ] Set up SMTP account; capture host/port/user/pass/from
[ ] Confirm customer Node.js backend URL + shared ADMIN_SECRET
[ ] Register DNS: workers.example.com (SPA) + workers-api.example.com (API)
[ ] Stand up edge proxy with automatic TLS (Caddy/Traefik/managed)
[ ] Build & tag backend image (vX.Y.Z); build frontend image
[ ] Inject ALL required env vars as secrets (ENV=production)
[ ]   - DATABASE_URL, ADMIN_SECRET, CORS_ORIGINS, SELF_BASE_URL
[ ]   - S3_ENDPOINT_URL / S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY
[ ]   - SMS_GATEWAY_URL / SMS_GATEWAY_HMAC_SECRET
[ ]   - SMTP_*, CUSTOMER_BACKEND_URL, CUSTOMER_APK_URL, UVICORN_WORKERS
[ ] Deploy backend; confirm migrations ran (alembic upgrade head in logs)
[ ] Deploy frontend; confirm nginx upstream resolves to backend
[ ] Schedule sync_drain job (python -m workers.sync_drain) on the backend image
[ ] Run the §15 smoke tests (health, banner, public list, SPA, CORS)
[ ] End-to-end test: register a worker → file lands in S3, row in DB
[ ] End-to-end test: OTP request → gateway receives it → verify → session cookie
[ ] Configure log shipping + alerts (5xx, latency, sync_retries, OTP failures)
[ ] Verify DB automated backups + bucket versioning are ON
[ ] Document the deployed version tag and env in your runbook
```

---

## 20. Ongoing Maintenance Checklist

```
Daily
[ ] Review error-rate / 5xx dashboard and new error signatures
[ ] Check sync_retries depth (customer-backend sync health)
[ ] Confirm OTP verify success rate is normal

Weekly
[ ] Review p95/p99 latency trends; check DB slow queries
[ ] Confirm backups succeeded (DB snapshots + bucket versions)
[ ] Skim auth-failure / rate-limit logs for abuse

Monthly
[ ] Apply dependency + base-image security updates; run tests; release
[ ] Review storage growth & DB disk; scale before 80%
[ ] Review and prune/aggregate old logs per retention policy

Quarterly
[ ] Test a full DB restore into a scratch environment
[ ] Rotate ADMIN_SECRET and SMS_GATEWAY_HMAC_SECRET (coordinate across services)
[ ] Review CORS origins, rate limits, and upload caps against real usage
[ ] DR drill: rebuild the service from image + DB restore + bucket
```

---

## 21. Why This Strategy Suits This Implementation

1. **The app is already built for it.** A production `Dockerfile` (non-root,
   `tini`, healthcheck, migrate-on-boot), fail-fast env-driven config, and a
   no-local-state design are textbook signals for containerized, twelve-factor
   deployment behind a proxy. Nothing needs restructuring.

2. **It is genuinely multi-service.** OTP lives in a separate SMS Gateway,
   worker sync targets a separate Node.js backend, files live in S3, and a
   `sync_drain` job runs out-of-band. Treating each as its own service (rather
   than forcing a monolith) matches the code and keeps failures isolated.

3. **Statelessness buys cheap reliability.** Because the backend keeps nothing
   locally, horizontal scaling, rolling deploys, and instant image-tag rollback
   all work without special handling — the hard parts of "reliable daily
   operation" come almost for free.

4. **Managed Postgres + managed object storage** put the only stateful,
   hard-to-recover pieces on platforms built to back them up and fail over,
   shrinking the operational surface the team must babysit.

5. **The pieces for safe operation already exist** — `/health`, JSON logs,
   per-IP rate limits, a dead-letter retry queue, Alembic migrations, pinned
   dependencies, and a CI gate. The deployment strategy here simply connects
   them; it doesn't paper over gaps.

In short: containerize the existing images, terminate TLS at an auto-cert proxy,
lean on managed Postgres and S3, run `sync_drain` as a scheduled job, and gate
releases on CI. This is the lowest-risk, lowest-effort path that the current
architecture directly supports.
