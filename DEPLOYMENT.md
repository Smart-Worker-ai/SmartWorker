# Smart Workers — Production Deployment Guide

> Complete, end-to-end runbook for the **whole** system. This supersedes the
> partial root `docker-compose.yml` (which omits `node_backend`, `sms-gateway`,
> and `redis`) and consolidates `DEPLOY.md`. Architecture rationale lives in
> [`docs/deployment/`](docs/deployment/). Read `01_ARCHITECTURE.md` first.
>
> **Stop — pre-flight blockers (from code analysis):**
> 1. 🔴 Rotate & purge committed secrets in `PROJECT_REFERENCE.md` (Gmail app
>    password, admin password) **before** pushing to GitHub.
> 2. 🔴 `node_backend` uses **SQLite + in-memory vault** → single host, persistent
>    volume, and vault data is lost on restart until migrated (`04_DATABASE.md`).
> 3. 🟠 Decide the SMS path (wire `node_backend` to `sms-gateway`, or keep inline
>    Fast2SMS). Don't ship both half-wired.

---

## 0. Target stack

| Layer | Choice |
|---|---|
| Compute | 1× Hetzner CX32 (4 vCPU / 8 GB) — Ubuntu 24.04, Docker |
| Edge | Cloudflare (DNS, TLS, WAF, CDN) |
| Reverse proxy | Caddy (auto-TLS) |
| DB | PostgreSQL 16 (co-located or Neon) — DBs `smartworkers` + `sms_gateway` |
| Cache/Queue | Redis 7 (BullMQ) |
| Objects | Cloudflare R2 (`smartworkers-uploads`, private) |
| Email | Resend / Brevo (SMTP) |
| SPAs | Vercel / Cloudflare Pages |
| Mobile | Firebase App Distribution → later Play Store |

---

## 1. Prerequisites

- Domain (e.g. `smartworkers.in`) on Cloudflare DNS.
- A VPS (CX32) running Ubuntu 24.04.
- Cloudflare R2 bucket + API token (Object Read&Write).
- SMTP provider creds (Resend).
- SMS provider creds (≥1 of Twilio/MSG91/Plivo/Fast2SMS) if using the gateway.
- Firebase project (customer phone auth) — note the **project ID** (node_backend verifies `aud` against it).

---

## 2. One-time VM setup

```bash
ssh root@<vps-ip>
adduser deploy --disabled-password --gecos ""; usermod -aG sudo deploy
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
apt install -y ufw fail2ban
ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable
# harden SSH: key-only, restrict 22 to your IP/VPN
```

```bash
ssh deploy@<vps-ip>
git clone <YOUR_GHCR_OR_GIT_REMOTE>/SmartWorker.git && cd SmartWorker
```

---

## 3. Generate secrets

```bash
# JWT/ENCRYPTION/ADMIN secrets, HMAC, PG/Redis passwords (one each, unique):
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
# sms-gateway HMAC (64 bytes hex):
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Admin password bcrypt hash:
python3 -c "from passlib.hash import bcrypt; import getpass; print(bcrypt.hash(getpass.getpass()))"
```

**Secrets that MUST match across services** (set identical values):
- `ADMIN_SECRET` — node_backend ↔ worker_backend
- `CUSTOMER_BACKEND_ADMIN_SECRET` (admin) == `ADMIN_SECRET` (node)
- `HMAC_SECRET` — sms-gateway ↔ worker_backend (the OTP caller)

Everything else must be **unique** and never reused.

---

## 4. Environment files

```bash
cp .env.example        .env          # POSTGRES_* for compose
cp .env.node.example   .env.node     # node_backend
cp .env.worker.example .env.worker   # worker_backend
cp .env.admin.example  .env.admin    # admin_backend
cp sms-gateway/.env.example sms-gateway/.env   # sms-gateway
```

