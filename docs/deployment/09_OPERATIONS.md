# Operations Runbook

> Day-2 operations for the live system. Commands assume the Compose stack on the
> VM at `/home/deploy/SmartWorker`.

---

## 1. Daily maintenance

| Check | How | Pass condition |
|---|---|---|
| Service health | `docker compose ps` | all `Up (healthy)` |
| External health | `for h in api workers-api admin-api; do curl -fsS https://$h.crewzo.in/health; done` | 200 ×3 |
| Gateway readiness | `curl -fsS https://<internal>/health/ready` or exec `wget -qO- localhost:3100/health/ready` | 200 |
| Error spike | Sentry dashboard | no new critical |
| Queue/DLQ | Grafana `queue_depth`, `dlq_size` | depth low, DLQ = 0 |
| Sync backlog | `docker compose exec postgres psql -U smartworkers -c "select count(*) from sync_retries;"` | 0 or draining |
| Disk | `df -h` | <80% |
| SMS cost | Grafana `sms_cost_usd_total` rate | within baseline |

Quick log scan:
```bash
docker compose logs --since 24h | grep -Ei '"level":"(error|critical)"|traceback|5[0-9][0-9]'
```

---

## 2. Backup verification

Backups are worthless until a restore is proven. **Monthly** restore drill:
```bash
# Pull latest dump from R2
aws --endpoint-url $R2_ENDPOINT s3 cp s3://smartworkers-backups/postgres-<date>.sql.gz .
# Restore into a throwaway PG and sanity-check row counts
gunzip -c postgres-<date>.sql.gz | docker exec -i <tmp-pg> psql -U postgres -d restore_test
docker exec <tmp-pg> psql -U postgres -d restore_test -c "select count(*) from workers; select count(*) from bookings;"
```
Verify: nightly dump objects exist in R2 for the last 7 days; SQLite backup exists; sizes are non-zero and growing sanely.

Backup jobs (cron, per `DEPLOY.md` — extend to cover both PG DBs + SQLite):
```cron
0 3 * * * deploy  docker compose -f /home/deploy/SmartWorker/docker-compose.yml exec -T postgres \
  pg_dump -U smartworkers smartworkers | gzip | aws --endpoint-url $R2_ENDPOINT s3 cp - s3://smartworkers-backups/postgres-$(date +\%F).sql.gz
15 3 * * * deploy docker compose -f /home/deploy/SmartWorker/docker-compose.yml exec -T postgres \
  pg_dump -U smartworkers sms_gateway | gzip | aws --endpoint-url $R2_ENDPOINT s3 cp - s3://smartworkers-backups/smsgw-$(date +\%F).sql.gz
30 3 * * * deploy docker compose -f /home/deploy/SmartWorker/docker-compose.yml exec -T node_backend \
  sh -c 'sqlite3 /data/smartworkers.db ".backup /tmp/sw.db" && gzip -c /tmp/sw.db' | aws --endpoint-url $R2_ENDPOINT s3 cp - s3://smartworkers-backups/sqlite-$(date +\%F).db.gz
```

---

## 3. Monitoring checklist (weekly)

- [ ] Grafana dashboards loading; Prometheus targets all `UP`.
- [ ] Alertmanager routes tested (fire a test alert).
- [ ] UptimeRobot shows >99.9% over 7d.
- [ ] Review `sms_delivery_rate` per provider; check no circuit breaker stuck open.
- [ ] Review `audit_events` (sms-gateway) and `worker_events` (worker_backend) for anomalies.
- [ ] Cloudflare WAF/analytics: unusual traffic, blocked attacks.
- [ ] node_backend `login_attempts` table for brute-force patterns.

---

## 4. Log rotation

Docker `json-file` driver, set in daemon or per-service:
```json
// /etc/docker/daemon.json
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "5" } }
```
Caddy logs to stdout (captured by Docker). If shipping to Loki, retain 14–30 days there and keep Docker rotation tight. Verify weekly that `/var/lib/docker/containers` isn't growing unbounded.

---

## 5. Database maintenance

- **Weekly:** confirm autovacuum healthy — `docker compose exec postgres psql -U smartworkers -c "select relname,n_dead_tup,last_autovacuum from pg_stat_user_tables order by n_dead_tup desc limit 10;"`.
- **Monthly:** `VACUUM (ANALYZE);` on both DBs; review slow queries (`pg_stat_statements` if enabled); check index bloat.
- **Connections:** `select count(*) from pg_stat_activity;` vs `max_connections` — add PgBouncer if >70%.
- **sms-gateway retention:** the scheduler already cleans old records (3600s job). Confirm `messages`/`otp_records` aren't growing without bound; keep `audit_events` long.
- **SQLite (node_backend):** periodically checkpoint WAL — `sqlite3 /data/smartworkers.db "PRAGMA wal_checkpoint(TRUNCATE);"`; keep file backed up. (Goes away after PG migration.)

---

## 6. SSL renewal

**Caddy auto-renews** Let's Encrypt certs (~30 days before expiry) — no action needed. Operational safety net:
- Alert if any cert <14 days to expiry (means auto-renew is failing — check port 80 reachability / Cloudflare not blocking ACME).
- Certs persist in the `caddy_data` volume — **include it in backups** so a VM rebuild doesn't re-issue from scratch (and risk rate limits).
- Cloudflare edge certs renew automatically (managed).

---

## 7. Incident / disaster recovery procedure

### A) Single service down
```bash
docker compose ps                       # identify
docker compose logs --tail=200 <svc>    # diagnose
docker compose restart <svc>            # or up -d --force-recreate <svc>
```
If node_backend is the one down: it's the **single-replica SQLite** service — confirm the `node_data` volume is intact before recreating; never delete it.

### B) Bad deploy
Roll back per `DEPLOYMENT.md §13` (pin previous SHA / `git checkout`; restore pre-deploy DB snapshot if a migration was crossed).

### C) Full VM loss (DR)
RTO ~1–2h, RPO 24h (nightly) / minutes (if PITR on managed PG):
1. Provision new CX32, install Docker + ufw (DEPLOYMENT §2).
2. `git clone`; restore `.env.*` and `caddy_data` from the encrypted secret/backup vault.
3. Restore latest PG dumps (both DBs) + SQLite backup from R2.
4. `docker compose up -d`; run smoke test.
5. Repoint Cloudflare A records (`api/workers-api/admin-api`) to the new IP.
6. Verify worker-approval→sync path and OTP end-to-end.

### D) Provider outage (SMS)
The gateway's circuit breaker auto-fails-over to the next provider. If all open: check provider creds/balance, watch `dlq_size`; messages stay queued and retry. OTP login degrades — communicate via status page.

### E) Secret compromise
Rotate the affected secret; for shared secrets (`ADMIN_SECRET`, `HMAC_SECRET`) update **both** ends in one deploy; invalidate JWTs by rotating `JWT_SECRET` (forces re-login). Purge from git history if it ever landed there.

---

## 8. Routine cron summary

| Job | Schedule | Purpose |
|---|---|---|
| PG + SQLite backups → R2 | nightly 03:00–03:30 | recovery |
| `sync_drain` | every 5 min | drain failed worker syncs `[DEPLOY.md]` |
| Restore drill | monthly | prove backups |
| `VACUUM ANALYZE` | monthly | DB health |
| Secret rotation review | quarterly | hygiene |
| Dependency/security updates | monthly | patch CVEs (Docker base images, npm/pip) |
