# Deploy Hyraku on AIC Cloud (shared-IP container)

VPS `15.235.145.222`. SSH **20115**.

| Port | Service |
|---|---|
| **80** (inside the container; AIC routes public 80/443 here by domain) | Customer site (Caddy) |
| **31080** | Same Caddy, published on the VPS (not reachable from the internet) |
| **31081** | Admin desk, bound to `127.0.0.1` on the VPS (SSH tunnel only) |
| 20115 | SSH only |

AIC runs the front proxy on public 80/443 of `15.235.145.222`, terminates TLS, and forwards each
domain added under **Add Domain** to container port 80. Caddy on the VPS is plain HTTP.

Public URL: `https://zyoim.aiccloud.online`.

## 1. AIC panel — Add Domain

On the VPS card → **+ Add Domain**, target port **80**:

| Domain | Port |
|---|---|
| `hyraku.com` | 80 |
| `www.hyraku.com` | 80 |
| `hyraku.in` | 80 |
| `www.hyraku.in` | 80 |

Do **not** add `admin.hyraku.com` / `admin.hyraku.in`. The admin desk is private (section 4).

After DNS is live, press **Verify DNS** on each domain. AIC issues the certificate once it passes.

## 2. Namecheap DNS (both domains on BasicDNS)

Nameservers: `dns1.registrar-servers.com` / `dns2.registrar-servers.com`.

**Domain List → hyraku.com / hyraku.in → Manage → Advanced DNS → Host records**

| Type | Host | Value | TTL |
|---|---|---|---|
| A | `@` | `15.235.145.222` | Automatic |
| A | `www` | `15.235.145.222` | Automatic |

No `admin` record. `hyraku.in` keeps its Private Email mail settings; `hyraku.com` has no email.

## 3. Check

```bash
nslookup hyraku.com      # 15.235.145.222
nslookup www.hyraku.com  # 15.235.145.222
nslookup hyraku.in       # 15.235.145.222
nslookup www.hyraku.in   # 15.235.145.222
```

Then open `https://hyraku.com` and `https://hyraku.in`.

## 4. Admin desk (private, SSH tunnel)

The admin desk has no public domain. Open it through SSH from the client's computer:

```bash
ssh -p 20115 -N -L 8081:127.0.0.1:31081 <user>@15.235.145.222
```

Leave that running, then open `http://localhost:8081` in Chrome or Edge and log in (TOTP).
Close the terminal to end the session.

## 5. Encryption

| Path | Protection |
|---|---|
| Browser ↔ AIC front proxy | HTTPS (Let's Encrypt), HSTS on the four public domains |
| AIC front proxy → VPS port 80 | Plain HTTP inside AIC's network (AIC controls this hop) |
| Containers ↔ each other | Docker network on the VPS; never leaves the machine |
| Admin desk | SSH tunnel (encrypted end to end) |
| Database file | SQLCipher, AES-256, key `HYRAKU_DB_KEY` |

Set the key once in `/opt/hyraku/.env.hyraku`:

```bash
echo "HYRAKU_DB_KEY=$(openssl rand -hex 32)" >> /opt/hyraku/.env.hyraku
grep HYRAKU_DB_KEY /opt/hyraku/.env.hyraku   # copy this into a password manager
```

On the first start with the key, an existing unencrypted database is converted in place (row counts
are checked before the plain file is replaced). Never change or lose the key: the data cannot be
read without it. The `sqlite3` command-line tool can no longer open the file.
