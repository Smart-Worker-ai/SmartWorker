# Changelog

Hyraku uses **semver**. Bump `VERSION` and add a section here for every VPS drop.

- **MAJOR** — breaking API or booking flow
- **MINOR** — new feature, still compatible
- **PATCH** — fix or asset-only change

## 1.1.0 — 2026-11-04

- Cap **2 workers per trade** on a single booking (plus still cannot exceed live roster)
- Cap **5 consecutive days from the first work day**
- Work dates need **2 days’ notice** (book on the 1st for the 3rd; today and tomorrow are closed)
- **Flash** mode: 24-hour notice (tomorrow ok), **one day only**

## 1.0.0 — 2026-11-03 (first stable)

Public customer site + private admin desk on `hyraku.com` / `hyraku.in`.

### Customer
- Wordmark from `hyraku-logo-blue.png` / `hyraku-logo-white.png`
- Hero crew art: sunset uniformed team (`hyraku-field-crew.png`)
- Six trade cards always visible; photo falls back to SVG if the PNG is missing
- Booking shows **Not available** per trade when there is no active crew (or the availability API is down)
- Customer nginx proxies `/hyraku-api/` → admin API `/api/`

### Admin (SSH tunnel only)
- Scene illustrations on login and TOTP
- Crew, customers, enquiries, paid-booking letterpad PDF, monthly report
- TOTP (not SMS)

### Ops
- Admin bound to `127.0.0.1:31081`
- Enquiries persist, then WhatsApp
