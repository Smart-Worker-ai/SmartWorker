# Smart Workers — Production Deployment

End-to-end runbook for shipping the three backends (Node.js + 2× FastAPI) to
a single VPS behind Caddy with Postgres and Cloudflare R2.

Frontends (`worker_website/frontend`, `admin_portal/frontend`) stay on Vercel
free tier — they are NOT part of this docker-compose.

Customer App APK ships through Firebase App Distribution — see
`smart_workers_customer/release.sh`.

---

## 1. Prerequisites

| Thing | Where |
|---|---|
| Domain (e.g. `smartworkers.in`) | Namecheap / Cloudflare Registrar (~$8/yr `.in`) |
| DNS provider | **Cloudflare** (free, mandatory — also fronts DDoS, CDN, WAF) |
| VPS | Hetzner CX22 (€4.50/mo, 2 vCPU, 4 GB) — Ubuntu 24.04 LTS |
| Postgres | Neon free tier (0.5 GB) OR the postgres container in compose |
| Object storage | Cloudflare R2 (free 10 GB, no egress fees) |
| Transactional email | Resend (3 K/mo free) or Brevo (300/day free) |
| Monitoring | Sentry free + UptimeRobot free |

## 2. One-time setup

### 2.1 Domain → Cloudflare

1. Add `smartworkers.in` to Cloudflare. Update registrar nameservers.
2. In Cloudflare DNS, create these A records pointing at the VPS public IP:
   - `api.smartworkers.in`
   - `workers-api.smartworkers.in`
   - `admin-api.smartworkers.in`
3. Proxy status: **DNS only** (grey cloud) at first so Let's Encrypt can issue
   certs. After Caddy reports certs ready, flip them to **Proxied** (orange
   cloud).
4. Vercel CNAMEs for the frontends:
   - `workers.smartworkers.in` → `cname.vercel-dns.com` (worker website project)
   - `admin.smartworkers.in`   → `cname.vercel-dns.com` (admin portal project)

### 2.2 R2 bucket

1. Cloudflare dashboard → R2 → Create bucket `smartworkers-uploads`.
2. Bucket settings → **Public access: OFF**. Caller will fetch via presigned
   URLs.
3. Manage R2 API Tokens → create token with `Object Read & Write` for the
   bucket. Note the Access Key ID + Secret. Endpoint URL is
   `https://<accountid>.r2.cloudflarestorage.com`.

### 2.3 VPS

```bash
ssh root@<vps-ip>
adduser deploy --disabled-password --gecos ""
usermod -aG sudo deploy
# install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
apt install -y ufw fail2ban
ufw allow OpenSSH
ufw allow 80,443/tcp
ufw enable
```

Then on the deploy user:
```bash
ssh deploy@<vps-ip>
git clone https://github.com/d-r-o-g-o/SmartWorker.git
cd SmartWorker
```

### 2.4 Generate secrets

On the VPS:
```bash
# Strong random for JWT, ADMIN_SECRET, POSTGRES_PASSWORD
python3 -c "import secrets; print(secrets.token_urlsafe(48))"

# Admin password bcrypt hash
python3 -c "from passlib.hash import bcrypt; import getpass; print(bcrypt.hash(getpass.getpass()))"
```

### 2.5 Fill env files

```bash
cp .env.example       .env
cp .env.worker.example .env.worker
cp .env.admin.example  .env.admin
cp .env.node.example   .env.node
```

Edit all four with the values from 2.4 + your R2 creds + your SMTP creds.
**Every secret must be unique and not reused across files** except where
explicitly required to match (`ADMIN_SECRET` worker_backend ↔ Node.js;
`CUSTOMER_BACKEND_ADMIN_SECRET` admin_backend ↔ Node.js).

## 3. First deploy

```bash
docker compose build
docker compose up -d
docker compose logs -f
```

Watch for:
- `[caddy]` lines saying TLS certs obtained
- `[worker_backend]` JSON line `{"event":"boot","db":"postgres",...}`
- `[admin_backend]`  JSON line `{"event":"boot","cors_origins":[...]}`
- `[node_backend]`   `/health` returning 200

Verify externally:
```bash
curl -I https://workers-api.smartworkers.in/health
curl -I https://admin-api.smartworkers.in/health
curl -I https://api.smartworkers.in/health
```

Once all three return 200, flip Cloudflare DNS to **Proxied** (orange cloud).

## 4. Subsequent deploys

```bash
ssh deploy@<vps-ip>
cd SmartWorker
git pull
docker compose up -d --build
docker compose logs -f --tail=100
```

Or wire a GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [master]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: deploy
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /home/deploy/SmartWorker
            git pull --ff-only
            docker compose up -d --build
            docker compose ps
```

## 5. Operations

### Logs (structured JSON)
```bash
docker compose logs -f worker_backend
docker compose logs -f admin_backend
docker compose logs -f node_backend
```

Pipe through `jq` for readability:
```bash
docker compose logs -f worker_backend 2>&1 | jq -c 'select(.event)'
```

### Postgres backup → R2 (nightly cron)

```bash
# /etc/cron.d/smartworkers-backup
0 3 * * * deploy docker compose -f /home/deploy/SmartWorker/docker-compose.yml \
    exec -T postgres pg_dump -U smartworkers smartworkers \
    | gzip | aws --endpoint-url $R2_ENDPOINT s3 cp - \
    s3://smartworkers-backups/postgres-$(date +\%F).sql.gz
```

### Sync retry drain (worker_backend background)

The `sync_retries` table holds payloads from failed Node.js syncs. Run the
drainer periodically:

```bash
# Add to crontab (every 5 min)
*/5 * * * * deploy docker compose -f /home/deploy/SmartWorker/docker-compose.yml \
    exec -T worker_backend python -m workers.sync_drain
```

### Rotate a secret

1. Edit the relevant `.env.*` file.
2. `docker compose up -d <service>` to recreate just that container.
3. If `ADMIN_SECRET` rotated: update **both** worker_backend and node_backend
   in lockstep, or admin approvals will start 403'ing.

### Roll back

`git log --oneline` → pick previous commit → `git checkout <sha>` → `docker
compose up -d --build`. Postgres schema migrations are forward-only by
default; if you really need to reverse a migration, `docker compose exec
worker_backend alembic downgrade -1`.

## 6. Cost forecast (first year)

| Item | Monthly |
|---|---|
| Hetzner CX22 VPS | €4.50 (~$5) |
| Domain `.in` (amortised) | $0.70 |
| Cloudflare (DNS / CDN / DDoS / TLS) | $0 |
| Postgres (in-VPS or Neon free) | $0 |
| R2 storage (< 10 GB) | $0 |
| Vercel frontends | $0 |
| Firebase Phone Auth (< 10K/mo) | $0 |
| Resend transactional email | $0 |
| Sentry + UptimeRobot | $0 |
| **TOTAL** | **~$6/mo** |

At 50K users: bump VPS to CX32 (~$10), Neon Pro ($19), Resend Pro ($20) →
still under $60/mo.

## 7. Things still TODO

- Push `workers-portal-backend/` source so it actually builds.
- Wire Sentry SDK into both Python backends (`sentry-sdk[fastapi]`).
- Move admin/worker frontend tokens from `localStorage` → httpOnly cookies.
- Certificate pinning in the Flutter Dio client.
- Customer App theme refactor for non-auth screens (still using legacy
  `kBrandDeep` consts).
