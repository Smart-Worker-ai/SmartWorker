import uuid
import random
import time
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_conn
from email_service import send_otp_email, _send_otp_sms as send_otp_sms

router = APIRouter()

DEV_MODE = os.getenv("ENV", "development") != "production"
OTP_TTL_SECONDS = 600  # 10 minutes


class OtpRequest(BaseModel):
    mobile: str


class OtpVerify(BaseModel):
    mobile: str
    otp: str


@router.post("/request-otp")
def request_otp(body: OtpRequest):
    conn = get_conn()
    worker = conn.execute(
        "SELECT id, email, status, is_blocked FROM workers WHERE mobile = ?",
        (body.mobile.strip(),)
    ).fetchone()

    if not worker:
        conn.close()
        raise HTTPException(status_code=404, detail="No worker registered with this mobile number.")

    if worker["is_blocked"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Your account has been blocked. Contact support.")

    email = worker["email"]
    if not email:
        conn.close()
        raise HTTPException(
            status_code=422,
            detail="No email address on file. Please contact support to update your account."
        )

    # Clear old OTPs and generate a new one
    conn.execute("DELETE FROM worker_otps WHERE mobile = ?", (body.mobile.strip(),))
    otp = str(random.randint(100000, 999999))
    expires_at = int(time.time() * 1000) + OTP_TTL_SECONDS * 1000
    conn.execute(
        "INSERT INTO worker_otps (id, mobile, otp, expires_at) VALUES (?, ?, ?, ?)",
        (str(uuid.uuid4()), body.mobile.strip(), otp, expires_at)
    )
    conn.commit()
    conn.close()

    # Send OTP via email AND SMS
    send_otp_email(email, otp)
    try:
        send_otp_sms(body.mobile.strip(), otp)
    except Exception:
        pass

    result = {"message": "OTP sent to your registered email and mobile number."}
    if DEV_MODE:
        result["devOtp"] = otp
        result["devEmail"] = email
    return result


@router.post("/verify-otp")
def verify_otp(body: OtpVerify):
    conn = get_conn()

    record = conn.execute(
        "SELECT * FROM worker_otps WHERE mobile = ?", (body.mobile.strip(),)
    ).fetchone()

    if not record:
        conn.close()
        raise HTTPException(status_code=404, detail="No OTP found. Please request a new one.")

    if int(time.time() * 1000) > record["expires_at"]:
        conn.execute("DELETE FROM worker_otps WHERE mobile = ?", (body.mobile.strip(),))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=410, detail="OTP has expired. Please request a new one.")

    if record["otp"] != body.otp.strip():
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid OTP. Please try again.")

    # Consume the OTP
    conn.execute("DELETE FROM worker_otps WHERE mobile = ?", (body.mobile.strip(),))

    worker = conn.execute(
        "SELECT * FROM workers WHERE mobile = ?", (body.mobile.strip(),)
    ).fetchone()

    if not worker:
        conn.commit()
        conn.close()
        raise HTTPException(status_code=404, detail="Worker not found.")

    if worker["is_blocked"]:
        conn.commit()
        conn.close()
        raise HTTPException(status_code=403, detail="Your account has been blocked. Contact support.")

    token = str(uuid.uuid4())
    conn.execute("INSERT INTO worker_sessions (token, worker_id) VALUES (?, ?)", (token, worker["id"]))
    conn.commit()
    conn.close()

    safe = {k: v for k, v in dict(worker).items() if k not in ("passbook_photo", "aadhar_photo")}
    return {"token": token, "worker": safe}
