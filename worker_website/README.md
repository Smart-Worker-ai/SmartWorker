# Crewzo — Worker Portal

Worker registration and authentication portal for the Crewzo platform.

- **Backend**: FastAPI (Python) with async SQLAlchemy, PostgreSQL
- **Frontend**: React 18 + Vite with TailwindCSS
- **Auth**: OTP login via SMS Gateway service
- **Storage**: S3-compatible (R2, Wasabi, MinIO)

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- Docker (optional)

### Backend Setup

```bash
cd worker_website/backend

# Install dependencies
pip install -r requirements.txt

# Configure environment (copy and fill .env.example)
cp .env.example .env

# Run migrations
alembic upgrade head

# Start dev server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd worker_website/frontend

# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build
```

## Environment Variables

### Backend (.env)

**Required in production, optional in dev:**
- `DATABASE_URL`: PostgreSQL connection string (falls back to SQLite in dev)
- `ADMIN_SECRET`: Shared secret for admin endpoints (rotate after deploy)
- `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`: S3-compatible storage
- `SMS_GATEWAY_URL`, `SMS_GATEWAY_HMAC_SECRET`: SMS Gateway service endpoint

**Optional (sensible defaults provided):**
- `ENV`: `development` or `production` (default: dev)
- `CORS_ORIGINS`: Comma-separated allow-list (default: localhost:5173,5174)
- `SESSION_TTL_HOURS`: Worker session validity (default: 24)
- `RATELIMIT_REGISTRATION`: Rate limit for /register (default: 3/hour)
- `RATELIMIT_OTP_REQUEST`: Rate limit for OTP send (default: 5/hour)
- `RATELIMIT_OTP_VERIFY`: Rate limit for OTP verify (default: 10/hour)
- `MAX_DOC_SIZE_MB`: Max file size for passbook/aadhaar (default: 5)
- `MAX_PHOTO_SIZE_MB`: Max file size for profile photo (default: 2)

See [.env.example](worker_website/backend/.env.example) for full list.

## API Endpoints

### Authentication
- `POST /api/auth/request-otp` — Send OTP to registered mobile
- `POST /api/auth/verify-otp` — Verify OTP, create session
- `POST /api/auth/logout` — Revoke session

### Workers
- `POST /api/workers/register` — Register new worker
- `GET /api/workers/public` — List approved workers (public)
- `GET /api/workers/{id}` — Get public worker profile
- `GET /api/workers/me` — Get authenticated worker profile
- `GET /api/workers/me/referral` — Get referral link + QR code

### Admin (requires `x-admin-secret` header)
- `GET /api/workers/admin/all` — List all workers
- `GET /api/workers/admin/events` — Activity feed
- `POST /api/workers/admin/{id}/approve` — Approve worker
- `POST /api/workers/admin/{id}/reject` — Reject application
- `POST /api/workers/admin/{id}/block` — Block worker
- `POST /api/workers/admin/{id}/unblock` — Unblock worker
- `DELETE /api/workers/admin/{id}` — Delete worker

## Testing

### Backend
```bash
cd worker_website/backend
pip install -r requirements-test.txt
pytest tests/ -v          # Run all tests
pytest tests/test_auth.py # Run auth tests only
pytest --cov             # With coverage report
```

**Status**: 27/30 tests passing (90%)
- 11/11 auth tests ✅
- 16/19 worker tests ✅

### Frontend
```bash
cd worker_website/frontend
npm install
npm run test              # Run tests
npm run test:ui          # Interactive UI
npm run test:coverage    # Coverage report
```

**Status**: Test infrastructure ready, example tests provided

## Architecture

### Backend Structure
```
backend/
├── main.py              # FastAPI entry, routes, middleware
├── routers/
│   ├── auth.py         # OTP login/logout
│   └── workers.py      # Registration, admin actions
├── models.py           # SQLAlchemy ORM
├── db.py               # Database connection
├── config.py           # Environment config (fail-fast)
├── security.py         # File validation, authorization
├── email_service.py    # Email notifications
├── sms_gateway_client.py # SMS Gateway API client
├── storage.py          # S3 upload/download
├── rate_limit.py       # Rate limiting (slowapi)
├── alembic/            # Database migrations
└── tests/              # Unit + integration tests
```

### Frontend Structure
```
frontend/
├── src/
│   ├── App.jsx                   # Root router
│   ├── main.jsx                  # Entry point
│   ├── pages/
│   │   ├── LandingPage.jsx      # Welcome + login
│   │   ├── RegisterPage.jsx     # Worker registration form
│   │   ├── TermsPage.jsx        # T&Cs
│   │   ├── SuccessPage.jsx      # Registration confirmation
│   │   └── DashboardPage.jsx    # Authenticated worker dashboard
│   ├── context/
│   │   └── ThemeContext.jsx     # Dark mode + i18n
│   └── tests/                    # Component tests
├── vite.config.js
├── vitest.config.js             # Test configuration
└── tailwind.config.js
```

## Deployment

### Railway (Current Production)

Backend: https://smart-workers-backend-production.up.railway.app
Frontend: Connected via CORS allow-list

**Deploy:**
1. Merge to `main` branch
2. Railway auto-deploys via Git webhook
3. Run `alembic upgrade head` on first deploy only
4. Set environment variables in Railway dashboard

**Logs**: `railway logs` or Railway dashboard

### Docker Compose (Local Dev)

```bash
docker-compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# Postgres: localhost:5432
```

See docker-compose.yml for full setup.

## Common Issues

**"OTP verification failed"**
- SMS Gateway service must be running (prod requirement)
- Check `SMS_GATEWAY_URL` and `SMS_GATEWAY_HMAC_SECRET` are correct

**"Invalid profile image"**
- Image must be JPEG/PNG, ≤ 2 MB
- Passbook/Aadhaar must be PDF, ≤ 5 MB

**"Rate limit exceeded"**
- Per-IP rate limits: check `/workers/admin/events` for suspicious activity
- Adjust via `RATELIMIT_*` environment variables if needed

**"Worker not found" in admin panel**
- Worker must be approved to appear in public listings
- Blocked workers return 404 to hide enumeration

## Security

- **No hardcoded secrets**: All env vars read at startup, fail-fast if missing
- **HTTPS only in prod**: Secure cookies, HSTS header
- **CORS explicit allow-list**: No wildcard (`*`) in production
- **Rate limiting**: Per-IP, protects auth endpoints
- **Constant-time OTP comparison**: Via SMS Gateway service
- **Session validation**: Server-side, expiry checks
- **Input validation**: File type/size checks, mobile number normalization
- **Structured logging**: JSON output for audit trail

## Monitoring

**Metrics to watch** (Railway / Grafana):
- Request latency (p95, p99)
- Error rate (5xx, 4xx auth failures)
- OTP verify success rate
- File upload success rate
- Database query performance (especially worker listing)

**Alerts:**
- Error rate > 5%
- Response time p95 > 500ms
- Disk usage > 80%

## Roadmap

- [ ] Email OTP fallback when SMS fails
- [ ] Referral system analytics
- [ ] Bulk worker import (CSV)
- [ ] Two-factor authentication (2FA)
- [ ] Background job queue for async notifications
- [ ] API rate limit dashboard

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Write tests for new code
3. Ensure `pytest` and `npm run test` pass
4. Open PR, describe changes

## License

Proprietary — Crewzo Platform
