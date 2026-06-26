# Scaling Strategy & Monitoring

---

## PART A — SCALING

### A1. The governing constraint

**`node_backend` cannot scale horizontally today.** It uses SQLite (single-writer file) `[database.js:9]` and holds vault data in an in-memory `Map` `[vault.controller.js:5]`. Two replicas would mean two divergent databases and two divergent vaults. Therefore:

- **Until SQLite→Postgres + durable vault (see `04_DATABASE.md §6`): one replica only**, vertical scaling only, on a pinned host with a persistent volume.
- **After migration:** node_backend becomes stateless → horizontal scale like the others.

Everything below is split by "now" vs "after migration".

### A2. Horizontal scaling

| Service | Horizontally scalable? | How |
|---|---|---|
| node_backend | ❌ now → ✅ after PG migration | Caddy multi-upstream once stateless |
| worker_backend | ✅ now | stateless (PG+R2); add replicas behind Caddy; raise `UVICORN_WORKERS` |
| admin_backend | ✅ now | fully stateless proxy; cheapest to scale |
| sms-gateway API | ✅ | stateless HTTP; multiple replicas behind Caddy |
| sms-gateway queue worker | ✅ | BullMQ supports N consumers; raise concurrency or add worker containers. (Circuit-breaker state is per-worker in-memory `[circuitBreaker.ts:19]` — acceptable; each worker breaks independently.) |
| **sms-gateway scheduler** | ❌ **must stay 1** | designed single-replica `[scheduler.ts:2]`; duplicate runs = double cleanup/DLR work |
| **sync_drain** (worker_backend) | ❌ **must stay 1** | a cron singleton; multiple drainers would double-POST syncs |

### A3. Vertical scaling

The pragmatic lever **now**: bump the VM (CX22→CX32→CPX41) and raise `UVICORN_WORKERS` (FastAPI) / BullMQ concurrency. Cheap, immediate, and node_backend's only scaling option pre-migration.

### A4. Database scaling

- Reads are low; **no read-replica needed for load**, only for HA/failover (`04_DATABASE.md §5`).
- Add **PgBouncer** when worker_backend runs multiple replicas (each opens a 10+20 pool per uvicorn worker).
- sms-gateway DB is write-light (messages/otp) — fine on the shared instance; split to its own instance only if SMS volume explodes.

### A5. Stateless services & session handling

- admin_backend, worker_backend (sans local uploads), sms-gateway API are stateless → safe to replicate.
- **Sessions are token-based** (JWT for customer/admin, DB-backed `worker_sessions` for registration) — **no server-side in-memory session**, so no sticky sessions required. Good for scaling.
- The only stateful in-memory pieces are node_backend's vault `Map` (must fix) and per-worker circuit-breaker state (fine).

### A6. File storage at scale

Already correct: worker documents go to **R2** via presigned URLs `[storage.py]`, not local disk → unlimited horizontal scale, no shared-volume needed. **Finish wiring node_backend's vault/uploads to R2** so the last filesystem dependency disappears.

### A7. Background workers at scale

- SMS dispatch = BullMQ priority lanes; scale by adding queue-worker containers and tuning per-lane concurrency (OTP=10 default). The DLQ + circuit breaker already protect against provider outages.
- `sync_retries` drain is low-volume DB-polling; keep as a single cron.

### A8. Scaling trigger checklist (when to act)

- node_backend CPU sustained >70% or p95 latency climbing → **prioritise the PG migration**, then add replicas.
- Postgres connections >70% of `max_connections` → add PgBouncer.
- `queue_depth` (Prometheus) rising / OTP delivery latency up → add sms-gateway workers.
- Disk >80% → grow volume / offload logs.
- Single-VM saturation across services → split tiers (web / app / data) onto separate hosts, then consider managed containers.

---

## PART B — MONITORING

### B1. Metrics

- **sms-gateway: Prometheus already built in** `/metrics` — `sms_requests_total`, `sms_send_latency_seconds`, `sms_delivery_rate`, `sms_cost_usd_total`, `otp_{send,verify}_total`, `queue_depth`, `dlq_size`, `circuit_breaker_state`, `rate_limit_hits_total` + Node runtime `[utils/metrics.ts]`. Run the bundled Prometheus+Grafana `[sms-gateway/docker]`.
- **Host/containers:** node_exporter + cAdvisor → Prometheus.
- **FastAPI/Express:** add `prometheus-fastapi-instrumentator` / `prom-client` when you need request-level metrics; at launch, Caddy access-log-derived metrics + uptime checks suffice.

### B2. Health checks

Every service exposes one — use them for Docker healthchecks, uptime monitors, and load-balancer readiness:
- node_backend `GET /health` `[app.js]`
- worker_backend `GET /health` `[main.py:131]`
- admin_backend `GET /health`
- sms-gateway `GET /health` (liveness), **`/health/ready`** (checks DB+Redis), `/health/status` (detailed) `[health.ts:17-52]`

Use `/health/ready` (not `/health`) for the gateway in load-balancer/uptime checks so a dead Redis/DB marks it unhealthy.

### B3. Log aggregation

- All structured JSON (structlog / Morgan / winston / Caddy JSON). Ship to **Loki** (pairs with the existing Grafana) or Grafana Cloud / Better Stack free tier.
- Enforce Docker log rotation (`max-size=10m, max-file=5`) to protect disk.
- **Correlation:** add a request-id header through Caddy → backends so a customer action can be traced across node→admin→worker syncs.

### B4. Error reporting

**Sentry** on all four backends (`sentry-sdk[fastapi]` for Python — already flagged TODO in `DEPLOY.md`; `@sentry/node` for node_backend + sms-gateway). Capture unhandled exceptions + sync failures + provider errors.

### B5. Uptime monitoring

UptimeRobot / Better Stack hitting all four health endpoints from outside Cloudflare every 1–5 min. Public `status.smartworkers.in` page optional. Alert on 2 consecutive failures.

### B6. Performance monitoring

- p50/p95/p99 from sms-gateway histograms; for the HTTP backends, derive latency from Caddy access logs (it logs JSON with durations).
- Watch **SMS cost** (`sms_cost_usd_total`) and **delivery rate** — the gateway's reason for existing is multi-provider failover; a falling delivery rate or open circuit breaker means a provider is down and traffic should reroute.

### B7. Alert rules (Alertmanager / Grafana)

| Alert | Condition | Severity |
|---|---|---|
| Service down | health check fails 2× | critical |
| sms-gateway not ready | `/health/ready` 503 (DB/Redis) | critical |
| DLQ growing | `dlq_size > 0` for 5m | high |
| Circuit open | `circuit_breaker_state == 1` | high (provider outage) |
| SMS cost spike | `rate(sms_cost_usd_total)` > baseline×3 | high (abuse) |
| OTP abuse | `rate_limit_hits_total` spike on OTP | medium |
| 5xx rate | >2% of requests 5m | high |
| Disk | >80% | high |
| PG connections | >70% max | medium |
| Sync backlog | `sync_retries` rows > N / aging | medium |
| Cert expiry | <14 days (Caddy auto-renews, alert is a safety net) | medium |
