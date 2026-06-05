# Smart Workers — Monorepo

Full-stack platform for connecting workers and customers in Kerala.
Three backends, two React frontends (Vercel), two Flutter apps, one SMS gateway — all wired together via Docker Compose behind a Caddy reverse proxy.

---

## Repository Layout

```
SmartWorker/
├── workers-portal-backend/     Node.js / Express  — customer-facing API (port 3000)
├── worker_website/
│   ├── backend/                Python FastAPI      — worker registration API (port 8000)
│   └── frontend/               React               — worker portal UI (Vercel)
├── admin_portal/
│   ├── backend/                Python FastAPI      — admin dashboard API (port 8001)
│   └── frontend/               React               — admin portal UI (Vercel)
├── smart_workers_customer/     Flutter             — customer mobile app (Firebase App Distribution)
├── workers_portal_app/         Flutter             — worker mobile app
├── sms-gateway/                Node.js             — SMS queue microservice
├── docker-compose.yml          brings up all 3 backends + postgres + caddy
├── Caddyfile                   reverse proxy config (auto-HTTPS via Let's Encrypt)
├── deploy.sh                   Firebase APK distribution (Linux / Mac / Git Bash)
├── deploy.ps1                  Firebase APK + backend deployment (Windows PowerShell)
├── DEPLOY.md                   full production runbook — READ THIS FIRST
└── .env.*.example              env templates for each service
```

---

## Architecture at a Glance

```
Internet
   |
Cloudflare (DNS + DDoS + CDN)
   |
Caddy (auto-HTTPS, reverse proxy)
   |---> api.smartworkers.in          --> node_backend   :3000
   |---> workers-api.smartworkers.in  --> worker_backend :8000
   \---> admin-api.smartworkers.in    --> admin_backend  :8001

Frontends (not in docker-compose — deployed to Vercel):
   workers.smartworkers.in  --> worker_website/frontend
   admin.smartworkers.in    --> admin_portal/frontend

Mobile apps:
   Customer app  --> smart_workers_customer (Flutter, Firebase App Distribution)
   Worker app    --> workers_portal_app (Flutter)
```

All three backends share one Postgres 16 container. `ADMIN_SECRET` is a shared token that ties node_backend to worker_backend and admin_backend — it must match across the relevant .env files (see below).

---

## Current Status (as of handover)

| Item | Status |
|---|---|
| All backend source code | In repo |
| docker-compose.yml + Caddyfile | In repo, tested |
| .env files (secrets) | **NOT in git** — get them from hareesh (securely) |
| Local Docker on Windows (Dell Inspiron 3505) | Blocked — AMD SVM virtualization not activating. Needs BIOS update or VPS deploy |
| VPS (Hetzner CX22) | Not provisioned yet |
| Domain + Cloudflare DNS | Not set up yet |
| Firebase service account JSON | Not filled in .env.node yet |
| SMTP credentials | Not filled in yet |
| Cloudflare R2 bucket | Not created yet |
| Sentry SDK | Not wired in (TODO) |
| Admin password bcrypt hash | Placeholder in .env.admin — must change before production |

---

## Environment Files (Secrets — Not in Git)

There are four `.env` files that must never be committed. Get the current versions from hareesh via a secure channel (WhatsApp, Signal, 1Password, etc.) — do NOT email them.

