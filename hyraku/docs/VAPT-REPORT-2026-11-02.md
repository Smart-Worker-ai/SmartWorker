# Hyraku VAPT report

| Field | Value |
|---|---|
| Target | Hyraku customer site + admin desk + admin API, as deployed from `prod-deployed` |
| Review date | 2 November 2026 |
| Source commit | `310f778` (`prod-deployed`) |
| Review type | White-box source and configuration review (no live exploitation) |
| Report branch | `vapt` |
| Classification | Internal — contains vulnerability descriptions and fix guidance |

This review covers the code under `hyraku/` that is copied to `/opt/hyraku` on the AIC Cloud VPS. Other products on the same git branch (Smart Workers apps, workers portal, older websites) are **out of scope** because they are not what `hyraku.com` / `hyraku.in` serve.

The Cursor security-review helper could not compute a branch-diff against the repo default base. Findings below come from a full-tree review of `hyraku/`, the Docker Compose stack, Caddy/nginx, and the known AIC shared-IP deployment.

No exploit scripts, payloads, or reproduction procedures are included.

---

## 1. Executive summary

The public booking site and the private admin desk share one FastAPI process. That API is proxied onto the **public customer origin** at `/hyraku-api/`. Combined with Caddy still routing `admin.hyraku.com` / `admin.hyraku.in` on the same listener AIC forwards to, the admin attack surface is larger than the “SSH tunnel only” design intends.

Authentication (password + TOTP, HttpOnly cookie, bcrypt) and the new SQLCipher database encryption are real improvements. They do not make up for: no rate limits, a public write API that can change customer records, TOTP enrolment that saves a secret before it is confirmed, and secrets that live in the same environment as the encrypted file.

**Overall risk: High.** Do not treat the current live site as hardened until C-01, C-02, H-01, H-02, and H-03 are fixed and the stack is rebuilt on the VPS.

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 8 |
| Medium | 12 |
| Low | 6 |

---

## 2. Scope and method

**In scope**

- `hyraku/customer` (public site)
- `hyraku/admin/backend` and `hyraku/admin/frontend` (API + admin UI)
- `hyraku/Caddyfile`, `docker-compose.yml`, nginx configs, `DEPLOY.md`
- Public domains `hyraku.com`, `www.hyraku.com`, `hyraku.in`, `www.hyraku.in`
- Admin access model (SSH tunnel to `127.0.0.1:31081`)
- Data at rest (SQLCipher) and data in transit (AIC TLS, Docker network, SSH)

**Out of scope**

- AIC Cloud’s own edge (we cannot change how they terminate TLS)
- Destructive or authenticated testing against the live VPS
- The unused `hyraku/apps` tree and the client design folder (not deployed)
- Other SmartWorker products on this branch

**Method**

1. Map every public and authenticated route.
2. Trace how bookings, cookies, and secrets move.
3. Review auth, session, TOTP, CORS, input bounds, and exports.
4. Review Docker bind addresses and Caddy host routing.
5. Rate each finding by impact if the assumption fails, not by whether a live test was run.

**Severity**

- **Critical** — unauthenticated or easily reachable path to admin functions or mass PII.
- **High** — realistic compromise of accounts, records, or availability with one weak control.
- **Medium** — meaningful weakness that needs a second condition or causes data-quality / privacy harm.
- **Low** — hardening gap or residual disclosure.

---

## 3. What is already in good shape

- Admin UI port is bound to loopback (`127.0.0.1:31081`) in Compose.
- Admin login uses bcrypt and a second TOTP factor after first enrolment.
- Session cookie is HttpOnly and SameSite=Lax.
- Database file can be encrypted with SQLCipher when `HYRAKU_DB_KEY` is set; a wrong key is refused.
- Compose refuses to start without `HYRAKU_JWT_SECRET`, `HYRAKU_ADMIN_PASSWORD`, and `HYRAKU_DB_KEY`.
- HSTS is sent on the four public hostnames.
- Caddy strips the `Server` header and sets `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`.
- React admin pages do not use raw HTML insertion; stored enquiry text is rendered as text.
- Database access uses SQLAlchemy bound parameters for user-supplied values.
- Public availability returns counts only, not crew names or phones.
- `.env.hyraku` is gitignored.

---

## 4. Findings

### C-01 — Full admin API is reachable on the public website origin

| | |
|---|---|
| Severity | Critical |
| Location | `hyraku/customer/nginx.conf:7–15` |
| Asset | `https://<public-domain>/hyraku-api/*` |

