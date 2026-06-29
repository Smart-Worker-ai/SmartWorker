# Crewzo — Customer Website

Customer-facing SPA (React 18 + Vite 6 + Tailwind). Talks to **node_backend**
(the customer API) at `/api/v1`. This is the main customer entry point; the
Flutter customer app is shelved for now.

## Features
- Browse / search verified workers (district, town, job type)
- Worker detail + reviews
- Sign in — email OTP or email + password (Firebase phone OTP can be added later
  via the Firebase web SDK; backend route `/auth/verify-firebase-phone` is ready)
- Book a worker (≥24h advance), view & cancel bookings
- Leave a review on completed bookings
- Raise & track support complaints
- Complete profile

## Dev
```bash
npm install
npm run dev        # http://localhost:5173 ; proxies /api -> http://localhost:3000
```
Run node_backend locally on :3000 first.

## Build / deploy
```bash
npm run build      # -> dist/
```
- **Docker**: built by the root `docker-compose.yml` service `customer_frontend`
  (nginx, proxies `/api` -> `node_backend:3000`). Caddy serves it at the root domain.
- **Vercel/Pages**: `vercel.json` rewrites `/api/*` -> `https://api.crewzo.in`.

API base is proxy-relative (`/api/v1`), so the backend URL is decided by the
proxy (nginx/Vercel), not baked into the bundle.
