"""
Worker portal OTP login. Async SQLAlchemy edition.
"""

from __future__ import annotations

import random
import time
import uuid

import structlog
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

import config
from db import get_session
from email_service import _send_otp_sms as send_otp_sms
from email_service import send_otp_email
from models import Worker, WorkerOtp, WorkerSession
from rate_limit import limiter

log = structlog.get_logger("auth")
router = APIRouter()

OTP_TTL_SECONDS = 600                  # 10 minutes
SESSION_COOKIE  = "worker_session"


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
async def request_otp(
    request: Request,
    body: OtpRequest,
    session: AsyncSession = Depends(get_session),
):
    mobile = _normalize_mobile(body.mobile)
    worker = (await session.execute(
        select(Worker).where(Worker.mobile == mobile)
    )).scalar_one_or_none()

    # Same response shape always — defeats enumeration.
    if worker and not worker.is_blocked and worker.email:
        # Clear any old OTPs for this mobile.
        await session.execute(delete(WorkerOtp).where(WorkerOtp.mobile == mobile))
        otp = f"{random.randint(0, 999999):06d}"
        expires_at = int(time.time() * 1000) + OTP_TTL_SECONDS * 1000
        session.add(WorkerOtp(
            id=str(uuid.uuid4()), mobile=mobile, otp=otp, expires_at=expires_at
        ))
        await session.flush()

        try:
            send_otp_email(worker.email, otp)
        except Exception as e:
            log.warning("otp_email_failed", mobile=mobile, error=str(e))
        try:
            send_otp_sms(mobile, otp)
        except Exception as e:
            log.warning("otp_sms_failed", mobile=mobile, error=str(e))
        log.info("otp_requested", mobile=mobile)
    else:
        # Mask the existence check via a brief sleep.
        import asyncio
        await asyncio.sleep(0.15)
        log.info(
            "otp_request_ignored", mobile=mobile,
            reason=("blocked" if (worker and worker.is_blocked) else
                    "no_email" if (worker and not worker.email) else "no_worker"),
        )

    return {"message": "If this number is registered, an OTP has been sent to the registered email and mobile."}


@router.post("/verify-otp")
@limiter.limit(config.RATELIMIT_OTP_VERIFY)
async def verify_otp(
    request: Request,
    response: Response,
    body: OtpVerify,
    session: AsyncSession = Depends(get_session),
):
    mobile = _normalize_mobile(body.mobile)

    record = (await session.execute(
        select(WorkerOtp).where(WorkerOtp.mobile == mobile)
    )).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=401, detail="Invalid OTP.")

    if int(time.time() * 1000) > record.expires_at:
        await session.execute(delete(WorkerOtp).where(WorkerOtp.mobile == mobile))
        raise HTTPException(status_code=410, detail="OTP has expired. Please request a new one.")

    if record.otp != body.otp.strip():
        raise HTTPException(status_code=401, detail="Invalid OTP.")

    # Consume OTP.
    await session.execute(delete(WorkerOtp).where(WorkerOtp.mobile == mobile))

    worker = (await session.execute(
        select(Worker).where(Worker.mobile == mobile)
    )).scalar_one_or_none()
    if not worker or worker.is_blocked:
        raise HTTPException(status_code=401, detail="Invalid OTP.")

    token = str(uuid.uuid4())
    expires_ms = int(time.time() * 1000) + config.SESSION_TTL_HOURS * 3600 * 1000
    session.add(WorkerSession(token=token, worker_id=worker.id, expires_at=expires_ms))
    await session.flush()

    # Set httpOnly cookie so the SPA never has to handle the token.
    # Bearer-in-body is kept for the transition period and old clients.
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=config.SESSION_TTL_HOURS * 3600,
        httponly=True,
        secure=config.IS_PROD,
        samesite="lax",
        path="/",
    )

    log.info("worker_login", worker_id=worker.id)
    return {
        "token": token,
        "worker": {
            "id": worker.id, "name": worker.name, "mobile": worker.mobile,
            "email": worker.email, "status": worker.status,
            "is_verified": worker.is_verified, "is_blocked": worker.is_blocked,
            "job_type": worker.job_type, "district": worker.district,
            "town": worker.town, "daily_rate": worker.daily_rate,
        },
        "expires_at": expires_ms,
    }


@router.post("/logout")
async def logout(
    response: Response,
    worker_session: str | None = Cookie(None, alias=SESSION_COOKIE),
    session: AsyncSession = Depends(get_session),
):
    """Revoke server-side session record + clear cookie. Idempotent."""
    if worker_session:
        await session.execute(
            delete(WorkerSession).where(WorkerSession.token == worker_session)
        )
    response.delete_cookie(SESSION_COOKIE, path="/", samesite="lax", secure=config.IS_PROD)
    return {"message": "Logged out."}