The customer nginx rewrites `/hyraku-api/` to `/api/` on `hyraku_admin_api`. That is how bookings are saved. It also publishes **every** API route on the same public origin: login, TOTP, enquiries, customers, crew, bookings, settings, and file exports.

Admin routes still require a session cookie. The problem is architectural: the lock sits on a door that faces the internet. Anyone can reach the login and TOTP endpoints without the SSH tunnel. If a session cookie is ever issued for `hyraku.com` / `hyraku.in` (an admin who signs in through that path, or a future change that serves admin on the public host), browser scripts on the customer site can call admin APIs as a same-origin request.

**Required fix**

1. Split the API: keep only `POST /api/public/enquiries` and `GET /api/public/availability` on the customer proxy.
2. Serve all `/api/auth/*` and admin data routes only from the admin container, reachable through the SSH tunnel.
3. Confirm in the browser network panel that `https://hyraku.com/hyraku-api/auth/login` is gone after rebuild (expect 404 from nginx, not a FastAPI error).

---

### C-02 — Public Caddy still routes admin hostnames

| | |
|---|---|
| Severity | Critical |
| Location | `hyraku/Caddyfile:13–19` |
| Asset | AIC-facing container port 80 (Caddy) |

Caddy is the process AIC forwards public HTTP to. It still has a host matcher for `admin.hyraku.com` and `admin.hyraku.in` that sends those requests to `hyraku_admin_web`. DNS for those names was removed, but:

- If those names are added again in AIC or DNS, admin is public immediately.
- If the edge forwards the caller’s `Host` value, a request that reaches this Caddy with an admin host can skip the customer site.

This fights the stated “admin is tunnel-only” design.

**Required fix**

1. Delete the `@admin` matcher and the admin `handle` block from the public Caddyfile.
2. Public Caddy should reverse-proxy only `customer_frontend`.
3. Keep admin exclusively on `127.0.0.1:31081`.
4. After rebuild, a request that presents an admin hostname to the public site must receive the customer site (or 404), never the admin UI.

---

### H-01 — No rate limiting on login, TOTP, or public writes

| | |
|---|---|
| Severity | High |
| Location | `hyraku/admin/backend/main.py:95–177`, `198–210` |

There is no throttle, lockout, or CAPTCHA on password login, TOTP, or `POST /api/public/enquiries`. The login endpoints are on the public origin (C-01). Public writes can fill the database.

**Required fix**

- Per-IP and per-username limits on `/api/auth/login` and `/api/auth/totp/verify` (small bursts, then cooldown).
- Lock the account for a period after repeated TOTP failures.
- Rate-limit and, if needed, CAPTCHA the public enquiry endpoint.
- Do not return different error text that names whether the username exists.

---

### H-02 — Public enquiry can change an existing customer record

| | |
|---|---|
| Severity | High |
| Location | `hyraku/admin/backend/main.py:60–73`, `95–121` |

`upsert_customer` looks up by phone. Any public POST with that phone overwrites name, town, and locality. Phone checks are “at least 8 characters after stripping +91 and spaces” — not an Indian mobile check.

**Required fix**

- Never overwrite name/address from an unauthenticated POST. Create a new enquiry linked to the existing customer, or add a pending-change flag for admin.
- Validate phone as 10 digits (or E.164) on the server.
- Cap `customer_name`, `town`, `locality`, `work_dates`, `crew_summary`, and `message` length in the Pydantic model (hundreds of characters, not megabytes).

---

### H-03 — TOTP secret is stored before the code is confirmed

| | |
|---|---|
| Severity | High |
| Location | `hyraku/admin/backend/main.py:179–196` |

`POST /api/auth/totp/qr` writes a new `totp_secret` as soon as a valid 10-minute setup token is presented. Verification happens later. Anyone who obtains the password while TOTP is not yet enabled (first login after bootstrap, or a reset) can enrol their own authenticator and keep the admin account.

**Required fix**

- Hold the new secret only in the setup token (or server-side cache), not in the user row, until `/totp/verify` succeeds.
- Do not rotate an existing enabled secret through this endpoint.
- Add a break-glass reset that requires VPS/operator access, not the login form.

---

### H-04 — Public POST bodies are unbounded

| | |
|---|---|
| Severity | High |
| Location | `hyraku/admin/backend/main.py:81–92`; `hyraku/customer/nginx.conf:5` |

`crew_summary`, `message`, `work_dates`, and `crew_json` have no max length. Customer nginx allows 5 MB bodies. Repeated posts can grow the database and admin PDF/export work.

