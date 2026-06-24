# Smart Workers — Monorepo

**GitHub:** https://github.com/d-r-o-g-o/SmartWorker

Kerala-focused platform connecting customers with skilled workers. Three backends, two React frontends, two Flutter apps, one SMS gateway.

---

## Repository Map

```
SmartWorker/
├── workers-portal-backend/     Node.js/Express   — customer API        (port 3000)
├── worker_website/
│   ├── backend/                Python FastAPI    — worker registration  (port 8000)
│   └── frontend/               React + Vite      — worker portal UI
├── admin_portal/
│   ├── backend/                Python FastAPI    — admin dashboard API  (port 8001)
│   └── frontend/               React + Vite      — admin portal UI
├── smart_workers_customer/     Flutter           — customer mobile app
├── workers_portal_app/         Flutter           — worker mobile app
├── sms-gateway/                Node.js           — SMS queue service
└── docker-compose.yml          production wiring (postgres + caddy + all 3 backends)
```

---

## How Services Talk to Each Other

```
Customer Flutter app
    --> workers-portal-backend (Node.js, :3000)
            --> worker_website/backend (/api/workers)  via ADMIN_SECRET header
            --> admin_portal/backend                   via CUSTOMER_BACKEND_ADMIN_SECRET

Worker React frontend
    --> worker_website/backend (FastAPI, :8000)

Admin React frontend
    --> admin_portal/backend (FastAPI, :8001)
            --> workers-portal-backend  (proxies customer data)
            --> worker_website/backend  (proxies worker data)
```

**Two shared secrets tie the services together — they must match across .env files:**
- `ADMIN_SECRET` in `.env.node` must equal `ADMIN_SECRET` in `.env.worker`
- `ADMIN_SECRET` in `.env.node` must equal `CUSTOMER_BACKEND_ADMIN_SECRET` in `.env.admin`

---

## Running Locally (no Docker needed)

Each backend has a dev-friendly fallback — SQLite instead of Postgres, local disk instead of R2. You can run any one service in isolation.

### 1. Node.js backend (`workers-portal-backend`)

Uses **SQLite** locally — no database setup needed. Auto-creates schema and seeds 33 Kerala workers on first run.

```bash
cd workers-portal-backend
cp .env.example .env        # edit: set JWT_SECRET, ENCRYPTION_KEY, ADMIN_SECRET to anything
npm install
npm run dev                  # starts on :3000, hot-reloads on file changes
```

Minimal `.env` for local work:
```
NODE_ENV=development
PORT=3000
JWT_SECRET=any-long-random-string
ENCRYPTION_KEY=exactly-32-characters-here!!
ADMIN_SECRET=any-secret
```

**API routes** (`/api/v1/...`):

| Route | What it does |
|---|---|
| `GET /health` | Health check |
| `POST /auth/...` | Firebase phone auth + email/OTP auth |
| `GET /workers` | List/search workers |
| `POST /bookings` | Create booking |
| `GET /bookings/:id` | Booking detail |
| `POST /feedback` | Submit worker review |
| `POST /grievances` | Raise a grievance |
| `GET /vault/...` | Encrypted customer vault data |
| `GET /admin/...` | Admin-only endpoints (requires `x-admin-secret` header) |

---

### 2. Worker backend (`worker_website/backend`)

Uses **SQLite** when `ENV=development` and no `DATABASE_URL` is set. File uploads go to a local `uploads/` folder.

```bash
cd worker_website/backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# or: source .venv/bin/activate  (Mac/Linux)
pip install -r requirements.txt
```

Create a minimal `.env`:
```
ENV=development
ADMIN_SECRET=any-secret          # must match workers-portal-backend's ADMIN_SECRET
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

```bash
uvicorn main:app --reload --port 8000
```

Interactive API docs at `http://localhost:8000/docs`.

**API routes** (`/api/...`):

| Route | What it does |
|---|---|
| `POST /auth/request-otp` | Send OTP to worker's phone/email |
| `POST /auth/verify-otp` | Verify OTP, return session token |
| `GET /workers/me` | Get own profile |
| `POST /workers/register` | Worker self-registration |
| `PUT /workers/me` | Update profile |
| `POST /workers/me/documents` | Upload KYC documents |
| `POST /workers/me/photo` | Upload profile photo |

