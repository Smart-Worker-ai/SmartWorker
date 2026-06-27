# Production Readiness Checklist

> Go-live gate. 🔴 = hard blocker (do not launch), 🟠 = strongly recommended,
> 🟢 = already true in code. Items trace to findings in `01_ARCHITECTURE.md`.

---

## A. Code / data blockers (from analysis)

- [ ] 🔴 **Rotate & purge committed secrets** — Gmail app password `<REDACTED-ROTATE-GMAIL-APP-PW>`, `<REDACTED-ROTATE-ADMIN-PW>`, `ADMIN_SECRET` live in `PROJECT_REFERENCE.md`. Rotate all; `git filter-repo` to scrub history **before** GitHub push.
- [ ] 🔴 **node_backend vault durability** — currently an in-memory `Map` `[vault.controller.js:5]`; all worker documents vanish on restart. Move to PG/R2 (encrypted) before storing real docs.
- [ ] 🔴 **node_backend persistence** — SQLite on a **persistent volume** (not ephemeral PaaS FS), backed up nightly. Or complete SQLite→Postgres migration (`04_DATABASE.md §6`).
- [ ] 🔴 **node_backend uploads path** — `env.supabaseUrl` is undefined `[vault.controller.js:16]`; wire to R2 or disable the feature.
- [ ] 🔴 **node_backend prod secret guards** — assert `JWT_SECRET`, `ENCRYPTION_KEY`, `ADMIN_SECRET` are set & ≥32 chars at boot (today `ADMIN_SECRET` falls back to a dev default `[admin.routes.js]`).
- [ ] 🟠 **SMS path decision** — wire node_backend → sms-gateway, or keep inline Fast2SMS; remove the half-wired ambiguity.
- [ ] 🟠 **node_backend audit log** — add for admin approve/reject/block/delete (worker_backend & sms-gateway already have audit tables).
- [ ] 🟠 **node_backend OTP rate limit** — add per-IP limiter on `/auth/send-otp` (SMS-cost abuse).
- [ ] 🟠 **Flutter base URLs** — `api_constants.dart` still points at Railway; switch to `https://api.smartworkers.in` before release; add cert pinning.

## B. Infrastructure

- [ ] 🔴 docker-compose completed with `node_backend`, `sms-gateway`, `redis`, `caddy` (current root compose omits them; `Caddyfile` already expects `node_backend`).
- [ ] 🔴 `ops/postgres-init/` populated to create `smartworkers` + `sms_gateway` DBs + least-priv roles (currently empty).
- [ ] 🟢 Each backend has a Dockerfile + `/health`.
- [ ] 🟢 worker_backend runs Alembic on boot; refuses prod without `DATABASE_URL`/S3.
- [ ] Persistent volumes for `node_data` (SQLite), `caddy_data` (certs), `redis_data`, `postgres_data`.
- [ ] VM sized (CX32+) with headroom (`02_INFRASTRUCTURE.md §3`).

## C. Networking & TLS

- [ ] 🟢 Caddy auto-TLS configured for the 3 API hosts.
- [ ] Only 80/443 public; 3000/8000/8001/3100/5432/6379 bridge-only.
- [ ] Cloudflare **Full (strict)**; optional origin-lockdown to CF IP ranges.
- [ ] SSH key-only, 22 restricted; ufw enabled; fail2ban running.
- [ ] DNS records + email SPF/DKIM/DMARC set (`03_DNS.md`).

## D. Security

- [ ] 🟢 HSTS + secure headers (Caddy + FastAPI).
- [ ] 🟢 Admin auth = bcrypt + JWT + CSRF double-submit.
- [ ] 🟢 CORS allow-lists, no wildcards in prod.
- [ ] Shared secrets unique & matched where required (`ADMIN_SECRET`, `CUSTOMER_BACKEND_ADMIN_SECRET`, `HMAC_SECRET`).
- [ ] Secrets in a manager / encrypted, not git.
- [ ] No secrets/OTPs/tokens in logs.
- [ ] FastAPI `/docs` (Swagger) gated or disabled in prod.
- [ ] CSP added to SPAs.
- [ ] Run `/security-review` on the diff before launch.

## E. Database

- [ ] PG `max_connections`/`shared_buffers` tuned; TLS on.
- [ ] Two DBs + per-service roles (least privilege).
- [ ] Nightly backups (both PG DBs + SQLite) → R2; **restore tested once**.
- [ ] PITR or read-replica plan documented for HA.
- [ ] node_backend seed guard idempotent (no double-seed of the 32 workers).

## F. Observability

- [ ] Prometheus + Grafana up (sms-gateway bundle); host + container exporters added.
- [ ] Sentry wired into all 4 backends.
- [ ] UptimeRobot on all health endpoints (gateway uses `/health/ready`).
- [ ] Alert rules live (`08_SCALING_MONITORING.md §B7`): service down, DLQ>0, circuit open, SMS-cost spike, 5xx, disk, PG conns.
- [ ] Log aggregation (Loki) + Docker log rotation.

## G. CI/CD

- [ ] GitHub remote added (after secret purge).
- [ ] CI runs tests/lint/build per service (extend `worker_website/ci.yml` pattern); add node_backend tests.
- [ ] Images tagged by git SHA in GHCR; rollback = redeploy prior SHA.
- [ ] `master` protected; staging environment exists.
- [ ] Pre-deploy DB snapshot automated in the deploy job.

## H. Operational readiness

- [ ] Runbook (`09_OPERATIONS.md`) reviewed; on-call/owner assigned.
- [ ] DR drill (VM rebuild + restore) performed once.
- [ ] Status page / comms channel ready.
- [ ] Smoke-test script wired into deploy (`DEPLOYMENT.md §9`).

## I. Application correctness (end-to-end smoke)

- [ ] Customer Firebase OTP login → JWT exchange.
- [ ] Email OTP login (customer + worker).
- [ ] Worker registration → OTP via gateway → upload to R2 → status `pending`.
- [ ] Admin approve → `x-admin-secret` sync → worker visible in customer search.
- [ ] Booking → confirmation emails to customer + worker.
- [ ] Feedback, grievance flows.
- [ ] `sync_retries` drains; DLQ stays empty.

---

### Launch decision
Launch only when **all 🔴 are cleared**. The 🔴 items are not hardening niceties — they are points where the current code **loses customer data** (vault, SQLite-on-ephemeral-FS) or **leaks credentials** (committed secrets). Everything else can iterate post-launch.
