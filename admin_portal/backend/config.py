"""
Admin Portal backend configuration.

Fail-fast: required env vars cause server boot to abort if missing. There are
NO insecure defaults in production. Admin password is stored as a bcrypt hash;
the server compares against the hash, not plaintext.
"""

from __future__ import annotations

import os
import sys
from typing import Optional

from passlib.hash import bcrypt


def _required(name: str) -> str:
    val = os.getenv(name)
    if not val:
        sys.stderr.write(
            f"\n[FATAL] Required env var {name!r} is not set. Refusing to start.\n"
            f"See .env.example for the full list.\n\n"
        )
        raise RuntimeError(f"Missing required env var: {name}")
    return val


def _optional(name: str, default: str) -> str:
    return os.getenv(name, default)


def _list(name: str, default: list[str] | None = None) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return default or []
    return [s.strip() for s in raw.split(",") if s.strip()]


# ── Environment ──────────────────────────────────────────────────────────────
ENV: str = _optional("ENV", "development")
IS_PROD: bool = ENV == "production"


# ── Admin credentials ────────────────────────────────────────────────────────
# Username: env value.
# Password: prefer ADMIN_PASSWORD_HASH (bcrypt). For ergonomic local dev we
# also accept ADMIN_PASSWORD plaintext and hash it at startup — but NEVER in
# production. Production must supply the hash directly.
ADMIN_USERNAME: str = _optional("ADMIN_USERNAME", "admin") if not IS_PROD else _required("ADMIN_USERNAME")

_admin_password_hash: Optional[str] = os.getenv("ADMIN_PASSWORD_HASH")
_admin_password_plain: Optional[str] = os.getenv("ADMIN_PASSWORD")

if IS_PROD:
    if not _admin_password_hash:
        raise RuntimeError(
            "Production requires ADMIN_PASSWORD_HASH (bcrypt). "
            "Generate one with: python -c \"from passlib.hash import bcrypt; "
            "import getpass; print(bcrypt.hash(getpass.getpass()))\""
        )
    ADMIN_PASSWORD_HASH: str = _admin_password_hash
else:
    # Dev convenience: hash plaintext on the fly if no hash was provided.
    if _admin_password_hash:
        ADMIN_PASSWORD_HASH = _admin_password_hash
    elif _admin_password_plain:
        ADMIN_PASSWORD_HASH = bcrypt.hash(_admin_password_plain)
    else:
        # Dev-only default. Loud warning on import.
        sys.stderr.write(
            "\n[WARN] No ADMIN_PASSWORD / ADMIN_PASSWORD_HASH set. "
            "Using dev default 'dev-password-change-me'. NOT for production.\n\n"
        )
        ADMIN_PASSWORD_HASH = bcrypt.hash("dev-password-change-me")


# ── JWT ──────────────────────────────────────────────────────────────────────
JWT_SECRET: str = _required("JWT_SECRET") if IS_PROD else _optional(
    "JWT_SECRET", "dev-jwt-secret-not-for-production"
)
JWT_ALGO: str = "HS256"
JWT_EXPIRE_HOURS: int = int(_optional("JWT_EXPIRE_HOURS", "12"))


# ── Cross-service URLs + secrets ─────────────────────────────────────────────
CUSTOMER_BACKEND_URL: str = _optional(
    "CUSTOMER_BACKEND_URL",
    "https://smart-workers-backend-production.up.railway.app/api/v1",
)
CUSTOMER_BACKEND_ADMIN_SECRET: str = _required("CUSTOMER_BACKEND_ADMIN_SECRET") if IS_PROD else _optional(
    "CUSTOMER_BACKEND_ADMIN_SECRET", "dev-only-admin-secret-do-not-ship"
)

WORKER_BACKEND_URL: str = _optional(
    "WORKER_BACKEND_URL",
    "https://worker-portal-backend-production.up.railway.app/api",
)


# ── CORS ─────────────────────────────────────────────────────────────────────
CORS_ORIGINS: list[str] = _list(
    "CORS_ORIGINS",
    default=["http://localhost:5175", "http://localhost:5173"],
)
if IS_PROD and "*" in CORS_ORIGINS:
    raise RuntimeError("CORS_ORIGINS may not contain '*' in production.")


# ── Rate limits ──────────────────────────────────────────────────────────────
RATELIMIT_LOGIN: str = _optional("RATELIMIT_LOGIN", "10/minute")