| File | Used by | Key secrets |
|---|---|---|
| `.env` | docker-compose (postgres) | `POSTGRES_PASSWORD` |
| `.env.node` | node_backend | `JWT_SECRET`, `ENCRYPTION_KEY`, `ADMIN_SECRET`, Firebase JSON, SMTP |
| `.env.worker` | worker_backend | `ADMIN_SECRET` (must match .env.node's value), R2 creds, SMTP |
| `.env.admin` | admin_backend | `JWT_SECRET`, `ADMIN_PASSWORD_HASH`, `CUSTOMER_BACKEND_ADMIN_SECRET` |

Template files (`.env.*.example`) are in the repo and show every key that needs a value.

**Secret cross-references that must match:**
- `ADMIN_SECRET` in `.env.node` == `ADMIN_SECRET` in `.env.worker`
- `ADMIN_SECRET` in `.env.node` == `CUSTOMER_BACKEND_ADMIN_SECRET` in `.env.admin`

---

## How to Deploy (Production Path)

Local Docker is not required. The production target is a Linux VPS. See [DEPLOY.md](DEPLOY.md) for the full step-by-step runbook. Summary:

### Step 1 — Provision a Hetzner CX22 VPS
- Sign up at hetzner.com, create a CX22 (Ubuntu 24.04 LTS, ~€4.50/mo)
- Note the public IP

### Step 2 — Point DNS to the VPS
In Cloudflare DNS, create A records pointing to the VPS IP:
- `api.smartworkers.in`
- `workers-api.smartworkers.in`
- `admin-api.smartworkers.in`

Keep proxy status **DNS only** (grey cloud) until Caddy issues TLS certs.

### Step 3 — Set up the VPS

```bash
ssh root@<vps-ip>
adduser deploy --disabled-password --gecos ""
usermod -aG sudo deploy
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
apt install -y ufw fail2ban
ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable
```

### Step 4 — Clone and configure

```bash
ssh deploy@<vps-ip>
git clone https://github.com/d-r-o-g-o/SmartWorker.git
cd SmartWorker
# Upload the four .env files from your local machine:
# scp .env .env.node .env.worker .env.admin deploy@<vps-ip>:/home/deploy/SmartWorker/
```

### Step 5 — Deploy services one by one

```bash
docker compose up -d postgres
docker compose logs -f postgres          # wait for "ready to accept connections"

docker compose up -d node_backend
docker compose logs -f node_backend      # wait for health check OK

docker compose up -d worker_backend
docker compose logs -f worker_backend

docker compose up -d admin_backend
docker compose logs -f admin_backend

docker compose up -d caddy
docker compose logs -f caddy             # watch for TLS cert issuance
```

### Step 6 — Verify

```bash
curl -I https://api.smartworkers.in/health
curl -I https://workers-api.smartworkers.in/health
curl -I https://admin-api.smartworkers.in/health
```

All three should return `HTTP/2 200`. Then flip Cloudflare DNS to **Proxied** (orange cloud).

---

## Windows Deployment Helper

`deploy.ps1` is a PowerShell script covering everything from a Windows machine:

```powershell
# Generate secrets for all .env files
.\deploy.ps1 secrets

# First-time backend deploy (copies .env templates, builds, starts)
.\deploy.ps1 backend first

# Pull latest + rebuild
.\deploy.ps1 backend update

# Stream logs
.\deploy.ps1 backend logs

# Health check (production)
.\deploy.ps1 health smartworkers.in

# Distribute Flutter APK to Firebase testers
.\deploy.ps1 apk <FIREBASE_APP_ID> tester@email.com
```

---

## Frontends (Vercel)

Both React frontends are deployed independently to Vercel (not part of docker-compose).

```bash
# worker_website/frontend
cd worker_website/frontend
vercel --prod

# admin_portal/frontend
cd admin_portal/frontend
vercel --prod
```

Add environment variables in the Vercel dashboard pointing to the live API URLs.

---

## Flutter Customer App (APK Distribution)

```bash
cd smart_workers_customer
flutter build apk --release

# Linux/Mac
bash deploy.sh <FIREBASE_APP_ID> tester@email.com

# Windows
.\deploy.ps1 apk <FIREBASE_APP_ID> tester@email.com
```

---

## Still TODO (from DEPLOY.md)

- [ ] Provision VPS and set up DNS (Cloudflare)
- [ ] Create Cloudflare R2 bucket `smartworkers-uploads`, fill R2 creds in `.env.worker`
- [ ] Add Firebase service account JSON to `.env.node`
- [ ] Add SMTP credentials (Resend or Brevo) to `.env.node` and `.env.worker`
- [ ] Set a real bcrypt `ADMIN_PASSWORD_HASH` in `.env.admin`
- [ ] Wire Sentry SDK into both Python backends (`sentry-sdk[fastapi]`)
- [ ] Move admin/worker frontend tokens from `localStorage` to httpOnly cookies
- [ ] Certificate pinning in the Flutter Dio client
- [ ] Set up nightly Postgres backup cron to R2
- [ ] Wire GitHub Actions for auto-deploy on push to master