Fill every `CHANGE_ME`/blank. Key cross-references already correct in the examples:
`CUSTOMER_BACKEND_URL=http://node_backend:3000/api/v1`, `WORKER_BACKEND_URL=http://worker_backend:8000/api`, `DATABASE_URL=postgresql+asyncpg://...@postgres:5432/smartworkers`, R2 `S3_*`, SMTP, `CORS_ORIGINS`.

For node_backend additionally set: `JWT_SECRET`, `ENCRYPTION_KEY` (≥32), `ADMIN_SECRET`, `FIREBASE_PROJECT_ID` (verify it matches the app), `DATABASE_URL` (once migrated to PG), and R2 vars for the vault once wired.

For sms-gateway set: `HMAC_SECRET`, `DB_*` (point at the `sms_gateway` DB), `REDIS_*`, provider creds, `ALLOWED_COUNTRIES=IN,...`.

---

## 5. Postgres bootstrap (two databases + roles)

Populate the currently-empty `ops/postgres-init/` so the Postgres container creates both DBs on first run:

```sql
-- ops/postgres-init/01-init.sql
CREATE DATABASE smartworkers;
CREATE DATABASE sms_gateway;
CREATE ROLE smsgw LOGIN PASSWORD :'smsgw_pw';
GRANT ALL PRIVILEGES ON DATABASE sms_gateway TO smsgw;
```
(`worker_backend` runs its own Alembic migrations on boot; sms-gateway creates its tables on boot.)

---

## 6. Complete the docker-compose (add the missing services)

The committed root `docker-compose.yml` defines postgres + worker_backend + admin_backend + the two frontends, but **not** `node_backend`, `sms-gateway`, `redis`, or `caddy` — although `Caddyfile` already routes to `node_backend:3000`. Add these services (illustrative — adapt volumes/healthchecks to match the existing style):

```yaml
  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes", "--maxmemory", "256mb", "--maxmemory-policy", "noeviction"]
    restart: unless-stopped
    volumes: [redis_data:/data]
    healthcheck: { test: ["CMD","redis-cli","ping"], interval: 10s, timeout: 3s, retries: 5 }

  node_backend:
    build: { context: ./workers-portal-backend, dockerfile: Dockerfile }
    restart: unless-stopped
    env_file: .env.node
    volumes: [node_data:/data]          # SQLite persistence (until PG migration)
    depends_on: { postgres: { condition: service_healthy } }
    expose: ["3000"]
    healthcheck: { test: ["CMD","wget","-qO-","http://localhost:3000/health"], interval: 30s, timeout: 5s, retries: 3, start_period: 15s }

  sms_gateway_api:
    build: { context: ./sms-gateway, dockerfile: Dockerfile }
    restart: unless-stopped
    env_file: sms-gateway/.env
    depends_on: { postgres: { condition: service_healthy }, redis: { condition: service_healthy } }
    expose: ["3100"]
    healthcheck: { test: ["CMD","wget","-qO-","http://localhost:3100/health/ready"], interval: 30s, timeout: 5s, retries: 3 }

  sms_gateway_worker:
    build: { context: ./sms-gateway, dockerfile: Dockerfile.worker }
    restart: unless-stopped
    env_file: sms-gateway/.env
    depends_on: { sms_gateway_api: { condition: service_started } }
    # NOTE: scheduler runs inside this process; keep replicas = 1

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80","443:443","443:443/udp"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [node_backend, worker_backend, admin_backend]

volumes:
  redis_data:
  node_data:
  caddy_data:
  caddy_config:
```

(Add a `sync_drain` cron either via host crontab — per `DEPLOY.md` — or a tiny dedicated Compose service that loops `python -m workers.sync_drain`. Keep it single-instance.)

---

## 7. Domain & SSL configuration

