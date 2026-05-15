"""
Worker Registration endpoints — registration, public listing, admin actions.

Phase 3: switched from raw sqlite3 to async SQLAlchemy.
"""

from __future__ import annotations

import json
import uuid as _uuid
from typing import Optional

import httpx
import structlog
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Request,
    UploadFile,
)
from sqlalchemy import select
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
from models import SyncRetry, Worker, WorkerSession
from rate_limit import limiter
from security import validate_upload

log = structlog.get_logger("workers")
router = APIRouter()


def _require_admin(x_admin_secret: Optional[str] = Header(None)):
    if x_admin_secret != config.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden.")


async def _get_worker(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
) -> Worker:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized.")
    token = authorization.split(" ", 1)[1]

    import time
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


def _abs(stored: Optional[str]) -> Optional[str]:
    return storage.resolve_url(stored)


def _worker_to_dict(w: Worker, include_docs: bool = False, resolve_urls: bool = True) -> dict:
    d = {
        "id": w.id, "name": w.name, "age": w.age, "gender": w.gender,
        "mobile": w.mobile, "email": w.email, "address": w.address,
        "district": w.district, "town": w.town, "job_type": w.job_type,
        "current_location": w.current_location,
        "interested_locations": w.interested_locations,
        "facilities_requested": w.facilities_requested,
        "accepted_terms": w.accepted_terms,
        "status": w.status, "is_blocked": w.is_blocked, "is_verified": w.is_verified,
        "daily_rate": w.daily_rate, "rating": w.rating,
        "total_reviews": w.total_reviews, "experience_years": w.experience_years,
        "created_at": w.created_at.isoformat() if w.created_at else None,
        "profile_photo": _abs(w.profile_photo) if resolve_urls else w.profile_photo,
    }
    if include_docs:
        d["passbook_photo"] = _abs(w.passbook_photo) if resolve_urls else w.passbook_photo
        d["aadhar_photo"]   = _abs(w.aadhar_photo)   if resolve_urls else w.aadhar_photo
    return d


# ── Registration ─────────────────────────────────────────────────────────────
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

    # Mobile: normalise to digits and require Indian 6-9 prefix.
    digits = "".join(c for c in mobile if c.isdigit())
    if len(digits) >= 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) != 10 or digits[0] not in "6789":
        raise HTTPException(status_code=400, detail="Invalid Indian mobile number.")
    normalized_mobile = f"+91{digits}"

    email = email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    # Validate uploads BEFORE any DB or storage writes.
    passbook_bytes, passbook_ext = await validate_upload(
        passbook_photo, max_size_mb=config.MAX_DOC_SIZE_MB, allow_pdf=True, field_name="Passbook"
    )
    aadhar_bytes, aadhar_ext = await validate_upload(
        aadhar_photo, max_size_mb=config.MAX_DOC_SIZE_MB, allow_pdf=True, field_name="Aadhaar"
    )
    photo_bytes, photo_ext = await validate_upload(
        profile_photo, max_size_mb=config.MAX_PHOTO_SIZE_MB, allow_pdf=False, field_name="Photo"
    )

    # Uniqueness checks
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

    worker = Worker(
        name=name.strip(), age=age, gender=gender,
        mobile=normalized_mobile, email=email,
        address=address.strip(), district=district.strip(), town=town.strip(),
        job_type=job_type.strip(), current_location=current_location.strip(),
        interested_locations=interested_locations.strip(),
        facilities_requested=facilities_requested.strip(),
        passbook_photo=passbook_url, aadhar_photo=aadhar_url, profile_photo=photo_url,
        accepted_terms=True, daily_rate=daily_rate, experience_years=experience_years,
    )
    session.add(worker)
    await session.flush()
    # commit happens in get_session dependency.

    try:
        send_registration_email(email, name.strip())
    except Exception as e:
        log.warning("registration_email_failed", email=email, error=str(e))
    try:
        send_registration_sms(normalized_mobile, name.strip())
    except Exception as e:
        log.warning("registration_sms_failed", mobile=normalized_mobile, error=str(e))

    log.info("worker_registered", worker_id=worker.id, mobile=normalized_mobile)
    return {
        "message": "Registration submitted. Our team will verify your profile within 24 hours.",
        "worker": _worker_to_dict(worker, include_docs=False),
    }


# ── Authenticated worker self-service ───────────────────────────────────────
@router.get("/me")
async def get_me(worker: Worker = Depends(_get_worker)):
    return {"worker": _worker_to_dict(worker, include_docs=False)}


# ── Public listing ───────────────────────────────────────────────────────────
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


# ── Admin endpoints (x-admin-secret) ────────────────────────────────────────
@router.get("/admin/all", dependencies=[Depends(_require_admin)])
async def admin_list_all_workers(session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(Worker).order_by(Worker.created_at.desc())
    )).scalars().all()
    return {"workers": [_worker_to_dict(w, include_docs=True) for w in rows]}


@router.get("/admin/{worker_id}", dependencies=[Depends(_require_admin)])
async def admin_get_worker(worker_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")
    return {"worker": _worker_to_dict(w, include_docs=True)}


@router.post("/admin/{worker_id}/approve", dependencies=[Depends(_require_admin)])
async def admin_approve_worker(worker_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")
    w.status = "approved"
    w.is_verified = True
    await session.flush()
    snapshot = _worker_to_dict(w, include_docs=False, resolve_urls=False)

    if w.email:
        try:
            send_approval_email(w.email, w.name)
        except Exception as e:
            log.warning("approval_email_failed", worker_id=worker_id, error=str(e))
    try:
        send_approval_sms(w.mobile, w.name)
    except Exception as e:
        log.warning("approval_sms_failed", worker_id=worker_id, error=str(e))

    # Sync to Node.js main backend with retry queue on failure.
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
    log.info("worker_rejected", worker_id=worker_id)
    return {"message": "Worker rejected.", "worker_id": worker_id}


@router.post("/admin/{worker_id}/block", dependencies=[Depends(_require_admin)])
async def admin_block(worker_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")
    w.is_blocked = True
    log.info("worker_blocked", worker_id=worker_id)
    return {"message": "Worker blocked.", "worker_id": worker_id}


@router.post("/admin/{worker_id}/unblock", dependencies=[Depends(_require_admin)])
async def admin_unblock(worker_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")
    w.is_blocked = False
    log.info("worker_unblocked", worker_id=worker_id)
    return {"message": "Worker unblocked.", "worker_id": worker_id}


@router.delete("/admin/{worker_id}", dependencies=[Depends(_require_admin)])
async def admin_delete(worker_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Worker, worker_id)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found.")

    # Snapshot file URLs for cleanup after the row goes away.
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
