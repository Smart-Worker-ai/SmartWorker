"""
Auth + CSRF dependencies.

Token sources, in priority order:
  1. `admin_session` httpOnly cookie  (preferred — XSS-safe)
  2. `Authorization: Bearer <jwt>`     (header fallback for transition)

CSRF (double-submit pattern):
  • Login sets `csrf_token` as a NON-httpOnly cookie (JS reads it).
  • Frontend mirrors the value as `X-CSRF-Token` header on state-changing
    requests (POST/PUT/DELETE/PATCH).
  • Server compares cookie value to header value; mismatch → 403.
  • JWT also carries the csrf hash so a stolen cookie alone is useless.

Safe methods (GET/HEAD/OPTIONS) skip CSRF.
"""

from __future__ import annotations

from typing import Optional

from fastapi import Cookie, Depends, Header, HTTPException, Request
from jose import JWTError, jwt

import config


COOKIE_NAME       = "admin_session"
CSRF_COOKIE_NAME  = "csrf_token"
CSRF_HEADER_NAME  = "X-CSRF-Token"
SAFE_METHODS      = {"GET", "HEAD", "OPTIONS"}


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGO])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


def require_admin(
    request: Request,
    admin_session: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
    x_csrf_token:  Optional[str] = Header(None, alias="X-CSRF-Token"),
    csrf_token:    Optional[str] = Cookie(None, alias=CSRF_COOKIE_NAME),
) -> dict:
    # ── 1. Token extraction (cookie preferred, header fallback) ─────────────
    token = admin_session
    auth_source = "cookie"
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        auth_source = "header"
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized.")

    payload = _decode(token)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")

    # ── 2. CSRF check (only for cookie-auth + state-changing methods) ───────
    # Header-auth (Bearer) is immune to CSRF — browsers don't auto-send it.
    if auth_source == "cookie" and request.method not in SAFE_METHODS:
        if not x_csrf_token or not csrf_token or x_csrf_token != csrf_token:
            raise HTTPException(status_code=403, detail="CSRF check failed.")
        # Also check it matches the JWT-bound CSRF hash to prevent fixation.
        bound = payload.get("csrf")
        if bound and bound != csrf_token:
            raise HTTPException(status_code=403, detail="CSRF token revoked.")

    return payload