1. In Cloudflare DNS add A records `api`, `workers-api`, `admin-api` → VPS IP, **grey cloud** initially.
2. CNAME `workers`, `admin` → Vercel/Pages.
3. `docker compose up -d caddy` → Caddy gets Let's Encrypt certs (HTTP-01).
4. Verify: `curl -I https://api.smartworkers.in/health` (and the other two) → 200.
5. Flip the three A records to **orange (Proxied)**; set Cloudflare SSL = **Full (strict)**.

(Full DNS table in `docs/deployment/03_DNS.md`.)

---

## 8. Database initialization

- worker_backend: **automatic** — `alembic upgrade head` runs in its container CMD on every start.
- sms-gateway: **automatic** — creates its 3 tables at API boot.
- node_backend: creates its SQLite schema + seeds 32 workers at boot (or, post-migration, runs its PG migrations).

No manual schema step needed for first deploy beyond §5's database/role creation.

---

## 9. First deployment

```bash
cd /home/deploy/SmartWorker
docker compose build           # or: docker compose pull   (GHCR images)
docker compose up -d
docker compose logs -f
```

Watch for: Caddy "certificate obtained" ×3; worker_backend `alembic ... done`; sms-gateway `/health/ready` 200; node_backend `/health` 200; admin_backend boot with CORS origins.

**Smoke test (do every deploy):**
```bash
for h in api workers-api admin-api; do curl -fsS https://$h.smartworkers.in/health && echo " $h OK"; done
# functional: request OTP, register a worker, approve in admin → confirm it
# appears in node_backend /workers (the x-admin-secret sync path).
```

Deploy/start order (shared secrets + dependencies): postgres+redis → node_backend → sms-gateway → worker_backend → admin_backend → caddy.

---

## 10. Frontends (SPAs)

```bash
cd worker_website/frontend && npm ci && npm run build   # dist/ → Vercel
cd admin_portal/frontend  && npm ci && npm run build    # dist/ → Vercel
```
`vercel.json` already rewrites `/api/*` to the backend hosts. Set the production rewrite targets to `https://workers-api.smartworkers.in` and `https://admin-api.smartworkers.in` (not the old Railway URLs).

## 11. Mobile apps

```bash
# Worker app → Firebase App Distribution (deploy.sh pattern)
flutter build apk --release
firebase appdistribution:distribute build/app/outputs/flutter-apk/app-release.apk --app <APP_ID> --testers <emails>
```
Customer app: same, plus ensure `api_constants.dart` `baseUrl` points at `https://api.smartworkers.in/api/v1` (currently the Railway URL — update before release).

---

## 12. Update procedure

```bash
ssh deploy@<vps-ip> && cd SmartWorker
# 1. pre-deploy backups (see Operations runbook)
git pull --ff-only
docker compose pull           # or --build
docker compose up -d
docker compose ps && docker compose logs -f --tail=100
# run smoke test (§9)
```
Or let GitHub Actions do it (`docs/deployment/07_CICD.md`).

## 13. Rollback procedure

```bash
# code:
git checkout <previous-sha> && docker compose up -d --build   # or pin GHCR :sha tag
# data (if a migration was crossed):
#   restore the pre-deploy PG dump / SQLite backup (Operations runbook),
#   or: docker compose exec worker_backend alembic downgrade -1
docker compose ps
```
SPAs: Vercel "Promote previous deployment". Mobile: staged-rollout halt in Play Console (a shipped APK can't be recalled).

---

## 14. Post-deploy verification checklist

- [ ] All 4 `/health` (and gateway `/health/ready`) green
- [ ] Customer OTP login works (Firebase + email)
- [ ] Worker registration → OTP (via gateway) → submit with file upload (lands in R2)
- [ ] Admin login (cookie+CSRF), approve a worker → appears in node_backend `/workers`
- [ ] Booking creates → confirmation emails sent
- [ ] `sync_retries` empty / draining; sms-gateway DLQ empty
- [ ] Backups ran; one restore tested this month
- [ ] No secrets in logs

See `docs/deployment/10_READINESS.md` for the full go-live gate.
