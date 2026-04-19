import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_conn

router = APIRouter()


class OtpRequest(BaseModel):
    mobile: str


class OtpVerify(BaseModel):
    mobile: str
    otp: str  # In production: integrate Firebase or SMS OTP here


@router.post("/request-otp")
def request_otp(body: OtpRequest):
    # Placeholder — integrate real SMS OTP (Firebase / Fast2SMS) in production
    conn = get_conn()
    worker = conn.execute("SELECT id, status FROM workers WHERE mobile = ?", (body.mobile,)).fetchone()
    conn.close()
    if not worker:
        raise HTTPException(status_code=404, detail="No worker registered with this mobile.")
    return {"message": "OTP sent to your mobile. (Dev mode: use 123456)"}


@router.post("/verify-otp")
def verify_otp(body: OtpVerify):
    # Dev-mode OTP check — replace with real verification in production
    if body.otp != "123456":
        raise HTTPException(status_code=401, detail="Invalid OTP.")
    conn = get_conn()
    worker = conn.execute("SELECT * FROM workers WHERE mobile = ?", (body.mobile,)).fetchone()
    if not worker:
        conn.close()
        raise HTTPException(status_code=404, detail="Worker not found.")
    if worker["is_blocked"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Your account has been blocked. Contact support.")

    token = str(uuid.uuid4())
    conn.execute("INSERT INTO worker_sessions (token, worker_id) VALUES (?, ?)", (token, worker["id"]))
    conn.commit()
    conn.close()

    safe = {k: v for k, v in dict(worker).items() if k not in ("passbook_photo", "aadhar_photo")}
    return {"token": token, "worker": safe}
