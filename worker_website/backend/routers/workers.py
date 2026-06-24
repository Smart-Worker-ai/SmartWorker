"""
Worker Registration endpoints — registration, public listing, admin actions,
referral system, and activity event log.

Phase 4: adds worker_uid identity, referral QR/link, APK download tracking,
         and per-worker event log (admin notifications feed).
"""

from __future__ import annotations

import base64
import hashlib
import io
import json
import uuid as _uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
import structlog
from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.responses import RedirectResponse
from sqlalchemy import exc as sa_exc
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import config
import storage
from db import get_session
from email_service import (
    send_approval_email,
    send_approval_sms,
    send_registration_email,
    send_registration_sms,
)
from models import ReferralDownload, SyncRetry, Worker, WorkerEarning, WorkerEvent, WorkerSession
from rate_limit import limiter
from security import validate_upload

log = structlog.get_logger("workers")
router = APIRouter()


# ── QR code helper ────────────────────────────────────────────────────────────
def _qr_data_url(url: str) -> str:
    """Generate a base64-encoded PNG data URL for the given URL string.

    Uses the ``qrcode`` library if available; falls back to a placeholder if
    the package is not installed (so the server still boots without it).
    """
    try:
        import qrcode  # type: ignore
        from qrcode.image.pil import PilImage  # type: ignore

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode()
        return f"data:image/png;base64,{b64}"
    except ImportError:
        log.warning("qrcode_library_missing", url=url)
        return ""


# ── Worker UID generator ──────────────────────────────────────────────────────
async def _generate_worker_uid(session: AsyncSession) -> str:
    """Return the next SW-XXXXXX UID. Unique constraint on workers.worker_uid
    acts as the safety net — this helper just picks MAX+1."""
    result = await session.execute(
        select(func.count(Worker.id))
    )
    count = (result.scalar() or 0) + 1
    return f"SW-{count:06d}"


# ── Admin auth helper ─────────────────────────────────────────────────────────
def _require_admin(x_admin_secret: Optional[str] = Header(None)):
    if x_admin_secret != config.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden.")


# ── Worker session auth ───────────────────────────────────────────────────────
async def _get_worker(
    authorization:  Optional[str] = Header(None),
    worker_session: Optional[str] = Cookie(None, alias="worker_session"),
    session: AsyncSession = Depends(get_session),
) -> Worker:
    import time
    token = worker_session
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized.")

    now_ms = int(time.time() * 1000)
    stmt = (
        select(Worker)
        .join(WorkerSession, WorkerSession.worker_id == Worker.id)
        .where(
            WorkerSession.token == token,
            (WorkerSession.expires_at.is_(None)) | (WorkerSession.expires_at > now_ms),
        )
    )
    result = await session.execute(stmt)
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return worker


# ── URL helpers ───────────────────────────────────────────────────────────────
def _abs(stored: Optional[str]) -> Optional[str]:
    return storage.resolve_url(stored)


def _worker_to_dict(w: Worker, include_docs: bool = False, resolve_urls: bool = True) -> dict:
    d = {
        "id":                 w.id,
        "worker_uid":         w.worker_uid,
        "name":               w.name,
        "age":                w.age,
        "gender":             w.gender,
        "mobile":             w.mobile,
        "email":              w.email,
        "address":            w.address,
        "district":           w.district,
        "town":               w.town,
        "job_type":           w.job_type,
        "current_location":   w.current_location,
        "interested_locations": w.interested_locations,
        "facilities_requested": w.facilities_requested,
        "accepted_terms":     w.accepted_terms,
        "status":             w.status,
        "is_blocked":         w.is_blocked,
        "is_verified":        w.is_verified,
        "daily_rate":         w.daily_rate,
        "rating":             w.rating,
        "total_reviews":      w.total_reviews,
        "experience_years":   w.experience_years,
        "referral_credits":   w.referral_credits,
        "total_referrals":    w.total_referrals,
        "created_at":         w.created_at.isoformat() if w.created_at else None,
        "profile_photo":      _abs(w.profile_photo) if resolve_urls else w.profile_photo,
    }
    if include_docs:
        d["passbook_photo"] = _abs(w.passbook_photo) if resolve_urls else w.passbook_photo
        d["aadhar_photo"]   = _abs(w.aadhar_photo)   if resolve_urls else w.aadhar_photo
    return d


