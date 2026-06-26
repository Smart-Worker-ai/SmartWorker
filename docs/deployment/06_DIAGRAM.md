# Infrastructure Diagram

> Reflects the real service set (including `sms-gateway` + Redis, which the root
> `docker-compose.yml` currently omits) and the verified communication paths.

## Mermaid

```mermaid
flowchart TB
    subgraph clients["Clients"]
        CUST["Customer App<br/>(Flutter + Firebase)"]
        WRK["Worker Portal App<br/>(Flutter)"]
        WWEB["Worker Website<br/>(React SPA)"]
        ADMSPA["Admin Panel<br/>(React SPA)"]
    end

    FB["Firebase<br/>Phone OTP"]
    CF["Cloudflare<br/>TLS · WAF · CDN · DDoS"]
    VRC["Vercel / CF Pages<br/>(static SPAs)"]

    CUST -->|phone OTP| FB
    CUST -->|HTTPS /api/v1| CF
    WRK -->|HTTPS /api/v1| CF
    WWEB --> VRC
    ADMSPA --> VRC
    VRC -->|/api rewrite| CF

    subgraph vm["Production VM (Docker bridge, only 80/443 public)"]
        CADDY["Caddy reverse proxy<br/>auto-TLS · headers · gzip"]

        NODE["node_backend :3000<br/>Express · SQLite(WAL) · vault<br/>(SINGLE replica, stateful)"]
        WB["worker_backend :8000<br/>FastAPI · Alembic@boot<br/>(stateless, scalable)"]
        AB["admin_backend :8001<br/>FastAPI proxy<br/>(stateless, scalable)"]

        subgraph gw["sms-gateway"]
            GWAPI["API :3100<br/>HMAC · /metrics"]
            GWWRK["queue worker<br/>BullMQ"]
            GWSCH["scheduler<br/>(SINGLE replica)"]
        end

        REDIS["Redis 7<br/>BullMQ + nonces"]
        SYNCD["sync_drain cron<br/>(SINGLE, worker_backend)"]

        CADDY --> NODE
        CADDY --> WB
        CADDY --> AB
        CADDY -. internal .-> GWAPI

        AB -->|x-admin-secret| NODE
        AB -->|x-admin-secret| WB
        WB -->|x-admin-secret| NODE
        WB -->|HMAC OTP| GWAPI
        SYNCD -->|retry POST| NODE

        GWAPI --> REDIS
        GWWRK --> REDIS
        GWSCH --> REDIS
    end

    subgraph data["Managed / persistent state"]
        PG[("PostgreSQL 16<br/>db: smartworkers + sms_gateway")]
        R2[("Cloudflare R2<br/>worker documents")]
    end

    CF --> CADDY
    WB --> PG
    WB --> R2
    GWAPI --> PG
    GWWRK --> PG
    NODE -. after SQLite→PG migration .-> PG
    NODE -. vault docs (to wire) .-> R2

    subgraph ext["External providers"]
        SMTP["SMTP<br/>Resend/Brevo"]
        SMSP["SMS providers<br/>Twilio·Plivo·MSG91·Fast2SMS"]
    end
    NODE --> SMTP
    WB --> SMTP
    GWWRK --> SMSP

    subgraph obs["Observability"]
        PROM["Prometheus"]
        GRAF["Grafana"]
        SENTRY["Sentry"]
        UPTIME["UptimeRobot"]
    end
    GWAPI -->|/metrics| PROM
    PROM --> GRAF
    UPTIME -->|/health| CADDY
```

## ASCII (fallback)

```
                       Customer App   Worker App      Worker Website   Admin Panel
                        (Flutter)      (Flutter)        (React SPA)     (React SPA)
                           |  \           |                  |              |
                    Firebase   \          |              Vercel/Pages (CDN, /api rewrite)
                    phone OTP    \         |                  |              |
                           HTTPS  v        v                  v              v
                          ┌────────────────────── Cloudflare (TLS/WAF/CDN/DDoS) ───────────┐
                          └───────────────────────────────┬───────────────────────────────┘
                                                          443
        ┌──────────────────────────── Production VM (only 80/443 public) ──────────────────┐
        │                              Caddy reverse proxy                                  │
        │        api.* ──┐        workers-api.* ──┐     admin-api.* ──┐   (sms internal)    │
        │                v                        v                   v                      │
        │        node_backend:3000        worker_backend:8000   admin_backend:8001          │
        │        Express + SQLite          FastAPI + Alembic     FastAPI (stateless)        │
        │        + in-mem vault            + boto3(R2)               proxy                   │
        │        SINGLE replica            stateless/scalable    │  │                        │
        │            ^   ^                   │   │   │           │  │                        │
        │   x-admin- │   └─ x-admin ─────────┘   │   └─ HMAC OTP ┘  │                        │
        │   secret   └──────── x-admin (admin→node) ───────────────┘                        │
        │                                     │                                              │
        │     sync_drain (cron, single) ──────┘        sms-gateway: API:3100 + worker +      │
        │                                              scheduler(single)  ── Redis 7         │
        └───────────────┬──────────────────────────────┬───────────────────┬────────────────┘
                        │                               │                   │
                 PostgreSQL 16                   Cloudflare R2          SMTP / SMS APIs
              (smartworkers, sms_gateway)      (worker documents)     (Resend; Twilio/MSG91…)
```

### Legend / key constraints shown
- **SINGLE replica** boxes (node_backend, sms-gateway scheduler, sync_drain) must never be horizontally scaled.
- Dotted lines = **planned/to-wire** (node_backend → Postgres after migration; node_backend vault → R2).
- Internal calls (`x-admin-secret`, HMAC) never leave the bridge network.
