# Smart Workers — Full Project Reference

> Last updated: 2026-04-23  
> Maintained by: hareesh-tech (hareeshkp2000@gmail.com)  
> Repository: Local git repo at `E:\AJPRO` — **no GitHub remote configured yet**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Product 1 — Smart Workers Customer App (Flutter)](#3-product-1--smart-workers-customer-app-flutter)
4. [Product 2 — Workers Portal (Flutter App + Node.js Backend)](#4-product-2--workers-portal-flutter-app--nodejs-backend)
5. [Product 3 — Worker Registration Website + Admin Portal](#5-product-3--worker-registration-website--admin-portal)
6. [How All Products Communicate](#6-how-all-products-communicate)
7. [Shared Node.js Backend — API Reference](#7-shared-nodejs-backend--api-reference)
8. [Deployment Details](#8-deployment-details)
9. [Environment Variables — All Services](#9-environment-variables--all-services)
10. [Notifications (Email + SMS)](#10-notifications-email--sms)
11. [Authentication Flows](#11-authentication-flows)
12. [Database Schemas](#12-database-schemas)
13. [Known Pending Items](#13-known-pending-items)

---

## 1. Project Overview

**Smart Workers** is a three-product platform connecting customers needing home services (electricians, plumbers, carpenters, etc.) with verified local workers across Kerala, India.

| Product | Who Uses It | Technology |
|---|---|---|
| Customer App | Homeowners booking workers | Flutter (Android/iOS) |
| Worker Portal App | Registered workers managing jobs | Flutter (Android/iOS) |
| Worker Registration Website | New workers sign up | React + Python FastAPI |
| Admin Portal | Admin manages workers, customers, bookings | React + Python FastAPI |

All four frontends ultimately talk to **one shared Node.js backend** (the authoritative source of truth) plus two auxiliary Python backends for worker registration and admin management.

---

## 2. Monorepo Structure

```
E:\AJPRO\
├── smart_workers_customer/       # Flutter — Customer App
├── workers_portal_app/           # Flutter — Worker Portal App
├── workers-portal-backend/       # Node.js (Express) — Main shared backend
├── worker_website/
│   ├── backend/                  # Python (FastAPI) — Worker Registration backend
│   └── frontend/                 # React (Vite) — Worker Registration website
├── admin_portal/
│   ├── backend/                  # Python (FastAPI) — Admin Portal backend
│   └── frontend/                 # React (Vite) — Admin dashboard
├── deploy.sh                     # Manual Railway redeploy helper
├── README.md                     # Basic scaffold notes
└── PROJECT_REFERENCE.md          # THIS FILE
```

---

## 3. Product 1 — Smart Workers Customer App (Flutter)

### What it does
Allows homeowners to:
- Browse and search verified workers by trade, district, and town
- Book workers for specific dates
- View and manage their bookings
- Submit ratings and feedback on completed jobs
- File grievances about workers or bookings
- Manage their profile

### Key screens
| Screen | Path |
|---|---|
| Welcome / Onboarding | `lib/features/auth/welcome_screen.dart` |
| Phone Input | `lib/features/auth/phone_input_screen.dart` |
| Email Auth | `lib/features/auth/email_auth_screen.dart` |
| OTP Verification | `lib/features/auth/otp_screen.dart` |
| Registration | `lib/features/auth/registration_screen.dart` |
| Terms | `lib/features/auth/terms_screen.dart` |
| Home (worker search) | `lib/features/home/` |
| Worker Detail | `lib/features/workers/` |
| Booking Flow | `lib/features/booking/` |
| My Bookings | `lib/features/my_bookings/` |
| Profile | `lib/features/profile/` |
| Search | `lib/features/search/` |
| Grievance | `lib/features/grievance/` |

### Tech stack
- **Framework**: Flutter 3.x with Riverpod state management
- **Auth**: Firebase Auth (phone OTP) + custom email OTP via Node.js backend
- **HTTP**: Dio
- **Storage**: flutter_secure_storage (JWT token)
- **Fonts**: Google Fonts (Inter)
- **Animations**: flutter_animate, animate_do, Lottie

### Backend it connects to
```
https://smart-workers-backend-production.up.railway.app/api/v1
```
Defined in `lib/core/constants/api_constants.dart`.

### Build info
- `pubspec.yaml` version: `1.0.0+1`
- Firebase: initialized on app start (`Firebase.initializeApp()`)
- **Not yet distributed via Firebase App Distribution** (that was the Worker Portal App)

---

## 4. Product 2 — Workers Portal (Flutter App + Node.js Backend)

### What it does
Allows registered workers to:
- Log in via email OTP (no Firebase — custom OTP via Node.js)
- View and update their profile
- Manage a **Digital Vault** (store encrypted documents like Aadhar, certificates)
- View incoming and past bookings
- Access settings (dark mode, language toggle EN/ML)

### Key screens
| Screen | Path |
|---|---|
| Welcome | `lib/features/auth/welcome_screen.dart` |
| Login (email + phone) | `lib/features/auth/login_screen.dart` |
| OTP Verify | `lib/features/auth/otp_screen.dart` |
| Registration | `lib/features/auth/registration_screen.dart` |
| Worker Profile | `lib/features/worker_profile/worker_profile_screen.dart` |
| Digital Vault | `lib/features/digital_vault/vault_screen.dart` |
| Bookings | `lib/features/booking/booking_screen.dart` |
| Settings | `lib/shared/settings_screen.dart` |

### Tech stack
- **Framework**: Flutter 3.x with Riverpod
- **Auth**: Custom email OTP (no Firebase)
- **HTTP**: Dio
- **Storage**: flutter_secure_storage (JWT)
- **Features**: Dark mode, Malayalam/English language toggle
- **Maps**: flutter_map + latlong2
- **QR**: qr_flutter

### Build info
- `pubspec.yaml` version: `0.1.1+2` (build 2)
- APK distributed via Firebase App Distribution to `davidbec968@gmail.com`
- Backend cold-start wake: app fires a health-check GET on launch to prevent Railway cold-start OTP delays

### Dark mode & Language
- `themeModeProvider = StateProvider<ThemeMode>` in `lib/main.dart`
- `localeModeProvider = StateProvider<Locale>` in `lib/main.dart`
- Toggle in `SettingsScreen` — persists per session only (no persistent storage yet)
- Translations via `AppStrings.t(key, locale)` in `lib/core/theme/app_theme.dart`
- Supported: `en` (English), `ml` (Malayalam)

---

## 5. Product 3 — Worker Registration Website + Admin Portal

### 5a. Worker Registration Website

**What it does:** New workers register by submitting:
- Personal details (name, age, gender, mobile, address)
- Trade type, district, town, interested work locations
- Document uploads (Aadhar photo, bank passbook photo, profile photo)
- Accept terms & conditions
- Receive OTP on email/SMS for verification

**Status flow:** `pending` → (admin approves) → `approved` | (admin rejects) → `rejected`

On approval: worker receives an email notification.

**URLs**
- Frontend (Vercel): deployed as static site, proxies `/api/*` → `https://worker-portal-backend-production.up.railway.app`
- Backend (Railway): `https://worker-portal-backend-production.up.railway.app`

**Frontend tech**: React + Vite, static deploy on Vercel  
**Backend tech**: Python FastAPI, SQLite, deployed on Railway

**Backend routes:**
```
POST /api/auth/send-otp        # Send OTP to worker's email
POST /api/auth/verify-otp      # Verify OTP, get session token
POST /api/workers/register     # Submit registration form + docs
GET  /api/workers/me           # Get own profile (auth required)
PUT  /api/workers/me           # Update own profile
GET  /health
```

**File uploads**: stored at `uploads/` on the Railway filesystem. Served via `/uploads/*` static route.  
> ⚠️ Railway filesystem is ephemeral — uploads reset on redeploy. Production should migrate to S3/R2/Supabase Storage.

---

### 5b. Admin Portal

**What it does:** Admins can:
- Log in with username/password (JWT)
- View dashboard stats (total workers, customers, bookings, grievances)
- Manage workers: approve/reject registrations, block/unblock, view all
- Manage customers: view, block/unblock
- Manage bookings: view all, update status
- Handle grievances: view and respond

**URLs**
- Frontend (Vercel): deployed as static site, proxies `/api/*` → `https://admin-portal-backend-production-239a.up.railway.app`
- Backend (Railway): `https://admin-portal-backend-production-239a.up.railway.app`

**Default credentials** (change in production via env vars):
```
Username: admin
Password: ***REMOVED-SECRET***
```

**Backend routes:**
```
POST /api/auth/login
GET  /api/dashboard/stats
GET  /api/workers           # list all (with filters)
GET  /api/workers/{id}
PUT  /api/workers/{id}/approve
PUT  /api/workers/{id}/reject
PUT  /api/workers/{id}/block
GET  /api/customers
PUT  /api/customers/{id}/block
GET  /api/bookings
PUT  /api/bookings/{id}/status
GET  /api/grievances
POST /api/grievances/{id}/respond
GET  /health
```

**The admin backend proxies to the Node.js backend** for certain operations:
- Worker approval/rejection triggers a call to `CUSTOMER_BACKEND_URL` to sync the worker into the SQLite workers table so they appear in customer searches.
- Uses `CUSTOMER_BACKEND_ADMIN_SECRET` header for internal auth.

---

## 6. How All Products Communicate

```
┌─────────────────────────────────────────────────────────────────┐
│                        CUSTOMER APP (Flutter)                   │
│                    smart_workers_customer/                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS /api/v1/*
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           NODE.JS MAIN BACKEND  (Railway)                       │
│    smart-workers-backend-production.up.railway.app              │
│    workers-portal-backend/  (SQLite + Express)                  │
│                                                                 │
│  /auth      /workers   /bookings   /vault                       │
│  /feedback  /grievances  /admin    /health                      │
└───────┬──────────────────────────────────────────────┬──────────┘
        │ HTTPS /api/v1/*                              │ admin secret
        │                                              ▼
┌───────▼──────────────┐              ┌────────────────────────────┐
│  WORKER PORTAL APP   │              │     ADMIN PORTAL BACKEND   │
│  (Flutter)           │              │     admin-portal-backend   │
│  workers_portal_app/ │              │     -production-239a       │
│                      │              │     .up.railway.app        │
└──────────────────────┘              └──────────────┬─────────────┘
                                                     │ serves
                                                     ▼
                                      ┌──────────────────────────────┐
                                      │   ADMIN PORTAL FRONTEND      │
                                      │   (React, Vercel)            │
                                      └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│            WORKER REGISTRATION BACKEND (Railway)                │
│     worker-portal-backend-production.up.railway.app             │
│     worker_website/backend/  (SQLite + FastAPI)                 │
└───────────────────┬─────────────────────────────────────────────┘
                    │ serves
                    ▼
       ┌────────────────────────────┐
       │  WORKER WEBSITE FRONTEND   │
       │  (React, Vercel)           │
       └────────────────────────────┘
```

### Data sync between systems

| Event | Source | Destination | How |
|---|---|---|---|
| Worker approved | Admin Portal Backend | Node.js Main Backend | HTTP POST with admin secret |
| Worker rejected | Admin Portal Backend | Node.js Main Backend | HTTP POST with admin secret |
| Booking created | Customer App → Node.js | Node.js sends email to customer + worker | nodemailer |
| Booking status change | Admin Portal | Node.js (proxy or direct) | HTTPS |
| OTP for worker login | Worker Portal App | Node.js Backend → Gmail SMTP | nodemailer |
| Worker registration OTP | Worker Website | Worker Registration Backend → Gmail SMTP | Python smtplib |
| Admin login | Admin Frontend | Admin Portal Backend | JWT |

---

## 7. Shared Node.js Backend — API Reference

**Base URL:** `https://smart-workers-backend-production.up.railway.app/api/v1`

### Auth (`/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/send-otp` | Send OTP to email (+ SMS if phone provided) |
| POST | `/auth/verify-otp` | Verify OTP, returns JWT + `isNewUser` flag |

### Workers (`/workers`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/workers` | List workers (filters: district, town, jobType, search) |
| GET | `/workers/:id` | Get single worker |

### Bookings (`/bookings`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/bookings` | Create booking (auth required) |
| GET | `/bookings` | List own bookings (auth required) |
| GET | `/bookings/:id` | Get booking detail |
| PATCH | `/bookings/:id/status` | Update status (admin) |

### Vault (`/vault`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/vault` | List vault items (auth required) |
| POST | `/vault` | Add encrypted document |
| DELETE | `/vault/:id` | Delete vault item |

### Feedback (`/feedback`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/feedback` | Submit rating + comment |
| GET | `/feedback/worker/:id` | Get worker's reviews |

### Grievances (`/grievances`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/grievances` | File a grievance |
| GET | `/grievances` | List own grievances |

### Admin (`/admin`) — internal
| Method | Endpoint | Description |
|---|---|---|
| POST | `/admin/workers/sync` | Sync worker from Worker Registration backend |
| GET | `/admin/stats` | Dashboard stats |

---

## 8. Deployment Details

### Railway Project
**Project name:** `smart-workers-backend`  
**Environment:** `production`

| Service | Runtime | Railway URL | Source folder |
|---|---|---|---|
| `smart-workers-backend` | Node.js 18 | `smart-workers-backend-production.up.railway.app` | `workers-portal-backend/` |
| `admin-portal-backend` | Python 3.11 | `admin-portal-backend-production-239a.up.railway.app` | `admin_portal/backend/` |
| `worker-portal-backend` | Python 3.11 | `worker-portal-backend-production.up.railway.app` | `worker_website/backend/` |

**Build system:** Nixpacks (auto-detected from `package.json` / `requirements.txt`)  
**Health checks:** `GET /health` on all three services  
**Railway config:** `railway.toml` in each backend folder

> **IMPORTANT:** Always run `railway up` from the correct **subdirectory**, not from `E:\AJPRO` root.
> ```bash
> # Correct:
> railway up --detach "e:/AJPRO/workers-portal-backend"
> railway up --detach "e:/AJPRO/admin_portal/backend"
> railway up --detach "e:/AJPRO/worker_website/backend"
> ```

### Vercel Frontends

| Frontend | Source folder | Vercel config | Backend proxy target |
|---|---|---|---|
| Worker Registration Site | `worker_website/frontend/` | `vercel.json` | `worker-portal-backend-production.up.railway.app` |
| Admin Portal | `admin_portal/frontend/` | `vercel.json` | `admin-portal-backend-production-239a.up.railway.app` |

Both frontends are **Vite + React** apps. Deploy via:
```bash
cd worker_website/frontend && npm run build  # output → dist/
cd admin_portal/frontend  && npm run build  # output → dist/
# then push dist/ to Vercel or drag-drop to Vercel dashboard
```

### Flutter Apps

| App | Folder | Build command | Distribution |
|---|---|---|---|
| Worker Portal App | `workers_portal_app/` | `flutter build apk --release` | Firebase App Distribution |
| Customer App | `smart_workers_customer/` | `flutter build apk --release` | Not yet distributed |

**Worker Portal App** — Firebase App Distribution:
```bash
firebase appdistribution:distribute workers_portal_app/build/app/outputs/flutter-apk/app-release.apk \
  --app <FIREBASE_APP_ID> \
  --testers davidbec968@gmail.com \
  --release-notes "v0.1.1 build 2"
```

### GitHub
> **No remote configured yet.** The local git repo has no `origin` remote.  
> Commits exist only locally. To push:
> ```bash
> git remote add origin https://github.com/hareesh-tech/<REPO_NAME>.git
> git push -u origin master
> ```
> GitHub account to use: **hareesh-tech**

---

## 9. Environment Variables — All Services

### Node.js Backend (`workers-portal-backend`) — Railway
| Variable | Value / Notes |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | set by Railway automatically |
| `DATABASE_URL` | Railway PostgreSQL (or omit for SQLite) |
| `JWT_SECRET` | secret string (min 32 chars) |
| `ENCRYPTION_KEY` | secret string (min 32 chars) for vault encryption |
| `ADMIN_SECRET` | `***REMOVED-SECRET***` |
| `CORS_ORIGIN` | comma-separated list of allowed origins |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `hareeshkp2000@gmail.com` |
| `SMTP_PASS` | `***REMOVED-SECRET***` (Gmail App Password) |
| `SMTP_FROM` | `Smart Workers noreply@smartworkers.in` |
| `FAST2SMS_API_KEY` | (optional) Fast2SMS key — needs ₹100 recharge to activate |
| `CUSTOM_SMS_GATEWAY_URL` | (optional) Android SMS gateway URL |
| `CUSTOM_SMS_GATEWAY_SECRET` | (optional) Bearer token for Android gateway |

### Admin Portal Backend (`admin-portal-backend`) — Railway
| Variable | Value / Notes |
|---|---|
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | `***REMOVED-SECRET***` |
| `JWT_SECRET` | admin JWT secret |
| `CUSTOMER_BACKEND_URL` | `https://smart-workers-backend-production.up.railway.app/api/v1` |
| `CUSTOMER_BACKEND_ADMIN_SECRET` | `***REMOVED-SECRET***` |
| `WORKER_BACKEND_URL` | `https://worker-portal-backend-production.up.railway.app/api` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `hareeshkp2000@gmail.com` |
| `SMTP_PASS` | `***REMOVED-SECRET***` |

### Worker Registration Backend (`worker-portal-backend`) — Railway
| Variable | Value / Notes |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `hareeshkp2000@gmail.com` |
| `SMTP_PASS` | `***REMOVED-SECRET***` |

---

## 10. Notifications (Email + SMS)

### Email (Gmail SMTP)
- **Account:** hareeshkp2000@gmail.com  
- **App Password:** `***REMOVED-SECRET***` (generated in Google Account → Security → App Passwords)
- **Used by:** All three Railway backends (Node.js + both Python)

**Triggered emails:**
| Trigger | Recipients | Service |
|---|---|---|
| OTP for login | Worker (email) | Node.js or Python |
| Booking confirmed | Customer + Worker | Node.js (`booking.service.js`) |
| Worker registration approved | Worker | Admin Portal Python backend |
| Worker registration rejected | Worker | Admin Portal Python backend |

### SMS
**Priority order (Node.js backend):**
1. Custom Android SMS Gateway (`CUSTOM_SMS_GATEWAY_URL`) — self-hosted, free
2. Fast2SMS API (`FAST2SMS_API_KEY`) — needs ₹100 recharge
3. Falls back silently if neither configured

**To activate Android gateway:**
- Install "SMS Gateway for Android" app on spare phone
- Set `CUSTOM_SMS_GATEWAY_URL` in Railway env to the app's IP:port
- Optionally set `CUSTOM_SMS_GATEWAY_SECRET` for auth

---

## 11. Authentication Flows

### Customer App — Firebase Phone Auth
1. Customer enters phone number
2. Firebase sends SMS OTP directly
3. Customer verifies OTP in app
4. Firebase returns UID → app exchanges for backend JWT

### Customer App — Email OTP (alternative)
1. Customer enters email
2. App calls `POST /api/v1/auth/send-otp` → Node.js sends OTP via Gmail
3. Customer enters 6-digit OTP
4. App calls `POST /api/v1/auth/verify-otp` → returns JWT + `isNewUser`
5. If `isNewUser` → redirect to RegistrationScreen to complete profile

### Worker Portal App — Email OTP
Same as Customer email OTP above, but:
- Worker enters email + phone (both required)
- OTP sent to email (+ SMS if configured)
- No Firebase dependency

### Worker Registration Website — Email OTP
1. Worker submits registration form
2. `POST /api/auth/send-otp` → Python backend sends OTP via Gmail
3. Worker verifies OTP
4. `POST /api/workers/register` — form data + photo uploads
5. Worker status = `pending`
6. Admin reviews in Admin Portal → approves/rejects

### Admin Portal — Username/Password
1. `POST /api/auth/login` with `{username, password}`
2. Returns JWT valid for 12 hours

---

## 12. Database Schemas

### Node.js SQLite (`smartworkers.db`)

**customers** — app users  
**workers** — seeded + synced from Worker Registration backend  
**bookings** — all booking records  
**feedback** — ratings + comments  
**grievances** — complaints  
**email_accounts** — email-OTP-based accounts  
**email_otps** — OTP table (6-digit, 10-min expiry)  
**login_attempts** — rate limiting  

Seed data: 33 workers pre-loaded across Kerala (Ernakulam, Thiruvananthapuram, Thrissur, Kozhikode, Kottayam, Palakkad, Malappuram, Kollam, Kannur).

### Worker Registration Python SQLite (`workers_portal.db`)

**workers** — registration submissions (with photo paths, status, is_verified)  
**worker_sessions** — bearer tokens  

### Admin Portal Python
Uses in-memory or same DB — connects to Node.js and Worker Registration backends via HTTP; does not maintain its own persistent worker/customer tables.

---

## 13. Known Pending Items

| Item | Status | Notes |
|---|---|---|
| Push code to GitHub | Pending | No remote configured. Use `hareesh-tech` account. |
| Railway filesystem uploads | Risk | Worker photo uploads reset on redeploy. Migrate to cloud storage (S3/R2/Supabase). |
| Fast2SMS SMS | Inactive | Needs ₹100 recharge at fast2sms.com to activate |
| Android SMS Gateway | Optional | Set `CUSTOM_SMS_GATEWAY_URL` to activate free SMS |
| Customer App Firebase Distribution | Not done | APK not yet uploaded to Firebase App Distribution |
| Dark mode persistence | Partial | Theme/locale resets on app restart — no persistent storage wired yet |
| Production secrets rotation | Required before public launch | JWT_SECRET, ENCRYPTION_KEY, ADMIN_PASSWORD are default values |
| PostgreSQL for Node.js backend | Optional | Currently using SQLite; set `DATABASE_URL` to use Postgres on Railway |

---

*End of document. Update this file whenever a new service, deployment, or significant feature is added.*