**Required fix**

- Set field `max_length` on every public string (for example 200 / 2 000 as appropriate).
- Set a small `client_max_body_size` on the public API location (e.g. 32 KB).
- Reject extra fields (`model_config = extra = "forbid"`).

---

### H-05 — Fallback secrets exist in source

| | |
|---|---|
| Severity | High |
| Location | `hyraku/admin/backend/auth_utils.py:7`; `hyraku/admin/backend/main.py:47–48` |

If the API is started without Compose’s required env (manual `uvicorn`, an old compose file, or a missing variable that Python still defaults), JWT signing uses `hyraku-dev-change-this-secret` and the first admin user is created with password `HyrakuAdmin#2026`.

Compose on the VPS currently requires these variables. The fallbacks are still a foot-gun.

**Required fix**

- Fail process startup when `HYRAKU_JWT_SECRET` is missing or shorter than 32 random bytes.
- Fail bootstrap when `HYRAKU_ADMIN_PASSWORD` is missing; delete the hardcoded default.
- After deploy, confirm the live JWT secret is not the string in `auth_utils.py`.

---

### H-06 — Public Caddy is published on all interfaces

| | |
|---|---|
| Severity | High |
| Location | `hyraku/docker-compose.yml:63–66` |

`HYRAKU_HTTP_PORT` (default 31080) is published as `0.0.0.0:31080`. Admin on 31081 is loopback-only; Caddy is not. AIC’s shared-IP firewall has been observed to reset uncommon public ports, but that is their control, not ours. If that port is ever reachable, C-02’s host routing is on the network without AIC TLS.

**Required fix**

- Bind Caddy the same way as admin: `127.0.0.1:${HYRAKU_HTTP_PORT:-31080}:80` **unless** AIC documents that they need a LAN bind.
- Confirm with AIC which address they forward to, then bind only that.

---

### H-07 — Admin API CORS allows the public websites with credentials

| | |
|---|---|
| Severity | High |
| Location | `hyraku/docker-compose.yml:25`; `hyraku/admin/backend/main.py:33–38`; `hyraku/.env.example:10` |

`CORS_ORIGINS` lists the four public sites, the unused admin hostnames, and the AIC preview host, with `allow_credentials=True` and any method/header. Admin is supposed to be used from `http://localhost:8081`. Those public origins do not need credentialed CORS to the admin API.

**Required fix**

- Production CORS for the API process: only `http://localhost:8081` (admin tunnel).
- Public booking calls stay same-origin through `/hyraku-api/` and do not need CORS.
- Do not list `admin.hyraku.com` / `admin.hyraku.in`.

---

### H-08 — Database key lives next to the ciphertext

| | |
|---|---|
| Severity | High |
| Location | `hyraku/admin/backend/database.py:13–17`; `hyraku/docker-compose.yml:22–23` |

SQLCipher protects a stolen *file* (volume copy, backup, laptop export). `HYRAKU_DB_KEY` is in `.env.hyraku` and the container environment on the same VPS. Anyone with root or `docker inspect` can open the database. Encryption is not a control against VPS takeover.

**Required fix**

- Treat VPS root and Docker access as equivalent to database access (H-01, SSH user split, no extra open ports).
- Keep an offline copy of the key; do not store a second copy of the `.db` in unencrypted backups.
- Longer term: inject the key at start from a store that is not on the data volume (and is not world-readable on disk).

---

### M-01 — Login timing differs when the username is missing

| | |
|---|---|
| Severity | Medium |
| Location | `hyraku/admin/backend/main.py:167–171` |

`verify_password` is skipped when the user row does not exist, so a missing username returns faster than a wrong password.

**Required fix**

Always run a dummy bcrypt compare when no user is found, then return the same error.

---

### M-02 — Client can choose the booking reference

| | |
|---|---|
| Severity | Medium |
| Location | `hyraku/admin/backend/main.py:83, 100–102`; `hyraku/customer/src/context/BookingContext.jsx:123` |

`ref_code` is accepted from the client. Collisions generate a new code, but an attacker can try to pick codes that look official. The public site also generates the code with `Math.random()`, which is not a security generator (the API should ignore the client value anyway).

**Required fix**

Ignore client `ref_code`. Always generate it with `secrets` on the server and return it in the response. Use that server value in the WhatsApp text.

---

### M-03 — Contact form stores a fake phone

| | |
|---|---|
| Severity | Medium |
| Location | `hyraku/customer/src/components/AboutContactModals.tsx:101–105` |