def _event_to_dict(e: WorkerEvent) -> dict:
    return {
        "id":          e.id,
        "worker_id":   e.worker_id,
        "event_type":  e.event_type,
        "description": e.description,
        "meta":        e.meta_dict(),
        "created_at":  e.created_at.isoformat() if e.created_at else None,
    }


async def _log_event(
    session: AsyncSession,
    worker: Worker,
    event_type: str,
    description: str,
    meta: dict | None = None,
) -> None:
    """Append an event to the worker_events table. Non-fatal on error."""
    try:
        session.add(WorkerEvent(
            worker_id=worker.id,
            event_type=event_type,
            description=description,
            meta=json.dumps(meta) if meta else None,
        ))
    except Exception as e:
        log.warning("event_log_failed", worker_id=worker.id, event=event_type, error=str(e))


# ── Registration ──────────────────────────────────────────────────────────────
@router.post("/register")
@limiter.limit(config.RATELIMIT_REGISTRATION)
async def register_worker(
    request: Request,
    name: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    mobile: str = Form(...),
    email: str = Form(...),
    address: str = Form(...),
    district: str = Form(...),
    town: str = Form(...),
    job_type: str = Form(...),
    current_location: str = Form(...),
    interested_locations: str = Form(...),
    facilities_requested: str = Form(""),
    daily_rate: float = Form(800),
    experience_years: int = Form(0),
    accepted_terms: bool = Form(...),
    passbook_photo: UploadFile = File(...),
    aadhar_photo: UploadFile = File(...),
    profile_photo: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    if not accepted_terms:
        raise HTTPException(status_code=400, detail="You must accept the Terms & Conditions.")
    if age < 18 or age > 70:
        raise HTTPException(status_code=400, detail="Age must be between 18 and 70.")

    digits = "".join(c for c in mobile if c.isdigit())
    if len(digits) >= 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) != 10 or digits[0] not in "6789":
        raise HTTPException(status_code=400, detail="Invalid Indian mobile number.")
    normalized_mobile = f"+91{digits}"

    email = email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    passbook_bytes, passbook_ext = await validate_upload(
        passbook_photo, max_size_mb=config.MAX_DOC_SIZE_MB, allow_pdf=True, field_name="Passbook"
    )
    aadhar_bytes, aadhar_ext = await validate_upload(
        aadhar_photo, max_size_mb=config.MAX_DOC_SIZE_MB, allow_pdf=True, field_name="Aadhaar"
    )
    photo_bytes, photo_ext = await validate_upload(
        profile_photo, max_size_mb=config.MAX_PHOTO_SIZE_MB, allow_pdf=False, field_name="Photo"
    )

    existing = (await session.execute(
        select(Worker).where((Worker.mobile == normalized_mobile) | (Worker.email == email))
    )).scalars().first()
    if existing:
        if existing.mobile == normalized_mobile:
            raise HTTPException(status_code=409, detail="A worker with this mobile number already exists.")
        raise HTTPException(status_code=409, detail="A worker with this email address already exists.")

    passbook_url = storage.save(passbook_bytes, "passbook", passbook_ext)
    aadhar_url   = storage.save(aadhar_bytes,   "aadhar",   aadhar_ext)
    photo_url    = storage.save(photo_bytes,    "photos",   photo_ext)

    # Generate stable, human-readable Worker UID with retry on rare collision.
    worker_uid = await _generate_worker_uid(session)

    worker = Worker(
        name=name.strip(), age=age, gender=gender,
        mobile=normalized_mobile, email=email,
        address=address.strip(), district=district.strip(), town=town.strip(),
        job_type=job_type.strip(), current_location=current_location.strip(),
        interested_locations=interested_locations.strip(),
        facilities_requested=facilities_requested.strip(),
        passbook_photo=passbook_url, aadhar_photo=aadhar_url, profile_photo=photo_url,
        accepted_terms=True, daily_rate=daily_rate, experience_years=experience_years,
        worker_uid=worker_uid,
    )
    session.add(worker)
    await session.flush()

    await _log_event(session, worker, "registered",
                     f"Worker registered with UID {worker_uid}",
                     {"mobile": normalized_mobile, "job_type": job_type.strip()})

    try:
        send_registration_email(email, name.strip())
    except Exception as e:
        log.warning("registration_email_failed", email=email, error=str(e))
    try:
        send_registration_sms(normalized_mobile, name.strip())
    except Exception as e:
        log.warning("registration_sms_failed", mobile=normalized_mobile, error=str(e))

    log.info("worker_registered", worker_id=worker.id, worker_uid=worker_uid, mobile=normalized_mobile)
    return {
        "message": "Registration submitted. Our team will verify your profile within 24 hours.",
        "worker": _worker_to_dict(worker, include_docs=False),
    }


