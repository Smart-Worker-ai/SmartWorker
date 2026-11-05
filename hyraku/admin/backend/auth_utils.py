import base64
import json
import os
import secrets
import threading
from datetime import datetime, timedelta, timezone

import bcrypt as _bcrypt
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
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


_LOGIN_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_LOGIN_NONCES: dict[str, datetime] = {}
_NONCE_LOCK = threading.Lock()


def login_public_spki() -> dict:
    nonce = secrets.token_urlsafe(16)
    with _NONCE_LOCK:
        now = datetime.now(timezone.utc)
        expired = [k for k, exp in _LOGIN_NONCES.items() if exp < now]
        for k in expired:
            _LOGIN_NONCES.pop(k, None)
        _LOGIN_NONCES[nonce] = now + timedelta(minutes=3)
    der = _LOGIN_KEY.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return {
        "alg": "RSA-OAEP-256+AES-GCM",
        "spki": base64.b64encode(der).decode("ascii"),
        "nonce": nonce,
    }


def decrypt_login_blob(blob: dict) -> dict:
    try:
        wrapped = base64.b64decode(blob.get("key") or "")
        iv = base64.b64decode(blob.get("iv") or "")
        data = base64.b64decode(blob.get("data") or "")
        aes_key = _LOGIN_KEY.decrypt(
            wrapped,
            padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
        )
        raw = AESGCM(aes_key).decrypt(iv, data, None)
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(400, "Could not read login payload.")
    nonce = str(payload.get("nonce") or "")
    with _NONCE_LOCK:
        exp = _LOGIN_NONCES.pop(nonce, None)
    if not exp or exp < datetime.now(timezone.utc):
        raise HTTPException(400, "Login expired. Try again.")
    username = str(payload.get("username") or "").strip()
    password = str(payload.get("password") or "")
    if not username or not password:
        raise HTTPException(400, "Could not read login payload.")
    return {"username": username, "password": password}


def require_admin(hyraku_admin_session: str | None = Cookie(default=None, alias=COOKIE)):
    if not hyraku_admin_session:
        raise HTTPException(401, "Not authenticated.")
    data = read_token(hyraku_admin_session)
    if data.get("role") != "admin":
        raise HTTPException(401, "Not authenticated.")
    return data["sub"]
