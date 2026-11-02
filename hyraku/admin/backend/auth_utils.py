import os
from datetime import datetime, timedelta, timezone
import bcrypt as _bcrypt
from jose import jwt, JWTError
from fastapi import Cookie, HTTPException, Response

SECRET = os.getenv("HYRAKU_JWT_SECRET", "hyraku-dev-change-this-secret")
ALGO = "HS256"
COOKIE = "hyraku_admin_session"


def hash_password(pw: str) -> str:
    return _bcrypt.hashpw(pw.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def make_token(payload: dict, minutes: int = 60 * 12) -> str:
    data = {**payload, "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes)}
    return jwt.encode(data, SECRET, algorithm=ALGO)


def read_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGO])
    except JWTError:
        raise HTTPException(401, "Invalid or expired session.")


def _cookie_secure() -> bool:
    return os.getenv("HYRAKU_COOKIE_SECURE", "false").lower() in ("1", "true", "yes")


def set_session(response: Response, username: str):
    token = make_token({"sub": username, "role": "admin"})
    response.set_cookie(
        COOKIE,
        token,
        httponly=True,
        samesite="lax",
        secure=_cookie_secure(),
        path="/",
        max_age=60 * 60 * 12,
    )


def clear_session(response: Response):
    response.delete_cookie(COOKIE, path="/")


def require_admin(hyraku_admin_session: str | None = Cookie(default=None, alias=COOKIE)):
    if not hyraku_admin_session:
        raise HTTPException(401, "Not authenticated.")
    data = read_token(hyraku_admin_session)
    if data.get("role") != "admin":
        raise HTTPException(401, "Not authenticated.")
    return data["sub"]
