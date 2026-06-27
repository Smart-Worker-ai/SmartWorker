# Network & Security Architecture

> Combines the Networking and Security deliverables. Every control maps to
> something already in the code (headers, CORS, HMAC, CSRF, admin-secret) or a
> concrete gap found during analysis.

---

## PART A — NETWORKING

### A1. Internal service communication

All service-to-service traffic stays on the **Docker bridge network** by service name (never public):

| Caller | Callee | Path | Auth |
|---|---|---|---|
| worker_backend | node_backend | `http://node_backend:3000/api/v1/admin/workers` | `x-admin-secret` header `[routers/workers.py:572-627]` |
| worker_backend | sms-gateway | `http://sms-gateway:3100/api/v1/otp/*` | HMAC-SHA256 (`x-signature/x-timestamp/x-nonce`) `[auth.ts]` |
| admin_backend | node_backend | `http://node_backend:3000/api/v1/admin/*` | `x-admin-secret` (`CUSTOMER_BACKEND_ADMIN_SECRET`) `[deps/config]` |
| admin_backend | worker_backend | `http://worker_backend:8000/api/workers/admin/*` | `x-admin-secret` |
| sms-gateway worker | Redis / Postgres | bridge | password / TLS |

The `*_BACKEND_URL` envs already use docker-internal hostnames (`http://node_backend:3000`, `http://worker_backend:8000`) in the examples — keep it that way; internal calls must **not** traverse the public internet or Cloudflare.

### A2. Public endpoints (the only things internet-reachable)

- `api.crewzo.in` → node_backend (Flutter apps)
- `workers-api.crewzo.in` → worker_backend (worker website)
- `admin-api.crewzo.in` → admin_backend (admin panel)
- `workers.` / `admin.` SPAs (Vercel/Pages CDN)

### A3. Private services (never publicly routable)

- `sms-gateway` (HMAC service-to-service) — bridge only
- Redis 6379, Postgres 5432 — bridge / `127.0.0.1` / managed private endpoint
- sms-gateway queue worker & scheduler (no ports at all `[Dockerfile.worker]`)
- Grafana/Prometheus — behind auth / Cloudflare Access only

### A4. Firewall rules (VM, ufw)

```
allow 22/tcp   (SSH — restrict to your IP / VPN; key-only)
allow 80/tcp   (Caddy, ACME + redirect)
allow 443/tcp  (Caddy)
deny  everything else inbound
```
Exactly the `DEPLOY.md §2.3` ufw setup. **Do not** publish 3000/8000/8001/3100/5432/6379 on the public interface. Optionally restrict 80/443 to **Cloudflare IP ranges only** so the origin can't be hit directly (origin-lockdown).

### A5. Port exposure summary

| Port | Service | Exposure |
|---|---|---|
| 443/80 | Caddy | Public |
| 3000 | node_backend | Bridge only |
| 8000 | worker_backend | Bridge only |
| 8001 | admin_backend | Bridge only |
| 3100 | sms-gateway API | Bridge only |
| 6379 | Redis | Bridge / localhost |
| 5432 | Postgres | localhost / managed-private |
| 9090 | Prometheus | localhost / protected |

### A6. TLS termination & certificate management

- **Edge:** Cloudflare manages public certs (auto-renew).
- **Origin:** Caddy obtains Let's Encrypt certs via HTTP-01 and **auto-renews** — zero manual cert ops `[Caddyfile]`. Cert/key persisted in the `caddy_data` volume (gitignored).
- **Mode:** Cloudflare **Full (strict)** so edge↔origin is also encrypted and validated.
- **Managed PG/Redis:** TLS via connection string flags.

### A7. Service discovery

Docker Compose DNS (service names on the bridge) — sufficient and already used. No Consul/etcd needed at this scale. If you later split across hosts, move to a managed network (Tailscale/WireGuard) or the orchestrator's service discovery.

---

## PART B — SECURITY

### B1. HTTPS

Enforced end-to-end: Cloudflare edge + Caddy origin, **HSTS preload already set** on every backend host `[Caddyfile:29, worker_backend main.py:44-58]`. Confirm `includeSubDomains; preload` and submit to the HSTS preload list once stable.

### B2. Secrets management