If the contact field has no digits, the site sends `phone: '0000000000'`. That merges every such contact onto one fake customer (H-02).

**Required fix**

Require a real 10-digit phone before submit. Do not invent a placeholder phone.

---

### M-04 — Failed booking saves are hidden from the customer

| | |
|---|---|
| Severity | Medium |
| Location | `hyraku/customer/src/context/BookingContext.jsx:18–29`; `hyraku/customer/src/pages/BookingDetailsPage.jsx:24–40` |

`persistHyrakuEnquiry` returns `null` on any failure and the success UI still opens WhatsApp. Admin may never see the job. This is an integrity bug that was already observed with the `crew_json` type mismatch.

**Required fix**

If the API save fails, do not show success. Show an error and a retry. Only open WhatsApp after `{ ok: true }`.

---

### M-05 — Availability fails open

| | |
|---|---|
| Severity | Medium |
| Location | `hyraku/customer/src/context/BookingContext.jsx:62–65` |

When the availability request fails, every trade is treated as unlimited. That is intentional so bookings are not blocked, but it bypasses the “not available” rule.

**Required fix**

If availability cannot be loaded, show “availability unknown” and either block quantity increases or warn clearly. Do not treat missing data as infinite stock.

---

### M-06 — WhatsApp share URL contains customer PII

| | |
|---|---|
| Severity | Medium |
| Location | `hyraku/customer/src/context/BookingContext.jsx:9–15, 157–171` |

Name, phone, location, and dates are placed in a `wa.me` query string. That URL can appear in browser history, Referer logs, and analytics.

**Required fix**

Put only the reference id in the WhatsApp URL. Keep the full body on the server-side enquiry. Ask the customer to send a short “I submitted HYR-xxxxx”.

---

### M-07 — Browser hardening headers are incomplete

| | |
|---|---|
| Severity | Medium |
| Location | `hyraku/Caddyfile:32–36`; both nginx configs |

There is no `Content-Security-Policy`, `Permissions-Policy`, or `Cross-Origin-Opener-Policy`. A future XSS on the customer origin is more powerful because of C-01.

**Required fix**

Add a strict CSP on the customer site (default-src 'self', explicit script/style, no `unsafe-eval`). Add `Permissions-Policy` disabling camera/mic/geolocation. Keep `X-Frame-Options` (already set).

---

### M-08 — FastAPI docs are enabled

| | |
|---|---|
| Severity | Medium |
| Location | `hyraku/admin/backend/main.py:32` |

Default `/docs`, `/redoc`, and `/openapi.json` describe every route, including admin. They are not rewritten through `/hyraku-api/` today, but they are live on the API container.

**Required fix**

```python
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
```

---

### M-09 — Cookie-authenticated downloads use GET links

| | |
|---|---|
| Severity | Medium |
| Location | `hyraku/admin/frontend/src/pages/CustomersPage.jsx:14`; `EnquiriesPage.jsx:52`; `hyraku/admin/frontend/src/api.js:15–17` |

CSV / XLSX / PDF are fetched with ordinary GET + cookie. If admin is ever on a real site (not localhost), a third-party page can trigger a download of customer PII.

**Required fix**

Keep admin on localhost. Additionally, require a POST (or a one-time token) for exports, and set `Cache-Control: no-store` on those responses.

---

### M-10 — Admin tunnel uses the VPS root account

| | |
|---|---|
| Severity | Medium |
| Location | `hyraku/DEPLOY.md` §4; operational practice |

The documented tunnel is `root@15.235.145.222`. Root can read `.env.hyraku`, the database key, and every container.

**Required fix**

Create a non-root user that can only open the tunnel (or `ssh -W` to 31081). Disable password root login; use keys. Give the client that user, not root.

---

### M-11 — Phone and name checks on the booking form are client-only

| | |
|---|---|
| Severity | Medium |
| Location | `hyraku/customer/src/components/booking/BookingDetailsForm.tsx:152–154`; `main.py:98` |

The form requires non-empty fields in the browser. The API accepts any 8+ character phone and any name. The public API must be the source of truth (see H-02).

**Required fix**

Mirror server rules in the form (10-digit mobile), but enforce them in FastAPI.

---

### M-12 — AIC terminates TLS and forwards HTTP

| | |
|---|---|
| Severity | Medium (residual) |
| Location | `hyraku/Caddyfile:8–9`; `hyraku/DEPLOY.md` §5 |

