# SMS Gateway — Production Architecture

A **provider-agnostic, queue-driven, multi-route SMS gateway** for OTP delivery, transactional notifications, and real-time user updates.

---

## Architecture Overview

```
Application → SMS Gateway API (HTTP + HMAC) → Priority Queue (Redis/BullMQ)
                                                       │
                                                       ▼
                                              Worker Pool (stateless)
                                              ├── Routing & Policy Engine
                                              ├── Circuit Breaker
                                              └── Provider Health Scoring
                                                       │
                        ┌──────────────┬───────────────┼───────────────┐
                        ▼              ▼               ▼               ▼
                   Twilio         Plivo          MSG91         Fast2SMS
                   (Tier-1)       (Tier-2)       (India)       (Budget)
                        │              │               │               │
                        └──────── Delivery Receipts (DLR webhooks) ────┘
                                               │
                                               ▼
                              PostgreSQL + Prometheus + Grafana
```

### Core Principles
- **Channel-agnostic** — route is decided at dispatch time (SMS/WhatsApp/Voice)
- **Idempotent** — every send has an idempotency key; retries never duplicate
- **Asynchronous** — API enqueues and returns immediately
- **Observable** — every state transition is logged with a correlation ID
- **Provider-pluggable** — adding a provider is a config change, not code

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Option 1: Docker Compose (recommended)

```bash
# 1. Copy environment config
cp .env.example .env
# Edit .env with your values

# 2. Start all services
cd docker && docker compose up -d

# Services:
#   API:        http://localhost:3100
#   Prometheus: http://localhost:9090
#   Grafana:    http://localhost:3200
```

### Option 2: Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and edit environment config
cp .env.example .env

# 3. Start PostgreSQL and Redis (ensure they're running)

# 4. Start the API server
npm run dev

# 5. Start workers (separate terminal)
npm run dev:worker
```

---

## Environment Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `HMAC_SECRET` | ✅ | 64+ char secret for request signing |
| `DB_PASSWORD` | ✅ | PostgreSQL password |
| `OTP_PEPPER` | ✅ | 16+ char pepper for OTP hashing |
| `TWILIO_*` | One provider | Twilio credentials |
| `PLIVO_*` | One provider | Plivo credentials |
| `MSG91_*` | One provider | MSG91 credentials |
| `ALLOWED_COUNTRIES` | ✅ | Comma-separated ISO country codes |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## API Reference

### Health Check
```
GET /health              → liveness probe
GET /health/ready        → readiness probe (checks DB + Redis)
GET /health/status       → detailed system status
GET /metrics             → Prometheus metrics
```

### Send OTP
```
POST /api/v1/otp/send
Content-Type: application/json
X-Signature: <hmac>
X-Timestamp: <epoch-ms>
X-Nonce: <random>

{
  "phone": "+919876543210",
  "tenantId": "my-app"
}

Response 200:
{
  "success": true,
  "data": {
    "otpId": "uuid",
    "expiresAt": "2026-05-16T13:10:00Z",
    "resendCooldownSeconds": 30
  }
}
```

### Verify OTP
```
POST /api/v1/otp/verify
{
  "phone": "+919876543210",
  "otp": "123456",
  "tenantId": "my-app"
}

Response 200:
{
  "success": true,
  "data": { "verified": true }
}
```

### Send Message
```
POST /api/v1/messages/send
{
  "to": "+919876543210",
  "body": "Your order has been shipped!",
  "priority": "transactional",
  "idempotencyKey": "order-123-shipped"
}

Response 202:
{
  "success": true,
  "data": { "messageId": "uuid" }
}
```

### Check Message Status
```
GET /api/v1/messages/:id/status
```

---

## Project Structure

```
sms-gateway/
├── src/
│   ├── index.ts                    # API entry point
│   ├── config/
│   │   └── index.ts                # Zod-validated environment config
│   ├── api/
│   │   ├── middleware/
│   │   │   ├── auth.ts             # HMAC authentication
│   │   │   └── errorHandler.ts     # Global error handler
│   │   └── routes/
│   │       ├── otp.ts              # OTP send/verify endpoints
│   │       ├── messages.ts         # Message send/status endpoints
│   │       ├── webhooks.ts         # DLR webhook receivers
│   │       └── health.ts           # Health/metrics endpoints
│   ├── services/
│   │   ├── otpService.ts           # OTP lifecycle management
│   │   ├── messageService.ts       # Message routing & idempotency
│   │   └── rateLimiter.ts          # Multi-dimensional rate limiting
│   ├── providers/
│   │   ├── index.ts                # Provider registry
│   │   ├── twilio.ts               # Twilio integration
│   │   ├── plivo.ts                # Plivo integration
│   │   ├── msg91.ts                # MSG91 integration (India/DLT)
│   │   ├── textlocal.ts            # TextLocal integration
│   │   ├── fast2sms.ts             # Fast2SMS integration
│   │   └── mock.ts                 # Mock provider (dev/test)
│   ├── workers/
│   │   ├── index.ts                # Worker entry point
│   │   ├── sendWorker.ts           # Message dispatch with failover
│   │   └── scheduler.ts            # Periodic tasks (expiry, cleanup)
│   ├── queue/
│   │   └── index.ts                # BullMQ priority queue manager
│   ├── models/
│   │   ├── database.ts             # PostgreSQL + migrations
│   │   └── redis.ts                # Redis connection manager
│   ├── utils/
│   │   ├── crypto.ts               # OTP generation, hashing, HMAC
│   │   ├── phone.ts                # libphonenumber validation
│   │   ├── logger.ts               # Structured logging + PII redaction
│   │   ├── metrics.ts              # Prometheus metrics
│   │   └── circuitBreaker.ts       # Circuit breaker for providers
│   └── types/
│       └── index.ts                # All TypeScript type definitions
├── docker/
│   ├── docker-compose.yml          # Full stack deployment
│   └── prometheus.yml              # Prometheus scrape config
├── tests/
├── Dockerfile                      # API container
├── Dockerfile.worker               # Worker container
├── .env.example                    # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

---

## Deployment

### Production Deployment (Docker)

```bash
# Build and deploy
docker compose -f docker/docker-compose.yml up -d --build

# Scale workers
docker compose -f docker/docker-compose.yml up -d --scale worker=3
```

### Production Checklist
- [ ] At least 2 SMS providers configured and tested
- [ ] HMAC secret is 64+ characters, unique per environment
- [ ] OTP pepper is 16+ characters, unique per environment
- [ ] Country allow-list configured (ALLOWED_COUNTRIES)
- [ ] Rate limits tested under load
- [ ] TLS configured (use Caddy or nginx in front)
- [ ] Database backups automated
- [ ] Prometheus + Grafana dashboards configured
- [ ] Alert rules set for delivery rate, queue depth, DLQ

---

## Security Features
- HMAC-SHA256 signed requests with nonce replay protection
- OTPs hashed with bcrypt + pepper (never stored plaintext)
- Phone numbers stored as HMAC-SHA256 hashes
- PII auto-redacted from production logs
- Country allow-list blocks SMS pumping attacks
- Multi-dimensional rate limiting (phone/IP/user/tenant/country)
- Escalating resend cooldowns (30s → 60s → 120s)
- Constant-time OTP comparison

---

## License

Internal — SmartWorker Project
