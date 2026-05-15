"""
Worker portal OTP login.

Phase-2 changes:
  • Rate limiting on both request-otp and verify-otp.
  • OTP response never leaks the code (devOtp/devEmail removed).
  • Session tokens carry an expires_at column.
  • Generic error messages — no longer reveal "no worker with this mobile".
    Use the same response shape for "no such mobile" vs "wrong OTP" to
    block enumeration.
"""

from __future__ import annotations

import random
import time
import uuid

import structlog
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

import config
from database import get_conn
from email_service import _send_otp_sms as send_otp_sms
from email_service import send_otp_email
from rate_limit import limiter

log = structlog.get_logger("auth")
router = APIRouter()

OTP_TTL_SECONDS = 600  # 10 minutes


class OtpRequest(BaseModel):
    mobile: str


class OtpVerify(BaseModel):
    mobile: str
    otp: str


def _normalize_mobile(raw: str) -> str:
    digits = "".join(c for c in raw if c.isdigit())
    if len(digits) >= 12 and digits.startswith("91"):
        digits = digits[2:]
    return f"+91{digits[-10:]}" if len(digits) >= 10 else raw.strip()


@router.post("/request-otp")
@limiter.limit(config.RATELIMIT_OTP_REQUEST)
def request_otp(request: Request, body: OtpRequest):
    mobile = _normalize_mobile(body.mobile)
    conn = get_conn()
    worker = conn.execute(
        "SELECT id, email, status, is_blocked FROM workers WHERE mobile = ?",
        (mobile,),
    ).fetchone()

    # Same response whether the worker exists or not — defeats enumeration.
    # Email is only sent if the row exists.
    if worker and not worker["is_blocked"] and worker["email"]:
        conn.execute("DELETE FROM worker_otps WHERE mobile = ?", (mobile,))
        otp = f"{random.randint(0, 999999):06d}"
        expires_at = int(time.time() * 1000) + OTP_TTL_SECONDS * 1000
        conn.execute(
            "INSERT INTO worker_otps (id, mobile, otp, expires_at) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), mobile, otp, expires_at),
        )
        conn.commit()
        try:
            send_otp_email(worker["email"], otp)
        except Exception as e:
            log.warning("otp_email_failed", mobile=mobile, error=str(e))
        try:
            send_otp_sms(mobile, otp)
        except Exception as e:
            log.warning("otp_sms_failed", mobile=mobile, error=str(e))
        log.info("otp_requested", mobile=mobile)
    else:
        # Sleep briefly to mask the existence check in response timing.
        time.sleep(0.15)
        log.info("otp_request_ignored", mobile=mobile,
                 reason=("blocked" if (worker and worker["is_blocked"]) else
                         "no_email" if (worker and not worker["email"]) else
                         "no_worker"))

    conn.close()

    # Identical response shape always.
    return {"message": "If this number is registered, an OTP has been sent to the registered email and mobile."}


@router.post("/verify-otp")
@limiter.limit(config.RATELIMIT_OTP_VERIFY)
def verify_otp(request: Request, body: OtpVerify):
    mobile = _normalize_mobile(body.mobile)
    conn = get_conn()

    record = conn.execute(
        "SELECT * FROM worker_otps WHERE mobile = ?", (mobile,)
    ).fetchone()
    if not record:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid OTP.")

    if int(time.time() * 1000) > record["expires_at"]:
        conn.execute("DELETE FROM worker_otps WHERE mobile = ?", (mobile,))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=410, detail="OTP has expired. Please request a new one.")

    if record["otp"] != body.otp.strip():
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid OTP.")

    conn.execute("DELETE FROM worker_otps WHERE mobile = ?", (mobile,))

    worker = conn.execute(
        "SELECT * FROM workers WHERE mobile = ?", (mobile,)
    ).fetchone()
    if not worker or worker["is_blocked"]:
        conn.commit()
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid OTP.")

    token = str(uuid.uuid4())
    expires_ms = int(time.time() * 1000) + config.SESSION_TTL_HOURS * 3600 * 1000
    conn.execute(
        "INSERT INTO worker_sessions (token, worker_id, expires_at) VALUES (?, ?, ?)",
        (token, worker["id"], expires_ms),
    )
    conn.commit()
    conn.close()

    safe = {k: v for k, v in dict(worker).items() if k not in ("passbook_photo", "aadhar_photo")}
    log.info("worker_login", worker_id=worker["id"])
    return {"token": token, "worker": safe, "expires_at": expires_ms}