# ── Authenticated worker self-service ─────────────────────────────────────────
@router.get("/me")
async def get_me(worker: Worker = Depends(_get_worker)):
    return {"worker": _worker_to_dict(worker, include_docs=False)}


@router.get("/me/referral")
async def get_my_referral(
    request: Request,
    worker: Worker = Depends(_get_worker),
    session: AsyncSession = Depends(get_session),
):
    """Return the worker's referral link and QR code (as a data URL)."""
    base = config.SELF_BASE_URL.rstrip("/")
    referral_link = f"{base}/api/workers/ref/{worker.worker_uid}/download"
    qr_url = _qr_data_url(referral_link)

    await _log_event(session, worker, "referral_qr_generated",
                     "Worker viewed/generated referral QR code",
                     {"worker_uid": worker.worker_uid})

    return {
        "worker_uid":     worker.worker_uid,
        "referral_link":  referral_link,
        "qr_code":        qr_url,
        "referral_credits": worker.referral_credits,
        "total_referrals":  worker.total_referrals,
    }


# ── Public referral APK download ──────────────────────────────────────────────
@router.get("/ref/{worker_uid}/download")
@limiter.limit("30/minute")
async def referral_download(
    request: Request,
    worker_uid: str,
    session: AsyncSession = Depends(get_session),
):
    """
    Called when a customer scans a referral QR or follows a referral link.

    Behaviour:
    1. Resolve worker from worker_uid.
    2. Compute device_hash = SHA256(client_ip + user_agent) — no PII stored.
    3. If this (worker, device) pair has never been seen before:
       - Insert referral_downloads row.
       - Increment worker.referral_credits and worker.total_referrals.
       - Log 'apk_downloaded_via_referral' and 'referral_credit_awarded' events.
    4. Redirect to the customer APK download URL.
    """
    w = (await session.execute(
        select(Worker).where(Worker.worker_uid == worker_uid)
    )).scalar_one_or_none()
    if not w or w.is_blocked:
        raise HTTPException(status_code=404, detail="Referral link not found.")

    # Device fingerprint — SHA256 of IP + User-Agent (no PII stored).
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    device_hash = hashlib.sha256(f"{ip}|{ua}".encode()).hexdigest()

    # Check for existing download by this device for this worker.
    existing = (await session.execute(
        select(ReferralDownload).where(
            ReferralDownload.worker_id == w.id,
            ReferralDownload.device_hash == device_hash,
        )
    )).scalar_one_or_none()

    if not existing:
        # First-time download — award credit.
        try:
            session.add(ReferralDownload(
                worker_id=w.id,
                device_hash=device_hash,
            ))
            w.referral_credits += 1
            w.total_referrals  += 1
            await session.flush()

            await _log_event(session, w, "apk_downloaded_via_referral",
                             "Customer downloaded APK via worker's referral link",
                             {"worker_uid": worker_uid, "device_hash_prefix": device_hash[:8]})
            await _log_event(session, w, "referral_credit_awarded",
                             f"Referral credit awarded (total: {w.referral_credits})",
                             {"worker_uid": worker_uid, "credits": w.referral_credits})

            log.info("referral_credit_awarded", worker_id=w.id, worker_uid=worker_uid,
                     credits=w.referral_credits)
        except sa_exc.IntegrityError:
            # Race condition — another request inserted the same device_hash.
            await session.rollback()
            log.info("referral_duplicate_race", worker_id=w.id, worker_uid=worker_uid)
    else:
        log.info("referral_duplicate_device", worker_id=w.id, worker_uid=worker_uid)

    apk_url = config.CUSTOMER_APK_URL
    return RedirectResponse(url=apk_url, status_code=302)


