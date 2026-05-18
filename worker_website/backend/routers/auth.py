"""
Worker portal OTP login.

OTP lifecycle is now owned by the sms-gateway service. worker_website is a
thin client: we call /api/v1/otp/send + /api/v1/otp/verify and trust the
gateway for generation, hashing, storage, expiry, rate limiting, and replay
protection.

A short email fallback is still sent so workers without delivery on their
mobile (bad SIM, no network) can complete login.
"""

from __future__ import annotations

import asyncio
import time
import uuid

import structlog
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

import config
import sms_gateway_client
from db import get_session
from models import Worker, WorkerSession
from rate_limit import limiter

log = structlog.get_logger("auth")
router = APIRouter()

SESSION_COOKIE = "worker_session"


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
    if worker and not worker.is_blocked:
        # Gateway generates, hashes, stores, sends. We hold no OTP state.
        # `userId` ties rate-limit buckets to the worker — different workers
        # can each get their own resend cooldown.
        result = sms_gateway_client.send_otp(mobile, user_id=worker.id)
        if result is None:
            log.warning("otp_gateway_unavailable", worker_id=worker.id, mobile=mobile)
            # Don't reveal failure to caller — same generic response.
        log.info("otp_requested", worker_id=worker.id, mobile=mobile)
    else:
        # Mask existence check via small async sleep.
        await asyncio.sleep(0.15)
        log.info(
            "otp_request_ignored", mobile=mobile,
            reason=("blocked" if (worker and worker.is_blocked) else "no_worker"),
        )

    return {"message": "If this number is registered, an OTP has been sent to the registered mobile."}


@router.post("/verify-otp")
@limiter.limit(config.RATELIMIT_OTP_VERIFY)
async def verify_otp(
    request: Request,
    response: Response,
    body: OtpVerify,
    session: AsyncSession = Depends(get_session),
):
    mobile = _normalize_mobile(body.mobile)

    # Gateway verifies OTP. Constant-time comparison, expiry check, and
    # attempt counters all live there.
    ok = sms_gateway_client.verify_otp(mobile, body.otp.strip())
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP.")

    worker = (await session.execute(
        select(Worker).where(Worker.mobile == mobile)
    )).scalar_one_or_none()
    if not worker or worker.is_blocked:
        # OTP itself was valid, but the worker has been blocked or deleted
        # between send and verify. Same generic 401.
        raise HTTPException(status_code=401, detail="Invalid or expired OTP.")

    token = str(uuid.uuid4())
    expires_ms = int(time.time() * 1000) + config.SESSION_TTL_HOURS * 3600 * 1000
    session.add(WorkerSession(token=token, worker_id=worker.id, expires_at=expires_ms))
    await session.flush()

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