The hop from AIC’s edge to container port 80 is HTTP. The application cannot encrypt that hop. Anyone with access to AIC’s internal path can read bookings and, if C-02 is unfixed, admin HTML.

**Required fix**

Ask AIC whether Add Domain can forward TLS or reach an HTTPS listener you control. Until they can, keep secrets off that hop (C-01, C-02) and assume AIC staff can see public-site traffic.

---

### L-01 — Public crew counts

`GET /api/public/availability` (`main.py:145–153`) tells anyone how many active people are on each trade. Useful for booking; also useful for reconnaissance.

**Fix:** keep counts; do not add names, towns, or phones. Consider rounding or “available / not available” only.

---

### L-02 — No audit log

Admin views and exports of PII are not recorded.

**Fix:** append-only log of login, failed login, export, status change, and payment record (who, when, which id).

---

### L-03 — Exports are plaintext

CSV / XLSX / JSON / PDF downloaded from admin are unencrypted files on the operator PC.

**Fix:** document this. Prefer download over the tunnel only. Add `Cache-Control: no-store`.

---

### L-04 — README disagrees with the running design

`hyraku/README.md` still describes an empty trade catalog, Caddy on port 3000, and other stale facts. Operators can re-open a port or skip encryption because the doc is wrong.

**Fix:** bring README in line with `DEPLOY.md` (this report’s companion docs).

---

### L-05 — Shared IPv4 with other tenants

The VPS IPv4 is shared. README notes another product on port 3000. Neighbour services are outside this codebase but affect residual risk.

**Fix:** do not publish extra ports. Keep app traffic on AIC’s domain forward + loopback admin.

---

### L-06 — Long session, no idle timeout

Cookies last 12 hours (`auth_utils.py:23, 48`) with no idle expiry and no “sign out everywhere”.

**Fix:** 1–2 hour idle timeout; rotate the JWT secret after staff changes.

---

## 5. Data and crypto notes

| Store / path | Encrypted? | Notes |
|---|---|---|
| `hyraku.db` (volume) | Yes, if `HYRAKU_DB_KEY` is set on first start after this commit | Protects stolen files, not VPS root |
| Admin password | bcrypt | Good |
| TOTP secret | Inside SQLCipher file | Written too early (H-03) |
| JWT | Signed, not encrypted | Cookie is the session |
| AIC → Caddy | HTTP | Residual (M-12) |
| Browser → AIC | HTTPS + HSTS on four names | Good |
| Admin over SSH tunnel | SSH | Good, if root is not shared (M-10) |
| WhatsApp hand-off | HTTPS to WhatsApp | Body is PII in the URL (M-06) |
| Admin CSV/PDF | No | Operator endpoint (L-03) |

SQLCipher migration (`database.py`) converts a plaintext file in place and checks row counts. After the first encrypted start, the stock `sqlite3` CLI cannot read the file. Losing `HYRAKU_DB_KEY` loses the data.

---

## 6. Fix order (do these before the next public push)

1. **C-01** — proxy only `/public/*` from the customer site.
2. **C-02** — remove admin host routing from public Caddy.
3. **H-05** — refuse to start with default JWT/password.
4. **H-03** — do not persist TOTP until verify.
5. **H-01 / H-04 / H-02** — rate limits, field caps, no unauthenticated customer overwrite.
6. **M-04 / M-02** — fail the booking UI on API error; server-issued refs.
7. **H-06 / H-07 / M-08 / M-10** — loopback Caddy if possible, tighten CORS, disable docs, non-root SSH user.
8. Rebuild on the VPS **after** `HYRAKU_DB_KEY` is set (see `DEPLOY.md` §5). Then confirm:
   - Public `/hyraku-api/auth/login` is not FastAPI.
   - Admin still opens only on `http://localhost:8081` through the tunnel.
   - A test booking appears under Enquiries.
   - `https://hyraku.com` still serves the customer site.

---

## 7. Residual risk (after the fixes above)

- AIC’s inner HTTP hop (M-12).
- Encryption key on the same host as the database (H-08).
- WhatsApp and admin downloads leaving the encrypted boundary.
- Shared IPv4 neighbours (L-05).
- No third-party pentest of the live VPS was performed.

A retest should be a code review of the patch plus a short authenticated check on staging: public routes, admin-only routes, rate-limit behaviour, and a stolen-file test of the `.db` without the key.

---

## 8. Revision

| Rev | Date | Notes |
|---|---|---|
| 1.0 | 2026-11-02 | Initial report from `prod-deployed` @ `310f778` |