**Current state is the biggest security problem:**
- 🔴 **Live secrets committed to git** in `PROJECT_REFERENCE.md`: Gmail app password `<REDACTED-ROTATE-GMAIL-APP-PW>`, `<REDACTED-ROTATE-ADMIN-PW>`, `ADMIN_SECRET` value. **Rotate all of them and purge from history** (`git filter-repo`), or the repo is compromised the moment it's pushed.
- Env files are correctly gitignored `[.gitignore]` — good.
- **Action:** move secrets to a manager (Docker secrets / SOPS+age / Cloudflare/Vault). At minimum, keep `.env.*` off git (already so) and store an encrypted backup copy in a private vault.
- Cross-service shared secrets that **must match**: `ADMIN_SECRET` (worker_backend ↔ node_backend) and `CUSTOMER_BACKEND_ADMIN_SECRET` (admin_backend ↔ node_backend) and the sms-gateway `HMAC_SECRET` (worker_backend ↔ gateway). Rotate these **in lockstep** or sync/OTP starts 403'ing.

### B3. Environment variables

- All four backends validate critical envs and **refuse to start with dev defaults in prod** (worker/admin `config.py`, sms-gateway zod config). Keep that behaviour.
- `node_backend` is weaker — `ADMIN_SECRET` falls back to `'admin-dev-secret-change-me'` `[admin.routes.js]` and `ENCRYPTION_KEY`/`JWT_SECRET` have no hard prod guard. **Add a startup assertion** that these are set and ≥32 chars.

### B4. Authentication

| Surface | Mechanism | Status |
|---|---|---|
| Customer phone | Firebase OTP → app JWT (local RS256 verify, `aud=FIREBASE_PROJECT_ID`) `[firebase-verify.service.js]` | OK |
| Customer/worker email | 6-digit OTP, 10-min expiry `[auth.service.js]` | OK |
| Email+password | PBKDF2 100k/SHA-512, 5/15min lockout `[auth.service.js]` | OK |
| Worker registration | OTP via sms-gateway, 24h session cookie | OK |
| Admin | bcrypt + HS256 JWT (12h) + CSRF | OK |
| Service-to-service | `x-admin-secret` shared secret; HMAC for sms-gateway | OK (rotate secrets) |

JWT expiries differ by design: customer 30d (mobile UX), admin 12h (privileged). Acceptable.

### B5. Authorization

- Admin endpoints on node_backend are gated solely by the `x-admin-secret` header `[admin.routes.js:13-20]` — there are **no admin user roles** in node_backend; the *only* thing protecting customer/worker bulk data is that one secret. Treat it like a root key: long, rotated, never logged, never client-side.
- admin_backend adds real user auth (bcrypt+JWT+CSRF) in front of those proxied calls — good layering.

### B6. Rate limiting

- worker_backend & admin_backend: **slowapi** per-IP (`5/hour` OTP request, `10/hour` verify, `3/hour` register, `10/min` login) `[config.py]`.
- node_backend: app-level login lockout (5/15min) but **no general per-IP rate limiter** on OTP send → add one (express-rate-limit) to stop OTP-spam / SMS-cost abuse.
- sms-gateway: express-rate-limit + per-phone/per-IP OTP caps + circuit breaker `[.env.example, sendWorker.ts]`.
- Add **Cloudflare rate-limiting rules** at the edge as defence-in-depth on `/auth/*`.

### B7. CORS

Explicit allow-lists, no wildcards in prod, enforced in all three HTTP backends `[main.py / app.js]`. Keep aligned with DNS (`03_DNS.md §4`).

### B8. Secure headers

Already set (HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy) at both Caddy and the FastAPI layer `[Caddyfile, worker_backend main.py:44-58]`. Add a **Content-Security-Policy** on the SPAs (not present) and `-Server` header strip (Caddy already does).

### B9. Session management

- Admin: httpOnly `admin_session` cookie + CSRF double-submit `[deps.py:41-71]` — correct pattern.
- Worker registration: httpOnly session cookie (24h) + Bearer fallback.
- Mobile: JWT in `flutter_secure_storage` (Keychain/Keystore) — good.
- 🟠 `DEPLOY.md` notes admin/worker frontend tokens were in `localStorage` historically — confirm the migration to httpOnly cookies is complete (admin_backend code now sets cookies, so the path exists).
- Add **certificate pinning** in the Flutter Dio client (flagged as TODO in `DEPLOY.md`) for the `api.` host.

### B10. Logging

Structured JSON everywhere (structlog / Morgan / winston / Caddy). **Never log secrets, OTPs, full tokens, or `x-admin-secret`.** Audit the log statements before shipping; sms-gateway hashes phone numbers (`to_hash`, `phone_hash`) — good practice; apply the same to the other services' logs.

### B11. Audit trails

- sms-gateway has a dedicated **`audit_events`** table (action, actor, ip, outcome) `[models/database.ts]` — keep, retain long.
- worker_backend has a **`worker_events`** log (admin actions, approvals) `[models.py]` surfaced via `/workers/admin/events` — this is your admin audit trail; **retain and protect it**.
- node_backend has **no audit log** for admin actions — add one for approve/reject/block/delete on customers and workers (compliance + abuse investigation).
