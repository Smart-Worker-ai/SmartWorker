# Deploy Hyraku on AIC Cloud (shared-IP container)

VPS `15.235.145.222`. SSH **20115**. Do not use public 80, 443, or 8080.

| Port | Service |
|---|---|
| **31080** | Customer site (Caddy; `admin.*` Host → admin) |
| **31081** | Admin desk (direct) |
| 20115 | SSH only |

HTTPS for visitors: AIC Cloud **Add Domain** (they terminate TLS). Caddy on the VPS is HTTP.

## 1. Firewall

Add two TCP rules, allow from empty:

- **31080** — `hyraku-web`
- **31081** — `hyraku-admin`

If the panel rejects a port, pick another high port (e.g. 32080 / 32081) and set `HYRAKU_HTTP_PORT` / `HYRAKU_ADMIN_PORT` in `.env.hyraku` to match.

## 2. Domains

**Add Domain** on the VPS:

- `hyraku.com`, `www.hyraku.com`, `hyraku.in`, `www.hyraku.in` → port **31080**
- `admin.hyraku.com`, `admin.hyraku.in` → port **31080** (Host header) or **31081**

Namecheap: use the CNAME AIC Cloud shows (often `zyu1h.aiccloud.online`), not an A record that expects port 80.

Direct test after deploy (HTTP): `http://15.235.145.222:31080`

## 3. On the VPS (after SSH 20115 works)

```bash
apt-get update
apt-get install -y ca-certificates curl
curl -fsSL https://get.docker.com | sh
cd /opt/hyraku
cp .env.example .env.hyraku
# set HYRAKU_JWT_SECRET (openssl rand -hex 32) and HYRAKU_ADMIN_PASSWORD
docker compose --env-file .env.hyraku up -d --build
```

Laptop rsync (when the VPS is stable):

```bash
rsync -az --exclude node_modules --exclude .venv --exclude .env.hyraku \
  -e "ssh -p 20115 -o IdentitiesOnly=yes" \
  ./ root@15.235.145.222:/opt/hyraku/
```

Admin: `https://admin.hyraku.com` after Add Domain, then TOTP.

## 4. Updates

rsync again (keep excluding `.env.hyraku`), then `docker compose --env-file .env.hyraku up -d --build`.
