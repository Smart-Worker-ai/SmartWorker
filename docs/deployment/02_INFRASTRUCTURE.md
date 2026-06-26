# Infrastructure Design

> Sized to the **actual** workload: a regional (Kerala) services marketplace,
> no realtime paths, one stateful SQLite-bound service, four small backends, two
> static SPAs, two mobile apps. No traffic figures exist in-repo, so sizing
> assumes **low-thousands of daily active users**; the scaling triggers in
> `08_SCALING.md` say when to move up.

---

## 1. Cloud provider

**Recommendation: Hetzner Cloud (primary compute) + Cloudflare (edge) + Cloudflare R2 (objects).**
Already the direction in `DEPLOY.md`; the analysis confirms it fits.

Reasoning grounded in the code:
- The stack is **container-native** (every backend has a Dockerfile; root + sms-gateway composes exist). A plain VPS running Docker Compose deploys it unchanged — no PaaS lock-in, no rewrite.
- **`node_backend` is SQLite-bound to one host** → you need a real persistent disk, which a VPS gives natively and serverless/PaaS does not (Railway's ephemeral FS is exactly why data is lost today). This rules out fully-serverless.
- Cost: a marketplace at this scale doesn't justify AWS/GCP baseline spend; Hetzner gives 2–4× the RAM/₹ of hyperscalers.
- **Cloudflare R2** is already the chosen object store (`S3_ENDPOINT_URL` in `.env.worker.example`) — zero egress fees, S3-compatible with the boto3 client already in `worker_backend`.
- **Cloudflare** in front gives free TLS edge, DDoS, WAF, CDN for the SPAs.

**Alternative (if you must stay managed/PaaS):** keep Railway for the 3 backends + a managed Postgres (Neon/Railway PG) + Upstash Redis for the gateway. More expensive, less control, and still requires fixing the SQLite issue first. Documented as fallback only.

Region: **Hetzner Nuremberg/Falkenstein** or, for India latency, a Cloudflare-fronted origin still terminates close to users via the edge; if origin latency to India matters, use a provider with a Mumbai/Singapore region (e.g. an AWS Lightsail ap-south-1 instance running the same Compose). Cloudflare proxy masks most origin distance for the SPAs and APIs.

---

## 2. VMs vs containers

**Containers on a single VM, orchestrated by Docker Compose.** Every service already ships a Dockerfile; the sms-gateway already has a multi-process Compose. Compose (not K8s) because:
- One replica of `node_backend` is mandatory (SQLite) — there is nothing to orchestrate across nodes yet.
- The singleton jobs (`sync_drain`, sms-gateway `scheduler`) map cleanly to single Compose services.
- Operational simplicity for a small team.

Move to a managed container platform / K8s only after the SQLite→Postgres migration unlocks horizontal scale (`08_SCALING.md`).

---

## 3. Server sizing (CPU / RAM / storage)

**One production VM** runs: Caddy, node_backend, worker_backend (2 uvicorn workers), admin_backend (2 uvicorn workers), sms-gateway API + queue-worker + scheduler, Redis, and (option A) Postgres. Resident memory estimate:

| Process | RAM (idle→load) |
|---|---|
| Caddy | ~40 MB |
| node_backend (Node) | ~80–120 MB |
| worker_backend (uvicorn ×2) | ~200–300 MB |
| admin_backend (uvicorn ×2) | ~150–200 MB |
| sms-gateway API + worker + scheduler | ~250–350 MB |
| Redis (maxmemory 256 MB cap `[sms-gateway/docker]`) | up to 256 MB |
| Postgres 16 (if co-located) | ~300–500 MB |
| **Total headroom target** | **~2 GB working, 4 GB safe** |

**Recommended instances:**

| Tier | Instance | vCPU / RAM / Disk | When |
|---|---|---|---|
| Launch | **Hetzner CX22** | 2 / 4 GB / 40 GB | Postgres **managed** (Neon), app+Redis on the VM |
| Comfortable | **Hetzner CX32** | 4 / 8 GB / 80 GB | Postgres **co-located**, room for growth |
| Scale-up | **Hetzner CPX41** | 8 / 16 GB / 240 GB | After SQLite→PG migration, multiple API replicas |

**Storage:**
- `node_backend` SQLite (`/data/smartworkers.db`, WAL): tiny (<1 GB for a long time) but **must be on a persistent volume with backups** — it is the customer system-of-record today.
- Postgres data: start 10–20 GB SSD, grow as needed. Worker docs do **not** live here (they go to R2), so DB stays small.
- Redis: ephemeral queue state, 256 MB cap, AOF on `[sms-gateway/docker]`.
- Object storage (R2): worker Aadhaar/passbook/profile images — budget a few GB; presigned, private bucket.

---

## 4. Network topology

```
Internet
  │  443
Cloudflare (TLS edge, WAF, CDN, DDoS)
  │  443 (origin)
Caddy reverse proxy  ── only 80/443 open on the VM
  ├── api.smartworkers.in        → node_backend:3000
  ├── workers-api.smartworkers.in→ worker_backend:8000
  ├── admin-api.smartworkers.in  → admin_backend:8001
  └── sms.smartworkers.in (internal-only, optional) → sms-gateway:3100
        │
   docker bridge network (private, not published)
        ├── node_backend:3000
        ├── worker_backend:8000
        ├── admin_backend:8001
        ├── sms-gateway:3100  + worker + scheduler
        ├── redis:6379
        └── postgres:5432   (127.0.0.1 only or managed off-box)

Static SPAs (worker website, admin panel) → Vercel/Cloudflare Pages (separate, CDN)
```

Only **80/443** are exposed publicly (Caddy). Everything else lives on the Docker bridge network and is **never published to the host's public interface**. Postgres, if co-located, binds `127.0.0.1:5432` (as the current compose already does).

---

## 5. Reverse proxy

**Caddy** — already authored (`Caddyfile`). It gives automatic Let's Encrypt TLS, HTTP/1.1+2+3, gzip/zstd, and the security headers are already set per host. **Required fix:** the `Caddyfile` references `node_backend:3000` but the root `docker-compose.yml` does not define that service — add it (see `04_DEPLOYMENT.md`). Add a route for the sms-gateway only if you expose it.

TLS termination happens at Caddy (origin certs) with Cloudflare in front (edge certs) — use Cloudflare **Full (strict)** mode so both legs are encrypted.

---

## 6. Load balancer

**Not needed at launch.** There is exactly one `node_backend` replica possible (SQLite), and Caddy already load-balances by hostname. When `worker_backend`/`admin_backend` scale to multiple replicas post-migration, Caddy's `reverse_proxy` supports multiple upstreams (round-robin) with no extra component. A dedicated LB (Hetzner LB / Cloudflare LB) is a `08_SCALING.md` concern, not now.

---

## 7. CDN

**Yes, for the two SPAs and worker document delivery.**
- SPAs: served from Vercel/Cloudflare Pages, already CDN-backed. `vercel.json` is in-repo.
- Static assets: Cloudflare caches the SPA bundles automatically.
- Worker images in R2: serve via presigned URLs (private) — already implemented `[storage.py:145-154]`. If you later make a public asset bucket, front it with Cloudflare cache.

---

## 8. Object storage

**Cloudflare R2, private bucket `smartworkers-uploads`.** Already wired in `worker_backend` (boto3, presigned, `S3_*` env). **Action:** also point `node_backend`'s vault/uploads at the same R2 (currently undefined) so worker documents survive restarts. No object storage runs on the VM.

---

## 9. Cache layer

**Redis 7** — **required** because the sms-gateway uses BullMQ (queues) and Redis-backed HMAC nonce replay-cache `[sms-gateway/.env.example, auth.ts:68]`. Run it on the VM (256 MB cap, AOF) or Upstash if you prefer managed. No other service caches today; Redis is also available if you later add response/session caching to the FastAPI services.

---

## 10. Message queue

**Already present and required: BullMQ on Redis** inside sms-gateway — 4 priority lanes (`otp/transactional/notification/bulk`) `[queue/index.ts:16-18]`. No additional broker (RabbitMQ/SQS) is justified; the only async workload in the system is SMS dispatch, and it's already queue-driven. The `sync_retries` mechanism in `worker_backend` is a **DB-backed** dead-letter queue drained by cron — keep it as-is (no broker needed).

---

## 11. Database architecture

See `04_DATABASE.md` for full detail. Summary:
- **PostgreSQL 16** — two logical databases on one instance: `smartworkers` (worker_backend, and node_backend after migration) and `sms_gateway` (gateway). The `ops/postgres-init/` dir exists for multi-DB init (currently empty — populate it).
- `node_backend` SQLite is a **migration target**, not a long-term plan.

---

## 12. Backup strategy

| Data | Method | Frequency | Retention |
|---|---|---|---|
| Postgres (`smartworkers`, `sms_gateway`) | `pg_dump \| gzip` → R2 (cron already drafted in `DEPLOY.md`) | nightly 03:00 | 30 daily + 12 monthly |
| `node_backend` SQLite | `sqlite3 .backup` or copy WAL-checkpointed file → R2 | nightly + before each deploy | 30 days |
| R2 objects | R2 versioning + lifecycle; optional cross-bucket copy | continuous | per lifecycle |
| Redis | **none needed** (queue state is transient/rebuildable) | — | — |
| Secrets / env files | encrypted (age/SOPS) copy in a private vault, **not** git | on change | n/a |

Test restores monthly (`09_OPERATIONS.md`). Backups are useless until a restore is proven.

---

## 13. Disaster recovery

- **RPO target: 24h** (nightly dumps) → tighten to ~1h with Postgres WAL archiving/PITR when on a managed PG (Neon has PITR built in).
- **RTO target: ~1–2h** — rebuild = provision VM, `git clone`, restore `.env.*` from the secret vault, `docker compose up`, restore latest PG dump + SQLite backup, re-point DNS.
- **Single-VM is a single point of failure.** Mitigations: nightly off-box (R2) backups, infrastructure-as-runbook (`04_DEPLOYMENT.md` is reproducible), and Cloudflare in front so DNS failover is fast. For higher availability, the post-migration path (stateless backends + managed PG with replica) in `08_SCALING.md` removes the SPOF.
- Keep a **second region recipe** ready (same Compose, different VM) even if not running.

---

## 14. Monitoring, logging, alerting

**Metrics:**
- **sms-gateway already exposes Prometheus `/metrics`** (send latency, delivery rate, queue depth, DLQ size, circuit-breaker state, cost) and ships a Prometheus+Grafana compose `[sms-gateway/docker]`. Run that Prometheus, point it at all services you can, and use the bundled Grafana.
- Add node/host metrics via `node_exporter` (or Hetzner's built-in graphs) + cAdvisor for container stats.
- FastAPI/Express don't expose Prometheus today — for launch, rely on Caddy access logs + uptime checks; add `prom-client`/`prometheus-fastapi-instrumentator` later if needed.

**Logging:**
- All services emit **structured JSON** (structlog in FastAPI `[main.py:26-36]`, Morgan in Express, winston in sms-gateway, Caddy JSON). Collect with `docker compose logs` → ship to **Loki** (pairs with the existing Grafana) or a hosted option (Better Stack / Grafana Cloud free tier).
- Set Docker `json-file` log rotation (`max-size`, `max-file`) so disks don't fill (`09_OPERATIONS.md`).

**Error reporting:**
- **Sentry** — `DEPLOY.md` already flags wiring `sentry-sdk[fastapi]` into both Python backends; add `@sentry/node` to node_backend and sms-gateway. Free tier suffices.

**Uptime:**
- **UptimeRobot / Better Stack** hitting the existing health endpoints: `GET /health` (all four), plus sms-gateway `GET /health/ready` (checks DB+Redis) `[health.ts:24]`.

**Alerting:**
- Prometheus Alertmanager (or Grafana alerts) on: `queue_depth` high, `dlq_size > 0`, `circuit_breaker_state == open`, 5xx rate, health-check failures, disk >80%, Postgres connection saturation, **SMS cost spike** (`sms_cost_usd_total` jump = possible abuse). Route to email/Telegram/Slack.

---

## 15. Cost & resource recommendations

Launch (Postgres managed-free or co-located):

| Item | Monthly |
|---|---|
| Hetzner CX22 (2 vCPU/4 GB) or CX32 (4/8) | ~$5 / ~$10 |
| Domain `.in` (amortised) | ~$0.70 |
| Cloudflare (DNS/CDN/WAF/TLS) | $0 |
| Cloudflare R2 (<10 GB, no egress) | $0 |
| Postgres — Neon free (0.5 GB) **or** co-located | $0 |
| Redis (on VM) | $0 |
| Vercel/Pages frontends | $0 |
| Firebase phone auth (<10K/mo) | $0 |
| Transactional email (Resend 3K/mo or Brevo 300/day) | $0 |
| SMS (provider — pay per message via gateway) | usage-based |
| Sentry + UptimeRobot free | $0 |
| **Launch total (excl. per-SMS)** | **~$6–11/mo** |

Growth (≈50K users, after SQLite→PG migration):

| Item | Monthly |
|---|---|
| Hetzner CPX41 (8/16) or 2× CX32 + LB | ~$25–35 |
| Neon Pro / managed PG with replica | ~$19–40 |
| Resend Pro | ~$20 |
| Grafana Cloud / Loki (or self-host) | $0–20 |
| **Total (excl. per-SMS)** | **~$65–115/mo** |

The dominant **variable** cost is SMS (Twilio/MSG91/Fast2SMS per message) — the gateway's `sms_cost_usd_total` metric exists precisely to track it; alert on spikes.
