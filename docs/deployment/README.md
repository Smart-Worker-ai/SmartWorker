# Smart Workers — Production Deployment Documentation

Complete, codebase-derived production architecture & operations set. Every claim
is traced to a source file. Read in order; `01` establishes the facts the rest
depend on.

| # | Document | Deliverable(s) covered |
|---|---|---|
| [01](01_ARCHITECTURE.md) | Production Architecture Report | Codebase analysis, architecture report, isolation, pre-prod blockers |
| [02](02_INFRASTRUCTURE.md) | Infrastructure Design | Cloud, sizing, topology, proxy/LB/CDN, cache, MQ, backup, DR, **cost** |
| [03](03_DNS.md) | Domain & DNS Plan | Subdomains, records, cutover, CORS alignment |
| [04](04_DATABASE.md) | Database Architecture | Engine, config, backups, replication/HA, migration, security |
| [05](05_NETWORK_SECURITY.md) | Network & Security Architecture | Internal/public/private comms, firewall, TLS, **security checklist** |
| [06](06_DIAGRAM.md) | Infrastructure Diagram | Mermaid + ASCII, communication paths |
| [07](07_CICD.md) | CI/CD Plan | Git flow, build, test, artifacts, deploy, rollback, versioning |
| [08](08_SCALING_MONITORING.md) | Scaling & Monitoring | Horizontal/vertical, stateless, workers; metrics/logs/alerts |
| [09](09_OPERATIONS.md) | Operations Runbook | Daily ops, backups, log rotation, DB maint, SSL, DR procedures |
| [10](10_READINESS.md) | Production Readiness Checklist | Go-live gate (🔴 blockers) |
| [`../../DEPLOYMENT.md`](../../DEPLOYMENT.md) | **Deployment Guide** | Full step-by-step deploy, corrected docker-compose, rollback |

## The three components ↔ services

- **Customer Mobile App** (Flutter + Firebase) → `node_backend` (`api.`)
- **Worker Website** (React) → `worker_backend` (`workers-api.`); **Worker Portal App** (Flutter) → `node_backend`
- **Admin Panel** (React) → `admin_backend` (`admin-api.`) → proxies node + worker backends
- Supporting: `sms-gateway` (OTP/SMS, Redis+PG), PostgreSQL, Redis, Cloudflare R2

## Top blockers before go-live (see 10_READINESS.md)

1. 🔴 Rotate & purge secrets committed in `PROJECT_REFERENCE.md`.
2. 🔴 node_backend vault is in-memory → data loss on restart; make durable.
3. 🔴 node_backend SQLite needs persistent volume + backups, or migrate to Postgres.
4. 🔴 Complete `docker-compose.yml` (missing node_backend, sms-gateway, redis, caddy).
5. 🟠 Resolve the half-wired SMS path (node_backend inline vs sms-gateway).
