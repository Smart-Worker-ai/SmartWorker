"""
Centralised, fail-fast configuration for the Worker Registration backend.

Every secret/URL is read from env. Required ones raise on import if missing —
this is intentional. The server refuses to boot with insecure defaults, which
is the only reliable way to keep them out of production.

Optional values (TLS bypasses, dev toggles) get safe defaults.
"""

from __future__ import annotations

import os
import sys
from typing import Optional


def _required(name: str) -> str:
    val = os.getenv(name)
    if not val:
        sys.stderr.write(
            f"\n[FATAL] Required env var {name!r} is not set. "
            f"Refusing to start.\n"
            f"See .env.example for the full list.\n\n"
        )
        raise RuntimeError(f"Missing required env var: {name}")
    return val


def _optional(name: str, default: str) -> str:
    return os.getenv(name, default)


def _bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in ("1", "true", "yes", "on")


def _list(name: str, default: list[str] | None = None) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return default or []
    return [s.strip() for s in raw.split(",") if s.strip()]


# ── Environment ──────────────────────────────────────────────────────────────
ENV: str = _optional("ENV", "development")
IS_PROD: bool = ENV == "production"

# ── CORS — explicit allow-list ───────────────────────────────────────────────
# Comma-separated. Wildcard NOT permitted in production.
CORS_ORIGINS: list[str] = _list(
    "CORS_ORIGINS",
    default=[
        "http://localhost:5174",
        "http://localhost:5173",
    ],
)
if IS_PROD and "*" in CORS_ORIGINS:
    raise RuntimeError("CORS_ORIGINS may not contain '*' in production.")

# ── Cross-service auth ───────────────────────────────────────────────────────
# Shared with the admin portal backend. Rotate after deploys.
ADMIN_SECRET: str = _required("ADMIN_SECRET") if IS_PROD else _optional(
    "ADMIN_SECRET", "dev-only-admin-secret-do-not-ship"
)

# ── Customer (Node.js) backend ──────────────────────────────────────────────
CUSTOMER_BACKEND_URL: str = _optional(
    "CUSTOMER_BACKEND_URL",
    "https://smart-workers-backend-production.up.railway.app/api/v1",
)

# ── Self URL (used to build absolute photo URLs returned to admin) ──────────
SELF_BASE_URL: str = _optional(
    "SELF_BASE_URL",
    "https://worker-portal-backend-production.up.railway.app",
)

# ── Database ─────────────────────────────────────────────────────────────────
# Postgres URL (Neon, Hetzner, etc.). Falls back to local SQLite ONLY in dev.
DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
if IS_PROD and not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is required in production "
        "(set to a Postgres connection string)."
    )

# ── File storage (R2 / S3-compatible) ────────────────────────────────────────
# Production: required. Dev: optional — falls back to local uploads/ dir.
S3_ENDPOINT_URL: Optional[str] = os.getenv("S3_ENDPOINT_URL")
S3_BUCKET: Optional[str] = os.getenv("S3_BUCKET")
S3_ACCESS_KEY: Optional[str] = os.getenv("S3_ACCESS_KEY")
S3_SECRET_KEY: Optional[str] = os.getenv("S3_SECRET_KEY")
S3_REGION: str = _optional("S3_REGION", "auto")
S3_PUBLIC_URL_BASE: Optional[str] = os.getenv("S3_PUBLIC_URL_BASE")

USE_S3_STORAGE: bool = bool(
    S3_ENDPOINT_URL and S3_BUCKET and S3_ACCESS_KEY and S3_SECRET_KEY
)
if IS_PROD and not USE_S3_STORAGE:
    raise RuntimeError(
        "Production requires S3-compatible storage. "
        "Set S3_ENDPOINT_URL, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY."
    )

# ── SMTP (email OTP + notifications) ─────────────────────────────────────────
SMTP_HOST: str = _optional("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT: int = int(_optional("SMTP_PORT", "587"))
SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
SMTP_PASS: Optional[str] = os.getenv("SMTP_PASS")
SMTP_FROM: str = _optional("SMTP_FROM", SMTP_USER or "noreply@smartworkers.in")

# ── Session token TTL (worker portal sessions) ──────────────────────────────
SESSION_TTL_HOURS: int = int(_optional("SESSION_TTL_HOURS", "24"))

# ── File upload limits ──────────────────────────────────────────────────────
MAX_DOC_SIZE_MB: int = int(_optional("MAX_DOC_SIZE_MB", "5"))
MAX_PHOTO_SIZE_MB: int = int(_optional("MAX_PHOTO_SIZE_MB", "2"))

# ── SMS Gateway (self-hosted, feature/custom-sms-gateway branch) ────────────
# Worker_website is a CLIENT only. The gateway owns OTP storage + send + verify
# and all transactional SMS dispatch. If these are unset, SMS dispatch is
# silently skipped (email-only OTP still works).
SMS_GATEWAY_URL: Optional[str] = os.getenv("SMS_GATEWAY_URL")
SMS_GATEWAY_HMAC_SECRET: Optional[str] = os.getenv("SMS_GATEWAY_HMAC_SECRET")
if IS_PROD and not (SMS_GATEWAY_URL and SMS_GATEWAY_HMAC_SECRET):
    raise RuntimeError(
        "Production requires SMS_GATEWAY_URL + SMS_GATEWAY_HMAC_SECRET. "
        "Point at the deployed sms-gateway service."
    )

# ── Rate limiting ────────────────────────────────────────────────────────────
# Backed by slowapi. Per-IP unless we add a user/session key.
RATELIMIT_REGISTRATION: str = _optional("RATELIMIT_REGISTRATION", "3/hour")
RATELIMIT_OTP_REQUEST:  str = _optional("RATELIMIT_OTP_REQUEST",  "5/hour")
RATELIMIT_OTP_VERIFY:   str = _optional("RATELIMIT_OTP_VERIFY",   "10/hour")
