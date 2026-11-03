# Hyraku

Customer booking site + admin desk (TOTP, enquiries, crew/customers, letterpad PDFs).

Git branch: **`prod-deployed`** on [Smart-Worker-ai/SmartWorker](https://github.com/Smart-Worker-ai/SmartWorker/tree/prod-deployed).

This folder is what lives on the VPS at `/opt/hyraku`. Secrets stay in `.env.hyraku` on the server only (not in git).

**Version:** `1.0.0` (first stable, 3 Nov 2026). See `VERSION` and `CHANGELOG.md`. Next drop: bump `VERSION`, add a changelog section, then rsync.

## Status (2 Nov 2026)

Docker **is running** on AIC Cloud VPS **hyraku** (`vps-vys4`).

| Check | Result |
|---|---|
| SSH | `ssh -p 20115 root@15.235.145.222` |
| App on the box | `curl -sI http://127.0.0.1:80` → **200** (Caddy → customer) |
| `http://127.0.0.1:31081` | **200** (admin nginx) |
| Browser on `http://15.235.145.222:…` | **Does not work** (shared IP) |
| `https://zyoim.aiccloud.online` | **Live** customer site (AIC Public URL) |
| `hyraku.com` / `hyraku.in` | Namecheap — see `DEPLOY.md` §2–3 |
| `http://15.235.145.222:3000` | **Someone else’s app** (Kort Kacheri). Not us. |

Public HTTP is blocked because this plan is a **Linux container on a shared IPv4**. AIC Cloud owns 80/443 (and other common ports) on `15.235.145.222`. Custom firewall rules (18080, 31080, …) accept TCP then **reset**. There is **no “public URL port”** under VPS Settings.

**To finish from home:** attach AIC’s reverse proxy (their public URL, or `hyraku.com` / `hyraku.in` DNS). That is a panel/DNS job, not another Docker rebuild.

## What is on the VPS

```
ssh -p 20115 -o IdentitiesOnly=yes root@15.235.145.222
cd /opt/hyraku
docker compose ps
```

Caddy currently publishes **80**, **3000**, and env `HYRAKU_HTTP_PORT` (set to **3000**). Admin is on **31081**. API **8002** is internal only.

Admin login: `HYRAKU_ADMIN_USER` / `HYRAKU_ADMIN_PASSWORD` in `/opt/hyraku/.env.hyraku`, then TOTP on first login. Cookie `Secure` is on — use HTTPS once the proxy is live, or set `HYRAKU_COOKIE_SECURE=false` only for HTTP testing.

Crew catalog on the public site is **empty** (`customer/src/data/workersData.ts`). Add crew in admin.

## See the site without public HTTP

From a **laptop** (not inside `root@hyraku`):

```bash
ssh -p 20115 -o IdentitiesOnly=yes -N \
  -L 8080:127.0.0.1:80 \
  -L 8081:127.0.0.1:31081 \
  root@15.235.145.222
```

Then http://127.0.0.1:8080 (customer) and http://127.0.0.1:8081 (admin). Leave that SSH window open.

On the VPS only:

```bash
curl -sI http://127.0.0.1:80 | head
```

## Finish public HTTPS from home

### A. AIC Cloud hostname (no Namecheap)

`zyu1h.aiccloud.online` is **theirs**. Do **not** add it under **Add Domain** (that asks for an A record you cannot create).

Ask **Support**: point the built-in **Public URL** reverse proxy at this instance, container port **80**. VPS Settings has no port field for that.

If they add a “public URL → internal port” control, set it to **80**.

### B. hyraku.com / hyraku.in (Namecheap)

Full steps: **`DEPLOY.md`**.

| Type | Host | Value |
|---|---|---|
| A | `@` | `15.235.145.222` |
| A | `www` | `15.235.145.222` |

Add Domain target port: **80**. No `admin` domain: the admin desk is reached over an SSH tunnel (`DEPLOY.md` §4).

## Update code

From this `hyraku/` directory:

```bash
# once: password as the only line in this file (gitignored, never rsynced)
printf '%s\n' 'YOUR_VPS_PASSWORD' > .vps-password
chmod 600 .vps-password

./deploy-vps.sh          # copy customer + admin
./deploy-vps.sh --build  # copy, then rebuild those containers on the VPS
```

Skips `node_modules`, `dist`, `.venv`, `data`, `.env.hyraku`, and `.vps-password`. After OS reinstall, SSH host key changes — `ssh-keygen -R '[15.235.145.222]:20115'`.

## Layout

| Path | Role |
|---|---|
| `customer/` | Public SPA (Vite + nginx, `/hyraku-api` → admin API) |
| `admin/backend/` | FastAPI + SQLite |
| `admin/frontend/` | Admin SPA |
| `docker-compose.yml` | Stack |
| `Caddyfile` | HTTP vhost (`admin.*` → admin, else customer) |
| `DEPLOY.md` | First-install notes |

SQLite volume: `hyraku_hyraku_admin_data`.
