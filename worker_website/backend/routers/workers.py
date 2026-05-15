"""
Worker Registration endpoints — registration, public listing, admin actions.

Hardened in phase 2:
  • file uploads validated by magic-byte sniffing (security.py)
  • storage abstracted (local / S3-compatible via storage.py)
  • all secrets via config (no hardcoded defaults in prod)
  • rate limiting on /register
  • structured logging for sync failures (no more silent except: pass)
"""

from __future__ import annotations

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

import config
import storage
from database import get_conn
from email_service import (
    send_approval_email,
    send_approval_sms,
    send_registration_email,
    send_registration_sms,
)
from rate_limit import limiter
from security import validate_upload

log = structlog.get_logger("workers")
router = APIRouter()


def _require_admin(x_admin_secret: Optional[str] = Header(None)):
    if x_admin_secret != config.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden.")


def _get_worker(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized.")
    token = authorization.split(" ", 1)[1]
    conn = get_conn()
    row = conn.execute(
        """
        SELECT w.* FROM workers w
        JOIN worker_sessions s ON s.worker_id = w.id
        WHERE s.token = ?
          AND (s.expires_at IS NULL OR s.expires_at > strftime('%s','now') * 1000)
        """,
        (token,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return dict(row)


def _abs(stored: Optional[str]) -> Optional[str]:
    return storage.resolve_url(stored)


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
):
    if not accepted_terms:
        raise HTTPException(status_code=400, detail="You must accept the Terms & Conditions.")
    if age < 18 or age > 70:
        raise HTTPException(status_code=400, detail="Age must be between 18 and 70.")

    # Mobile: normalise to digits-only and require Indian 6-9 prefix.
    digits = "".join(c for c in mobile if c.isdigit())
    if len(digits) >= 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) != 10 or digits[0] not in "6789":
        raise HTTPException(status_code=400, detail="Invalid Indian mobile number.")
    normalized_mobile = f"+91{digits}"

    email = email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    # Validate every upload BEFORE touching the DB — magic-byte sniff, size cap.
    passbook_bytes, passbook_ext = await validate_upload(
        passbook_photo, max_size_mb=config.MAX_DOC_SIZE_MB, allow_pdf=True, field_name="Passbook"
    )
    aadhar_bytes, aadhar_ext = await validate_upload(
        aadhar_photo, max_size_mb=config.MAX_DOC_SIZE_MB, allow_pdf=True, field_name="Aadhaar"
    )
    photo_bytes, photo_ext = await validate_upload(
        profile_photo, max_size_mb=config.MAX_PHOTO_SIZE_MB, allow_pdf=False, field_name="Photo"
    )

    conn = get_conn()
    if conn.execute("SELECT id FROM workers WHERE mobile = ?", (normalized_mobile,)).fetchone():
        conn.close()
        raise HTTPException(
            status_code=409,
            detail="A worker with this mobile number already exists.",
        )
    if conn.execute("SELECT id FROM workers WHERE email = ?", (email,)).fetchone():
        conn.close()
        raise HTTPException(
            status_code=409,
            detail="A worker with this email address already exists.",
        )

    # Persist files only after validation + uniqueness checks pass.
    import uuid as _uuid
    worker_id = str(_uuid.uuid4())
    passbook_url = storage.save(passbook_bytes, "passbook", passbook_ext)
    aadhar_url   = storage.save(aadhar_bytes,   "aadhar",   aadhar_ext)
    photo_url    = storage.save(photo_bytes,    "photos",   photo_ext)

    conn.execute(
        """
        INSERT INTO workers (id, name, age, gender, mobile, email, address, district, town,
            job_type, current_location, interested_locations, facilities_requested,
            passbook_photo, aadhar_photo, profile_photo,
            accepted_terms, daily_rate, experience_years)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        """,
        (
            worker_id, name.strip(), age, gender, normalized_mobile, email,
            address.strip(), district.strip(), town.strip(), job_type.strip(),
            current_location.strip(), interested_locations.strip(),
            facilities_requested.strip(),
            passbook_url, aadhar_url, photo_url,
            daily_rate, experience_years,
        ),
    )
    conn.commit()
    worker = dict(conn.execute("SELECT * FROM workers WHERE id = ?", (worker_id,)).fetchone())
    conn.close()

    # Strip sensitive doc URLs from response — admin gets them via /admin/* endpoints.
    worker.pop("passbook_photo", None)
    worker.pop("aadhar_photo", None)

    # Best-effort email + SMS; failures get logged, do not break the response.
    try:
        send_registration_email(email, name.strip())
    except Exception as e:
        log.warning("registration_email_failed", email=email, error=str(e))
    try:
        send_registration_sms(normalized_mobile, name.strip())
    except Exception as e:
        log.warning("registration_sms_failed", mobile=normalized_mobile, error=str(e))

    log.info("worker_registered", worker_id=worker_id, mobile=normalized_mobile)
    return {
        "message": "Registration submitted. Our team will verify your profile within 24 hours.",
        "worker": worker,
    }


# ── Authenticated worker self-service ───────────────────────────────────────
@router.get("/me")
def get_me(worker: dict = Depends(_get_worker)):
    safe = {k: v for k, v in worker.items() if k not in ("passbook_photo", "aadhar_photo")}
    if safe.get("profile_photo"):
        safe["profile_photo"] = _abs(safe["profile_photo"])
    return {"worker": safe}


# ── Public listing (for the customer-facing app) ────────────────────────────
@router.get("/public")
def list_public_workers(
    district: Optional[str] = None,
    town: Optional[str] = None,
    job_type: Optional[str] = None,
):
    conn = get_conn()
    sql = """
        SELECT id, name, job_type, daily_rate, district, town, rating, total_reviews,
               experience_years, profile_photo, is_verified
        FROM workers WHERE is_blocked = 0 AND is_verified = 1 AND status = 'approved'
    """
    params: list[str] = []
    if district:
        sql += " AND LOWER(district) = LOWER(?)"
        params.append(district)
    if town:
        sql += " AND LOWER(town) = LOWER(?)"
        params.append(town)
    if job_type:
        sql += " AND LOWER(job_type) = LOWER(?)"
        params.append(job_type)
    sql += " ORDER BY rating DESC, total_reviews DESC"

    rows = conn.execute(sql, params).fetchall()
    conn.close()
    workers_out = []
    for r in rows:
        w = dict(r)
        w["profile_photo"] = _abs(w.get("profile_photo"))
        workers_out.append(w)
    return {"workers": workers_out}


@router.get("/{worker_id}")
def get_worker(worker_id: str):
    conn = get_conn()
    row = conn.execute(
        """
        SELECT id, name, job_type, daily_rate, district, town, rating, total_reviews,
               experience_years, profile_photo, is_verified, gender, current_location
        FROM workers WHERE id = ? AND is_blocked = 0
        """,
        (worker_id,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Worker not found.")
    w = dict(row)
    w["profile_photo"] = _abs(w.get("profile_photo"))
    return {"worker": w}


# ── Admin endpoints (require x-admin-secret header) ─────────────────────────
@router.get("/admin/all", dependencies=[Depends(_require_admin)])
def admin_list_all_workers():
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT id, name, age, gender, mobile, email, address, district, town, job_type,
               current_location, interested_locations, facilities_requested,
               daily_rate, experience_years, profile_photo, passbook_photo, aadhar_photo,
               status, is_blocked, is_verified, created_at
        FROM workers ORDER BY created_at DESC
        """
    ).fetchall()
    conn.close()
    out = []
    for r in rows:
        w = dict(r)
        w["profile_photo"]  = _abs(w.get("profile_photo"))
        w["passbook_photo"] = _abs(w.get("passbook_photo"))
        w["aadhar_photo"]   = _abs(w.get("aadhar_photo"))
        out.append(w)
    return {"workers": out}


@router.get("/admin/{worker_id}", dependencies=[Depends(_require_admin)])
def admin_get_worker(worker_id: str):
    conn = get_conn()
    row = conn.execute("SELECT * FROM workers WHERE id = ?", (worker_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Worker not found.")
    w = dict(row)
    w["profile_photo"]  = _abs(w.get("profile_photo"))
    w["passbook_photo"] = _abs(w.get("passbook_photo"))
    w["aadhar_photo"]   = _abs(w.get("aadhar_photo"))
    return {"worker": w}


@router.post("/admin/{worker_id}/approve", dependencies=[Depends(_require_admin)])
async def admin_approve_worker(worker_id: str):
    conn = get_conn()
    row = conn.execute("SELECT * FROM workers WHERE id = ?", (worker_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Worker not found.")
    conn.execute(
        "UPDATE workers SET status='approved', is_verified=1 WHERE id=?", (worker_id,)
    )
    conn.commit()
    w = dict(conn.execute("SELECT * FROM workers WHERE id=?", (worker_id,)).fetchone())
    conn.close()

    # Notifications
    if w.get("email"):
        try:
            send_approval_email(w["email"], w["name"])
        except Exception as e:
            log.warning("approval_email_failed", worker_id=worker_id, error=str(e))
    try:
        send_approval_sms(w["mobile"], w["name"])
    except Exception as e:
        log.warning("approval_sms_failed", worker_id=worker_id, error=str(e))

    # Sync to Node.js main backend. Failures are logged, not silently swallowed.
    sync_payload = {
        "id":              w["id"],
        "name":            w["name"],
        "jobType":         w["job_type"],
        "dailyRate":       w["daily_rate"],
        "district":        w["district"],
        "town":            w["town"],
        "experienceYears": w["experience_years"],
        "phone":           w["mobile"],
        "email":           w.get("email"),
        "photoUrl":        _abs(w.get("profile_photo")),
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
        log.error("worker_sync_failed", worker_id=worker_id, error=str(e))
        # NOTE: approval already committed. A background retry worker would
        # pick this up from a dead-letter table — TODO for phase 3.

    return {"message": "Worker approved.", "worker_id": worker_id}


@router.post("/admin/{worker_id}/reject", dependencies=[Depends(_require_admin)])
def admin_reject_worker(worker_id: str):
    conn = get_conn()
    if not conn.execute("SELECT id FROM workers WHERE id=?", (worker_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Worker not found.")
    conn.execute("UPDATE workers SET status='rejected' WHERE id=?", (worker_id,))
    conn.commit()
    conn.close()
    log.info("worker_rejected", worker_id=worker_id)
    return {"message": "Worker rejected.", "worker_id": worker_id}


@router.post("/admin/{worker_id}/block", dependencies=[Depends(_require_admin)])
def admin_block_portal_worker(worker_id: str):
    conn = get_conn()
    if not conn.execute("SELECT id FROM workers WHERE id=?", (worker_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Worker not found.")
    conn.execute("UPDATE workers SET is_blocked=1 WHERE id=?", (worker_id,))
    conn.commit()
    conn.close()
    log.info("worker_blocked", worker_id=worker_id)
    return {"message": "Worker blocked.", "worker_id": worker_id}


@router.post("/admin/{worker_id}/unblock", dependencies=[Depends(_require_admin)])
def admin_unblock_portal_worker(worker_id: str):
    conn = get_conn()
    if not conn.execute("SELECT id FROM workers WHERE id=?", (worker_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Worker not found.")
    conn.execute("UPDATE workers SET is_blocked=0 WHERE id=?", (worker_id,))
    conn.commit()
    conn.close()
    log.info("worker_unblocked", worker_id=worker_id)
    return {"message": "Worker unblocked.", "worker_id": worker_id}


@router.delete("/admin/{worker_id}", dependencies=[Depends(_require_admin)])
def admin_delete_portal_worker(worker_id: str):
    conn = get_conn()
    row = conn.execute("SELECT * FROM workers WHERE id=?", (worker_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Worker not found.")
    w = dict(row)

    conn.execute("DELETE FROM worker_sessions WHERE worker_id=?", (worker_id,))
    conn.execute("DELETE FROM workers WHERE id=?", (worker_id,))
    conn.commit()
    conn.close()

    # Best-effort orphan cleanup from storage.
    for k in ("profile_photo", "passbook_photo", "aadhar_photo"):
        if w.get(k):
            try:
                storage.delete(w[k])
            except Exception as e:
                log.warning("orphan_delete_failed", key=w[k], error=str(e))

    log.info("worker_deleted", worker_id=worker_id)
    return {"deleted": worker_id}
