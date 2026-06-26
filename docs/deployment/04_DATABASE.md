# Database Architecture

> Two engines exist in the codebase today: **SQLite** (node_backend, real) and
> **PostgreSQL** (worker_backend + sms-gateway, real). This document standardises
> on Postgres and treats node_backend's SQLite as a migration target.

---

## 1. Engines in use (verified)

| Service | Engine today | Driver | Migrations | Notes |
|---|---|---|---|---|
| `node_backend` | **SQLite** `/data/smartworkers.db` (WAL) | better-sqlite3 | none (schema created at boot) | `pg` dep present, `DATABASE_URL` parsed but **unused** `[database.js, env.js:10]` |
| `worker_backend` | **PostgreSQL** (async) | asyncpg / SQLAlchemy | **Alembic** (3 revisions) | refuses to boot without `DATABASE_URL` in prod `[config.py:92-96]` |
| `sms-gateway` | **PostgreSQL** (`sms_gateway` DB) | Knex / pg | inline (`models/database.ts`) | separate logical DB |
| `admin_backend` | **none** | — | — | stateless proxy |

---

## 2. Recommended production engine: PostgreSQL 16

One Postgres 16 instance, **two logical databases**:

- **`smartworkers`** — owned by `worker_backend` now; **target for `node_backend`** after migration. Hosting both products' relational data in one DB simplifies the cross-service worker sync (it's currently an HTTP POST with `x-admin-secret`; if eventually co-located, parts could become FK-linked, but keep the HTTP contract for now to avoid coupling).
- **`sms_gateway`** — owned by sms-gateway (messages, otp_records, audit_events). Keep separate: different lifecycle, different retention, security audit isolation.

Use the existing (empty) **`ops/postgres-init/`** to create both DBs + least-privilege roles on first boot:

```sql
-- ops/postgres-init/01-databases.sql  (example — populate this file)
CREATE DATABASE smartworkers;
CREATE DATABASE sms_gateway;
CREATE ROLE sw_app  LOGIN PASSWORD '...'; GRANT ALL ON DATABASE smartworkers TO sw_app;
CREATE ROLE smsgw_app LOGIN PASSWORD '...'; GRANT ALL ON DATABASE sms_gateway TO smsgw_app;
```

Each service gets **its own role** scoped to its own DB — node/worker never authenticate to `sms_gateway` and vice-versa.

---

## 3. Production configuration

For a co-located CX32-class box (tune to RAM):

| Param | Value | Reason |
|---|---|---|
| `max_connections` | 100 | worker_backend pools `10+20` per replica `[db.py]`; sms-gateway `2–10` `[config.ts]`; leave headroom |
| `shared_buffers` | 25% RAM (~2 GB on 8 GB) | standard |
| `effective_cache_size` | 50–60% RAM | standard |
| `work_mem` | 16–32 MB | small result sets here |
| `wal_level` | `replica` | enables PITR / future replica |
| `ssl` | `on` | even on bridge; mandatory if managed/off-box |

**Use a connection pooler (PgBouncer, transaction mode)** once you run >1 replica of worker_backend, because each uvicorn worker opens its own pool (2 workers × (10+20) = up to 60 conns per replica). At launch (single replica) it's fine without.

Managed alternative (**recommended to remove the SPOF**): **Neon** — gives branching, PITR, autoscaling, and free tier covers launch. Set `DATABASE_URL` to the Neon connection string; nothing else changes (worker_backend already normalises the URL `[db.py:26-38]`).

---

## 4. Backup schedule

| DB | Method | Schedule | Retention |
|---|---|---|---|
| `smartworkers` (PG) | `pg_dump -Fc \| gzip` → R2 | nightly 03:00 + pre-deploy | 30 daily, 12 monthly |
| `sms_gateway` (PG) | `pg_dump` → R2 | nightly | 14 days (transient-ish; audit_events is the keeper) |
| `node_backend` SQLite (until migrated) | `sqlite3 smartworkers.db ".backup '/tmp/sw.db'"` → gzip → R2 | nightly + pre-deploy | 30 days |

The `DEPLOY.md` cron for `pg_dump → R2` is already drafted — extend it to cover both DBs and the SQLite file. **PITR** (continuous WAL archiving) on managed PG reduces RPO from 24h to minutes.

---

## 5. Replication & HA

- **Launch:** single primary, nightly off-box backups. Acceptable for the current scale; the real SPOF is the single VM, not the DB.
- **Next step:** one streaming **read replica** (or Neon's built-in) — not for read-scaling (load is low) but for **failover** and for taking backups off the primary.
- **HA target (post-migration):** managed PG with automated failover (Neon/RDS Multi-AZ). Only worth it once `node_backend` is on Postgres so the whole app can survive a primary swap without losing the customer DB.

---

## 6. Migration strategy

**Schema migrations:**
- `worker_backend`: **Alembic**, already run automatically on container start (`alembic upgrade head` in Dockerfile CMD `[Dockerfile:65]`). Forward-only; `alembic downgrade -1` for emergency reverse `[DEPLOY.md]`.
- `sms-gateway`: inline migrations run at API boot `[index.ts]`. Idempotent table creation.
- `node_backend`: **no migration framework** — schema is created imperatively at boot `[database.js]`. After the Postgres port, introduce a lightweight migration runner (node-pg-migrate or Knex, the latter already used by sms-gateway).

**The SQLite → Postgres data migration (node_backend), recommended approach:**
1. Port the data layer to use `pg` against `DATABASE_URL` (dependency already present); keep the same 8-table schema.
2. One-time export: dump the 8 SQLite tables → load into the `smartworkers` PG DB (pgloader handles SQLite→PG directly).
3. The **32 seed workers** are re-created idempotently on boot `[database.js:129-186]`; ensure the seed guard checks `source='seed'` against PG so it doesn't double-insert.
4. Cut over `node_backend` with `DATABASE_URL` set; verify customer login, bookings, admin sync.

**Zero-downtime is not required** at this scale — a short maintenance window (announced) is acceptable for the cutover.

---

## 7. Security considerations

- **Least-privilege roles per DB** (above). No shared superuser for app traffic.
- **TLS** on all DB connections (`DB_SSL=true` for sms-gateway in prod `[.env.example]`; `sslmode=require` in worker/node URLs).
- **No public exposure:** Postgres binds `127.0.0.1` (current compose already does) or sits on a private managed endpoint; never on the VM's public IP.
- **Secrets:** DB passwords come from `.env.*` (gitignored) / secret manager — **rotate the `CHANGE_ME` placeholders and the committed ones**.
- **PII lives here:** customer phones/emails, worker Aadhaar-linked records (images in R2, metadata in PG). Treat `workers`, `customers`, `audit_events` as sensitive — restrict dump access, encrypt backups at rest (R2 SSE), and keep `audit_events` (sms-gateway) for compliance.
- **The `node_backend` vault** (encrypted docs) is currently in-memory `[vault.controller.js:5]` — when made durable, store the AES-256-GCM ciphertext in PG/R2, **never the `ENCRYPTION_KEY`** alongside it.