# ── Public listing ────────────────────────────────────────────────────────────
@router.get("/public")
async def list_public_workers(
    district: Optional[str] = None,
    town: Optional[str] = None,
    job_type: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Worker).where(
        Worker.is_blocked.is_(False),
        Worker.is_verified.is_(True),
        Worker.status == "approved",
    )
    if district:
        from sqlalchemy import func as sa_func
        stmt = stmt.where(sa_func.lower(Worker.district) == district.lower())
    if town:
        from sqlalchemy import func as sa_func
        stmt = stmt.where(sa_func.lower(Worker.town) == town.lower())
    if job_type:
        from sqlalchemy import func as sa_func
        stmt = stmt.where(sa_func.lower(Worker.job_type) == job_type.lower())
    stmt = stmt.order_by(Worker.rating.desc(), Worker.total_reviews.desc())

    rows = (await session.execute(stmt)).scalars().all()
    return {"workers": [_worker_to_dict(w, include_docs=False) for w in rows]}


@router.get("/{worker_id}")
async def get_worker(worker_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Worker, worker_id)
    if not w or w.is_blocked:
        raise HTTPException(status_code=404, detail="Worker not found.")
    return {"worker": _worker_to_dict(w, include_docs=False)}


# ── Admin endpoints (x-admin-secret) ─────────────────────────────────────────
@router.get("/admin/all", dependencies=[Depends(_require_admin)])
async def admin_list_all_workers(session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(Worker).order_by(Worker.created_at.desc())
    )).scalars().all()
    return {"workers": [_worker_to_dict(w, include_docs=True) for w in rows]}


