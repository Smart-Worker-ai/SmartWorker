"""
Admin login.

Phase-2 changes:
  • Password compared against bcrypt hash (never plaintext).
  • Rate-limited per IP — 10/min default.
  • Generic 401 message on any failure to defeat user enumeration.
  • Structured audit log of successful + failed attempts.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import structlog
from fastapi import APIRouter, HTTPException, Request
from jose import jwt
from passlib.hash import bcrypt
from pydantic import BaseModel

import config
from rate_limit import limiter

log = structlog.get_logger("auth")
router = APIRouter()


class LoginBody(BaseModel):
    username: str
    password: str


@router.post("/login")
@limiter.limit(config.RATELIMIT_LOGIN)
def login(request: Request, body: LoginBody):
    client = request.client.host if request.client else "unknown"
    valid_user = body.username == config.ADMIN_USERNAME
    try:
        valid_pass = bcrypt.verify(body.password, config.ADMIN_PASSWORD_HASH)
    except Exception:
        valid_pass = False

    if not (valid_user and valid_pass):
        log.warning("admin_login_failed", username=body.username, client=client)
        # Identical message regardless of which check failed.
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    token = jwt.encode(
        {
            "sub":  body.username,
            "role": "admin",
            "exp":  datetime.now(timezone.utc) + timedelta(hours=config.JWT_EXPIRE_HOURS),
            "iat":  datetime.now(timezone.utc),
        },
        config.JWT_SECRET,
        algorithm=config.JWT_ALGO,
    )
    log.info("admin_login_ok", username=body.username, client=client)
    return {"token": token, "username": body.username, "expires_in_hours": config.JWT_EXPIRE_HOURS}
