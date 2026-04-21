import uuid, shutil, os, httpx
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends, Header
from database import get_conn
from email_service import (
    send_registration_email, send_registration_sms,
    send_approval_email, send_approval_sms,
)

ADMIN_SECRET        = os.getenv("ADMIN_SECRET", "***REMOVED-SECRET***")
CUSTOMER_BACKEND    = os.getenv("CUSTOMER_BACKEND_URL", "https://smart-workers-backend-production.up.railway.app/api/v1")
SELF_BASE_URL       = os.getenv("SELF_BASE_URL", "https://worker-portal-backend-production.up.railway.app")

def _abs(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    return f"{SELF_BASE_URL}{path}" if path.startswith("/") else path

def _require_admin(x_admin_secret: Optional[str] = Header(None)):
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden.")

router = APIRouter()
UPLOADS = Path("uploads")
UPLOADS.mkdir(exist_ok=True)


def _save_file(file: UploadFile, folder: str) -> str:
    dest_dir = UPLOADS / folder
    dest_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "file").suffix or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    dest = dest_dir / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/uploads/{folder}/{filename}"


def _get_worker(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized.")
    token = authorization.split(" ", 1)[1]
    conn = get_conn()
    row = conn.execute(
        "SELECT w.* FROM workers w JOIN worker_sessions s ON s.worker_id = w.id WHERE s.token = ?",
        (token,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return dict(row)


@router.post("/register")
async def register_worker(
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
    if not mobile.replace("+", "").isdigit() or len(mobile.replace("+", "")) < 10:
        raise HTTPException(status_code=400, detail="Invalid mobile number.")
    email = email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    conn = get_conn()
    if conn.execute("SELECT id FROM workers WHERE mobile = ?", (mobile,)).fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail="A worker with this mobile number already exists.")
    if conn.execute("SELECT id FROM workers WHERE email = ?", (email,)).fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail="A worker with this email address already exists.")

    worker_id = str(uuid.uuid4())
    passbook_url = _save_file(passbook_photo, "passbook")
    aadhar_url = _save_file(aadhar_photo, "aadhar")
    photo_url = _save_file(profile_photo, "photos")

    conn.execute("""
        INSERT INTO workers (id, name, age, gender, mobile, email, address, district, town,
            job_type, current_location, interested_locations, facilities_requested,
            passbook_photo, aadhar_photo, profile_photo,
            accepted_terms, daily_rate, experience_years)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    """, (
        worker_id, name.strip(), age, gender, mobile.strip(), email,
        address.strip(), district.strip(), town.strip(), job_type.strip(),
        current_location.strip(), interested_locations.strip(),
        facilities_requested.strip(),
        passbook_url, aadhar_url, photo_url,
        daily_rate, experience_years
    ))
    conn.commit()

    worker = dict(conn.execute("SELECT * FROM workers WHERE id = ?", (worker_id,)).fetchone())
    conn.close()

    worker.pop("passbook_photo", None)
    worker.pop("aadhar_photo", None)

    # Send registration confirmation via email + SMS
    try:
        send_registration_email(email, name.strip())
    except Exception:
        pass
    try:
        send_registration_sms(mobile.strip(), name.strip())
    except Exception:
        pass

    return {"message": "Registration submitted. Our team will verify your profile within 24 hours.", "worker": worker}


@router.get("/me")
def get_me(worker: dict = Depends(_get_worker)):
    safe = {k: v for k, v in worker.items() if k not in ("passbook_photo", "aadhar_photo")}
    return {"worker": safe}


@router.get("/public")
def list_public_workers(district: Optional[str] = None, town: Optional[str] = None, job_type: Optional[str] = None):
    conn = get_conn()
    sql = """
        SELECT id, name, job_type, daily_rate, district, town, rating, total_reviews,
               experience_years, profile_photo, is_verified
        FROM workers WHERE is_blocked = 0 AND is_verified = 1 AND status = 'approved'
    """
    params = []
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
    return {"workers": [dict(r) for r in rows]}


@router.get("/{worker_id}")
def get_worker(worker_id: str):
    conn = get_conn()
    row = conn.execute("""
        SELECT id, name, job_type, daily_rate, district, town, rating, total_reviews,
               experience_years, profile_photo, is_verified, gender, current_location
        FROM workers WHERE id = ? AND is_blocked = 0
    """, (worker_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Worker not found.")
    return {"worker": dict(row)}


# ── Admin endpoints ────────────────────────────────────────────────────────────

@router.get("/admin/all", dependencies=[Depends(_require_admin)])
def admin_list_all_workers():
    conn = get_conn()
    rows = conn.execute("""
        SELECT id, name, age, gender, mobile, address, district, town, job_type,
               current_location, interested_locations, facilities_requested,
               daily_rate, experience_years, profile_photo, passbook_photo, aadhar_photo,
               status, is_blocked, is_verified, created_at
        FROM workers ORDER BY created_at DESC
    """).fetchall()
    conn.close()
    result = []
    for r in rows:
        w = dict(r)
        w["profile_photo"]  = _abs(w.get("profile_photo"))
        w["passbook_photo"] = _abs(w.get("passbook_photo"))
        w["aadhar_photo"]   = _abs(w.get("aadhar_photo"))
        result.append(w)
    return {"workers": result}


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
    conn.execute("UPDATE workers SET status='approved', is_verified=1 WHERE id=?", (worker_id,))
    conn.commit()
    w = dict(conn.execute("SELECT * FROM workers WHERE id=?", (worker_id,)).fetchone())
    conn.close()

    # Send approval notifications via email + SMS
    if w.get("email"):
        try:
            send_approval_email(w["email"], w["name"])
        except Exception:
            pass
    try:
        send_approval_sms(w["mobile"], w["name"])
    except Exception:
        pass

    # Sync approved worker to the Node.js customer backend
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            await c.post(
                f"{CUSTOMER_BACKEND}/admin/workers",
                json={
                    "id": w["id"], "name": w["name"], "jobType": w["job_type"],
                    "dailyRate": w["daily_rate"], "district": w["district"],
                    "town": w["town"], "experienceYears": w["experience_years"],
                    "phone": w["mobile"],
                    "email": w.get("email"),
                    "photoUrl": w.get("profile_photo"),
                },
                headers={"x-admin-secret": ADMIN_SECRET},
            )
    except Exception:
        pass  # Don't fail the approval if sync fails

    return {"message": "Worker approved and synced.", "worker_id": worker_id}


@router.post("/admin/{worker_id}/reject", dependencies=[Depends(_require_admin)])
def admin_reject_worker(worker_id: str):
    conn = get_conn()
    if not conn.execute("SELECT id FROM workers WHERE id=?", (worker_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Worker not found.")
    conn.execute("UPDATE workers SET status='rejected' WHERE id=?", (worker_id,))
    conn.commit()
    conn.close()
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
    return {"message": "Worker unblocked.", "worker_id": worker_id}


@router.delete("/admin/{worker_id}", dependencies=[Depends(_require_admin)])
def admin_delete_portal_worker(worker_id: str):
    conn = get_conn()
    if not conn.execute("SELECT id FROM workers WHERE id=?", (worker_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Worker not found.")
    conn.execute("DELETE FROM worker_sessions WHERE worker_id=?", (worker_id,))
    conn.execute("DELETE FROM workers WHERE id=?", (worker_id,))
    conn.commit()
    conn.close()
    return {"deleted": worker_id}
