"""
Admin login + logout + session probe.

Phase-B (this commit):
  • Login issues an httpOnly `admin_session` cookie + a non-httpOnly
    `csrf_token` cookie (double-submit). No token returned in body.
  • /me returns 200 if the cookie is valid — used by the SPA to decide
    whether to render the Protected route or redirect to /login.
  • /logout clears both cookies.

Backward compat: returns `token` in body too so any old caller that still
reads it keeps working during the transition. Frontend should ignore it.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from jose import jwt
from passlib.hash import bcrypt
from pydantic import BaseModel

import config
from deps import COOKIE_NAME, CSRF_COOKIE_NAME, require_admin
from rate_limit import limiter

log = structlog.get_logger("auth")
router = APIRouter()


def _set_session_cookies(response: Response, jwt_token: str, csrf: str) -> None:
    """Set the two cookies that make up the session.

    `admin_session` is httpOnly so JS can't read it (XSS-safe). `csrf_token`
    is intentionally readable so the SPA can mirror it into the X-CSRF-Token
    header on writes.
    """
    max_age = config.JWT_EXPIRE_HOURS * 3600
    common = dict(
        max_age=max_age,
        secure=config.IS_PROD,
        samesite="lax",
        path="/",
    )
    response.set_cookie(COOKIE_NAME,       jwt_token, httponly=True,  **common)
    response.set_cookie(CSRF_COOKIE_NAME,  csrf,      httponly=False, **common)


def _clear_session_cookies(response: Response) -> None:
    for name in (COOKIE_NAME, CSRF_COOKIE_NAME):
        response.delete_cookie(name, path="/", samesite="lax", secure=config.IS_PROD)


class LoginBody(BaseModel):
    username: str
    password: str


@router.post("/login")
@limiter.limit(config.RATELIMIT_LOGIN)
def login(request: Request, response: Response, body: LoginBody):
    client = request.client.host if request.client else "unknown"
    valid_user = body.username == config.ADMIN_USERNAME
    try:
        valid_pass = bcrypt.verify(body.password, config.ADMIN_PASSWORD_HASH)
    except Exception:
        valid_pass = False

    if not (valid_user and valid_pass):
        log.warning("admin_login_failed", username=body.username, client=client)
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    csrf = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub":  body.username,
            "role": "admin",
            "csrf": csrf,
            "iat":  now,
            "exp":  now + timedelta(hours=config.JWT_EXPIRE_HOURS),
        },
        config.JWT_SECRET,
        algorithm=config.JWT_ALGO,
    )

    _set_session_cookies(response, token, csrf)
    log.info("admin_login_ok", username=body.username, client=client)
    # `token` retained in body only for the transition period — new client
    # ignores it and relies on cookies.
    return {
        "username":         body.username,
        "expires_in_hours": config.JWT_EXPIRE_HOURS,
        "token":            token,
    }


@router.post("/logout")
def logout(response: Response):
    _clear_session_cookies(response)
    return {"message": "Logged out."}


@router.get("/me")
def me(payload: dict = Depends(require_admin)):
    return {
        "username": payload.get("sub"),
        "role":     payload.get("role"),
        "exp":      payload.get("exp"),
    }