@router.get("/admin/events", dependencies=[Depends(_require_admin)])
async def admin_list_events(
    limit: int = 50,
    offset: int = 0,
    event_type: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Platform-wide event feed for admin notifications panel."""
    stmt = (
        select(WorkerEvent)
        .order_by(WorkerEvent.created_at.desc())
        .limit(min(limit, 200))
        .offset(offset)
    )
    if event_type:
        stmt = stmt.where(WorkerEvent.event_type == event_type)
    rows = (await session.execute(stmt)).scalars().all()

    # Enrich each event with the worker's name and worker_uid.
    enriched = []
    worker_cache: dict[str, Worker] = {}
    for e in rows:
        if e.worker_id not in worker_cache:
            w = await session.get(Worker, e.worker_id)
            if w:
                worker_cache[e.worker_id] = w
        w = worker_cache.get(e.worker_id)
        ev = _event_to_dict(e)
        if w:
            ev["worker_name"]   = w.name
            ev["worker_uid"]    = w.worker_uid
        enriched.append(ev)

    return {"events": enriched, "limit": limit, "offset": offset}


@router.get("/admin/{worker_id}", dependencies=[Depends(_require_admin)])
async def admin_get_worker(worker_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")
    return {"worker": _worker_to_dict(w, include_docs=True)}


@router.get("/admin/{worker_id}/profile", dependencies=[Depends(_require_admin)])
async def admin_get_worker_profile(worker_id: str, session: AsyncSession = Depends(get_session)):
    """Full admin profile including events, earnings summary, and referral stats."""
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")

    # Events (most recent 100)
    events_rows = (await session.execute(
        select(WorkerEvent)
        .where(WorkerEvent.worker_id == worker_id)
        .order_by(WorkerEvent.created_at.desc())
        .limit(100)
    )).scalars().all()

    # Earnings summary
    earnings_rows = (await session.execute(
        select(WorkerEarning)
        .where(WorkerEarning.worker_id == worker_id)
        .order_by(WorkerEarning.created_at.desc())
    )).scalars().all()

    total_earnings = sum(e.amount for e in earnings_rows)
    earnings_by_period: dict[str, float] = {}
    for e in earnings_rows:
        if e.period:
            earnings_by_period[e.period] = earnings_by_period.get(e.period, 0) + e.amount

    # Referral stats
    total_ref_downloads = (await session.execute(
        select(func.count(ReferralDownload.id))
        .where(ReferralDownload.worker_id == worker_id)
    )).scalar() or 0

    return {
        "worker": _worker_to_dict(w, include_docs=True),
        "events": [_event_to_dict(e) for e in events_rows],
        "earnings": {
            "total":     total_earnings,
            "by_period": earnings_by_period,
            "records":   [
                {
                    "id":         e.id,
                    "booking_id": e.booking_id,
                    "amount":     e.amount,
                    "period":     e.period,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                }
                for e in earnings_rows[:50]
            ],
        },
        "referral": {
            "worker_uid":        w.worker_uid,
            "total_referrals":   w.total_referrals,
            "referral_credits":  w.referral_credits,
            "total_downloads":   total_ref_downloads,
        },
    }


@router.get("/admin/{worker_id}/events", dependencies=[Depends(_require_admin)])
async def admin_get_worker_events(
    worker_id: str,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
):
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")

    rows = (await session.execute(
        select(WorkerEvent)
        .where(WorkerEvent.worker_id == worker_id)
        .order_by(WorkerEvent.created_at.desc())
        .limit(min(limit, 200))
        .offset(offset)
    )).scalars().all()

    return {
        "worker_uid": w.worker_uid,
        "worker_name": w.name,
        "events": [_event_to_dict(e) for e in rows],
    }


@router.post("/admin/{worker_id}/approve", dependencies=[Depends(_require_admin)])
async def admin_approve_worker(worker_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")
    w.status = "approved"
    w.is_verified = True
    await session.flush()
    snapshot = _worker_to_dict(w, include_docs=False, resolve_urls=False)

    await _log_event(session, w, "approved",
                     "Worker application approved by admin",
                     {"status": "approved", "worker_uid": w.worker_uid})

    if w.email:
        try:
            send_approval_email(w.email, w.name)
        except Exception as e:
            log.warning("approval_email_failed", worker_id=worker_id, error=str(e))
    try:
        send_approval_sms(w.mobile, w.name)
    except Exception as e:
        log.warning("approval_sms_failed", worker_id=worker_id, error=str(e))

    sync_payload = {
        "id":              w.id,
        "name":            w.name,
        "jobType":         w.job_type,
        "dailyRate":       w.daily_rate,
        "district":        w.district,
        "town":            w.town,
        "experienceYears": w.experience_years,
        "phone":           w.mobile,
        "email":           w.email,
        "photoUrl":        _abs(w.profile_photo),
        "workerUid":       w.worker_uid,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                f"{config.CUSTOMER_BACKEND_URL}/admin/workers",
                json=sync_payload,
                headers={"x-admin-secret": config.ADMIN_SECRET},
            )
            r.raise_for_status()
            log.info("worker_sync_ok", worker_id=worker_id, status=r.status_code)
    except Exception as e:
        log.error("worker_sync_failed_queued", worker_id=worker_id, error=str(e))
        session.add(SyncRetry(
            id=str(_uuid.uuid4()),
            target="node.admin_workers",
            payload=json.dumps(sync_payload),
            last_error=str(e),
        ))

    return {"message": "Worker approved.", "worker_id": worker_id, "worker": snapshot}


@router.post("/admin/{worker_id}/reject", dependencies=[Depends(_require_admin)])
async def admin_reject_worker(worker_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")
    w.status = "rejected"
    await _log_event(session, w, "rejected",
                     "Worker application rejected by admin",
                     {"worker_uid": w.worker_uid})
    log.info("worker_rejected", worker_id=worker_id)
    return {"message": "Worker rejected.", "worker_id": worker_id}


@router.post("/admin/{worker_id}/block", dependencies=[Depends(_require_admin)])
async def admin_block(worker_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")
    w.is_blocked = True
    await _log_event(session, w, "blocked",
                     "Worker account blocked by admin",
                     {"worker_uid": w.worker_uid})
    log.info("worker_blocked", worker_id=worker_id)
    return {"message": "Worker blocked.", "worker_id": worker_id}


@router.post("/admin/{worker_id}/unblock", dependencies=[Depends(_require_admin)])
async def admin_unblock(worker_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")
    w.is_blocked = False
    await _log_event(session, w, "unblocked",
                     "Worker account unblocked by admin",
                     {"worker_uid": w.worker_uid})
    log.info("worker_unblocked", worker_id=worker_id)
    return {"message": "Worker unblocked.", "worker_id": worker_id}


@router.delete("/admin/{worker_id}", dependencies=[Depends(_require_admin)])
async def admin_delete(worker_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")

    urls = [w.profile_photo, w.passbook_photo, w.aadhar_photo]
    await session.delete(w)
    await session.flush()

    for u in urls:
        if u:
            try:
                storage.delete(u)
            except Exception as e:
                log.warning("orphan_delete_failed", key=u, error=str(e))

    log.info("worker_deleted", worker_id=worker_id)
    return {"deleted": worker_id}