---

### 3. Admin backend (`admin_portal/backend`)

**Stateless proxy** — has no database of its own. Calls node_backend and worker_backend using admin secrets. Both other backends must be running (or pointed at staging URLs) for admin to work.

```bash
cd admin_portal/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create a minimal `.env`:
```
ENV=development
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$placeholder    # or set ADMIN_PASSWORD=anypassword for dev only
JWT_SECRET=any-long-string
CUSTOMER_BACKEND_URL=http://localhost:3000/api/v1
CUSTOMER_BACKEND_ADMIN_SECRET=any-secret  # must match node backend's ADMIN_SECRET
WORKER_BACKEND_URL=http://localhost:8000/api
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

```bash
uvicorn main:app --reload --port 8001
```

Interactive API docs at `http://localhost:8001/docs`.

---

### 4. Worker frontend (`worker_website/frontend`)

```bash
cd worker_website/frontend
npm install
npm run dev          # starts on :5173
```

Points to `http://localhost:8000` by default for local dev.

---

### 5. Admin frontend (`admin_portal/frontend`)

```bash
cd admin_portal/frontend
npm install
npm run dev          # starts on :5174 (or next available port)
```

Points to `http://localhost:8001` by default for local dev.

---

### 6. Flutter apps

```bash
# Customer app
cd smart_workers_customer
flutter pub get
flutter run

# Worker app
cd workers_portal_app
flutter pub get
flutter run
```

---

## Environment Files

The four `.env` files are **not in git** (they contain secrets). Get them from Hareesh via WhatsApp/Signal — never email.

| File | Lives in | Used by |
|---|---|---|
| `.env` | repo root | docker-compose (postgres password) |
| `.env.node` | repo root | workers-portal-backend |
| `.env.worker` | repo root | worker_website/backend |
| `.env.admin` | repo root | admin_portal/backend |

Each service also has an `.env.example` in its own folder showing the minimum keys needed for local development.

---

## What Needs Work (Open TODOs)

These are the known incomplete or placeholder items across the codebase:

### Security
- [ ] **httpOnly cookies** — admin and worker frontend JWTs are currently stored in `localStorage`. Move them to httpOnly cookies so they are not accessible to JS (XSS protection). Affects `admin_portal/frontend` and `worker_website/frontend`.
- [ ] **Certificate pinning** — the Flutter customer app uses Dio for HTTP. Add certificate pinning in `smart_workers_customer` so the app rejects MITM'd connections.
- [ ] **Sentry error tracking** — wire `sentry-sdk[fastapi]` into `worker_website/backend` and `admin_portal/backend`. Node.js backend can use `@sentry/node`.

### Flutter customer app
- [ ] **Theme cleanup** — non-auth screens still reference the old `kBrandDeep` colour constants. Refactor them to use the new theme tokens (check `smart_workers_customer/lib/core/theme/`).

### Infrastructure (only matters for deployment, not local dev)
- [ ] Set up Hetzner CX22 VPS and point Cloudflare DNS A records at it
- [ ] Create Cloudflare R2 bucket `smartworkers-uploads`, add creds to `.env.worker`
- [ ] Add Firebase service account JSON to `.env.node`
- [ ] Add SMTP credentials to `.env.node` and `.env.worker`
- [ ] Set a real bcrypt `ADMIN_PASSWORD_HASH` in `.env.admin`
- [ ] Set up nightly Postgres backup cron to R2
- [ ] Wire GitHub Actions for auto-deploy on push to master

---

## Repo Conventions

- **Python backends**: PEP8, `structlog` for structured JSON logging, `slowapi` for rate limits, `alembic` for DB migrations (worker_backend only)
- **Node.js backend**: ES modules (`import`/`export`), controller-service pattern, Zod for input validation
- **React frontends**: Vite, no SSR
- **Flutter**: feature-first folder layout under `lib/features/`
- **Secrets**: never hardcode — always read from env. Config modules (`config.py`, `src/config/env.js`) crash-fast if required vars are missing in production.
