# Domain & DNS Plan

> Base domain assumed `smartworkers.in` (used throughout `Caddyfile`,
> `.env.*.example`). Replace consistently if you register a different one.
> The subdomain split below mirrors the **actual** host-based routing already
> written in `Caddyfile` and the Vercel/nginx proxies — it is not invented.

---

## 1. Subdomain structure

| Subdomain | Points to | Why it exists (code-justified) |
|---|---|---|
| `smartworkers.in`, `www` | redirect → `workers.smartworkers.in` | Root redirect already defined `[Caddyfile:84-86]`. No standalone marketing site in repo. |
| `workers.smartworkers.in` | Worker Registration SPA (Vercel/Pages) | The React worker website; `vercel.json` rewrites its `/api` to the worker backend. |
| `admin.smartworkers.in` | Admin Panel SPA (Vercel/Pages) | The React admin dashboard; separate audience, separate auth (CSRF cookies) → must be its own origin. |
| `api.smartworkers.in` | `node_backend:3000` | Customer-facing API. **Both Flutter apps hardcode this base** → it is the most stability-critical hostname `[api_constants.dart]`. Defined in `Caddyfile:21`. |
| `workers-api.smartworkers.in` | `worker_backend:8000` | Registration API (OTP, register, uploads, referral). `Caddyfile:42`; matches `SELF_BASE_URL` in `.env.worker.example`. |
| `admin-api.smartworkers.in` | `admin_backend:8001` | Admin API (proxy). `Caddyfile:63`. Separate host keeps admin traffic isolatable/WAF-restrictable. |
| `sms.smartworkers.in` *(optional, internal)* | `sms-gateway:3100` | Only if the gateway is reached over the network rather than the docker bridge. **Prefer keeping it bridge-internal** (no public DNS) since it's HMAC-signed service-to-service. |
| `uploads.smartworkers.in` *(optional)* | R2 public custom domain | Only if you switch from presigned URLs to a public asset domain (`S3_PUBLIC_URL_BASE`). Default is private/presigned → not needed. |
| `monitoring.smartworkers.in` *(optional, protected)* | Grafana (sms-gateway compose) | Dashboards. Must sit behind auth / Cloudflare Access — never public. |
| `status.smartworkers.in` *(optional)* | Statuspage / UptimeRobot public page | Customer-visible uptime. |

**No `ws.` / websocket subdomain** — confirmed there is **no WebSocket or realtime** code anywhere in the system. Do not provision one.

**No separate `docs.`** unless you publish the API docs (FastAPI auto-serves `/docs`; gate or disable in prod).

---

## 2. DNS records

On **Cloudflare** (DNS + proxy):

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `api` | VPS public IP | Proxied (orange) |
| A | `workers-api` | VPS public IP | Proxied |
| A | `admin-api` | VPS public IP | Proxied |
| A | `@` (root) | VPS public IP | Proxied |
| CNAME | `www` | `smartworkers.in` | Proxied |
| CNAME | `workers` | `cname.vercel-dns.com` (or Pages) | per host |
| CNAME | `admin` | `cname.vercel-dns.com` (or Pages) | per host |
| CAA | `@` | `0 issue "letsencrypt.org"` | — |
| TXT | `@` | SPF for the sending domain | — |
| TXT | `resend._domainkey` etc. | DKIM from email provider | — |
| TXT | `_dmarc` | DMARC policy | — |

Email auth (SPF/DKIM/DMARC) matters because **four code paths send mail** (node booking confirmations + OTP, worker approval/rejection) `[email.service.js, worker_backend]` — without them, Gmail/Resend deliverability suffers and OTP emails land in spam.

---

## 3. Issuance / cutover sequence

Caddy uses the HTTP-01 challenge `[Caddyfile]`, so:

1. Create the three `*-api` A records as **DNS-only (grey cloud)** first.
2. Bring up Caddy; confirm it obtains Let's Encrypt certs for all three hosts.
3. Verify `curl -I https://<host>/health` returns 200.
4. Flip the three records to **Proxied (orange)**.
5. Set Cloudflare SSL mode to **Full (strict)**.
6. Add the Vercel/Pages CNAMEs for `workers` and `admin`, verify their managed TLS.

This is exactly the flow `DEPLOY.md §2.1` describes; it is correct for HTTP-01.

---

## 4. CORS / origin alignment

DNS choices must match the CORS allow-lists already enforced in code (no wildcards in prod):
- `node_backend` `CORS_ORIGIN` → `https://workers.smartworkers.in,https://admin.smartworkers.in` `[.env.node.example]`
- `worker_backend` `CORS_ORIGINS` → same two SPA origins `[.env.worker.example]`
- `admin_backend` `CORS_ORIGINS` → `https://admin.smartworkers.in` only `[.env.admin.example]`

If you rename any subdomain, update these three env values in lockstep or browsers will block the SPAs.
