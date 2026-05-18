import os
import smtplib
import logging
import re
import urllib.request
import urllib.parse
import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "Smart Workers <noreply@smartworkers.in>")
FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")
CUSTOM_SMS_GATEWAY_URL = os.getenv("CUSTOM_SMS_GATEWAY_URL", "")
CUSTOM_SMS_GATEWAY_SECRET = os.getenv("CUSTOM_SMS_GATEWAY_SECRET", "")

logger = logging.getLogger(__name__)


# ── Email ─────────────────────────────────────────────────────────────────────

def _send_email(to: str, subject: str, html: str) -> bool:
    if not SMTP_HOST or not SMTP_USER:
        logger.info(f"[email] SMTP not configured — skipping mail to {to}: {subject}")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, [to], msg.as_string())
        return True
    except Exception as e:
        logger.error(f"[email] Send failed to {to}: {e}")
        return False


# ── SMS via Fast2SMS ──────────────────────────────────────────────────────────

def _normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    return digits[-10:] if len(digits) >= 10 else ""


def _send_via_custom_gateway(phone: str, message: str) -> bool:
    """Self-hosted Android SMS Gateway — install 'SMS Gateway for Android' on any spare phone."""
    if not CUSTOM_SMS_GATEWAY_URL:
        return False
    digits = _normalize_phone(phone)
    if len(digits) != 10:
        return False
    try:
        headers = {"Content-Type": "application/json"}
        if CUSTOM_SMS_GATEWAY_SECRET:
            headers["Authorization"] = f"Bearer {CUSTOM_SMS_GATEWAY_SECRET}"
        payload = json.dumps({"phone_number": f"+91{digits}", "message": message}).encode("utf-8")
        req = urllib.request.Request(CUSTOM_SMS_GATEWAY_URL, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.status < 300
    except Exception as e:
        logger.error(f"[sms] Custom gateway failed to {phone}: {e}")
        return False


def _send_sms(phone: str, message: str) -> bool:
    """Send a general (non-OTP) SMS. Tries self-hosted gateway first
    (free), falls back to Fast2SMS only if gateway is unconfigured or fails.
    """
    digits = _normalize_phone(phone)
    if len(digits) != 10:
        return False

    # 1. Custom self-hosted Android SMS Gateway — free, no third party.
    if _send_via_custom_gateway(phone, message):
        return True

    # 2. Fast2SMS fallback (paid). Skip if not configured.
    if not FAST2SMS_API_KEY:
        logger.info(f"[sms] No gateway available — dropping SMS to {phone}")
        return False
    try:
        payload = json.dumps({
            "route": "q",
            "message": message,
            "language": "english",
            "flash": 0,
            "numbers": digits,
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://www.fast2sms.com/dev/bulkV2",
            data=payload,
            headers={"Authorization": FAST2SMS_API_KEY, "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())
        if not data.get("return"):
            logger.warning(f"[sms] Fast2SMS error: {data.get('message')}")
        return bool(data.get("return"))
    except Exception as e:
        logger.error(f"[sms] Send failed to {phone}: {e}")
        return False


def _send_otp_sms(phone: str, otp: str) -> bool:
    """OTP-specific message format. Routes through the same dispatcher as
    `_send_sms` so the custom gateway is the default everywhere."""
    msg = f"Your Smart Workers OTP is {otp}. Valid for 10 minutes. Do not share with anyone."
    return _send_sms(phone, msg)


# ── Table helper ──────────────────────────────────────────────────────────────

def _row(label: str, value: str, alt: bool = False) -> str:
    bg = "background:#f9fafb;" if alt else ""
    return (f'<tr style="{bg}"><td style="padding:8px 14px;color:#6b7280;font-size:13px">{label}</td>'
            f'<td style="padding:8px 14px;font-weight:600;color:#111827">{value}</td></tr>')


def _table(rows: list) -> str:
    inner = "".join(_row(l, v, i % 2 == 1) for i, (l, v) in enumerate(rows))
    return (f'<table style="width:100%;border-collapse:collapse;border-radius:10px;'
            f'overflow:hidden;border:1px solid #e5e7eb">{inner}</table>')


# ── OTP ───────────────────────────────────────────────────────────────────────

def send_otp(email: str, mobile: str, otp: str) -> bool:
    """Send OTP via both email and SMS."""
    email_sent = False
    sms_sent = False
    if email:
        html = f"""<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#4338ca;margin:0 0 12px">Smart Workers</h2>
          <p style="color:#374151;margin:0 0 8px">Your one-time password for login:</p>
          <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#1e1b4b;background:#eef2ff;
                      border-radius:16px;text-align:center;padding:28px 0;margin:20px 0">{otp}</div>
          <p style="color:#9ca3af;font-size:13px;margin:0">Valid for <b>10 minutes</b>. Never share this with anyone.</p>
        </div>"""
        email_sent = _send_email(email, "Smart Workers — Your OTP", html)
    if mobile:
        sms_sent = _send_otp_sms(mobile, otp)
    return email_sent or sms_sent


# Backwards-compat alias used by auth.py
def send_otp_email(email: str, otp: str) -> bool:
    return _send_email(email, "Smart Workers — Your OTP",
        f"""<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#4338ca;margin:0 0 12px">Smart Workers</h2>
          <p style="color:#374151;margin:0 0 8px">Your one-time password:</p>
          <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#1e1b4b;background:#eef2ff;
                      border-radius:16px;text-align:center;padding:28px 0;margin:20px 0">{otp}</div>
          <p style="color:#9ca3af;font-size:13px;margin:0">Valid for <b>10 minutes</b>. Never share this with anyone.</p>
        </div>""")


# ── Worker Registration ────────────────────────────────────────────────────────

def send_registration_email(email: str, name: str) -> bool:
    html = f"""<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#4338ca;margin:0 0 8px">Smart Workers</h2>
      <h3 style="color:#065f46;margin:0 0 16px">✅ Registration Submitted!</h3>
      <p style="color:#374151">Hello <b>{name}</b>, your registration has been received.</p>
      <p style="color:#374151">Our team will review your documents and verify your profile within
         <b>24–48 hours</b>.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0">
        <p style="color:#166534;font-size:13px;margin:0">
          Once verified, customers in your area can find and book your services.
        </p>
      </div>
      <p style="color:#9ca3af;font-size:13px">Thank you for joining Smart Workers!</p>
    </div>"""
    return _send_email(email, "Registration Received — Smart Workers", html)


def send_registration_sms(mobile: str, name: str) -> bool:
    return _send_sms(mobile,
        f"Smart Workers: Hi {name}! Your registration is received. Our team will verify your profile within 24-48 hrs. Thank you!")


# ── Worker Approval ───────────────────────────────────────────────────────────

def send_approval_email(email: str, name: str) -> bool:
    html = f"""<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#4338ca;margin:0 0 8px">Smart Workers</h2>
      <h3 style="color:#1d4ed8;margin:0 0 16px">🎉 Profile Approved!</h3>
      <p style="color:#374151">Hello <b>{name}</b>, congratulations!</p>
      <p style="color:#374151">Your profile has been <b>verified and approved</b>. You are now visible
         to customers searching for workers in your area.</p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin:20px 0">
        <p style="color:#1e40af;font-size:13px;margin:0">
          Log in to the Smart Workers app to manage your bookings and profile.
        </p>
      </div>
      <p style="color:#9ca3af;font-size:13px">Welcome to the Smart Workers family!</p>
    </div>"""
    return _send_email(email, "Profile Approved — Smart Workers", html)


def send_approval_sms(mobile: str, name: str) -> bool:
    return _send_sms(mobile,
        f"Smart Workers: Congratulations {name}! Your profile is approved. Customers can now find and book you. Welcome!")


# ── Booking Notification to Worker ────────────────────────────────────────────

def send_worker_booking_alert(email: str, mobile: str, worker_name: str, customer_name: str,
                               job_type: str, date: str, days: int,
                               amount: float, address: str) -> None:
    rows = [
        ("Customer", customer_name),
        ("Service", job_type),
        ("Date", date),
        ("Duration", f"{days} day(s)"),
        ("Amount", f"₹{amount}"),
        ("Address", address or "—"),
    ]
    if email:
        html = f"""<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">
          <h2 style="color:#4338ca;margin:0 0 8px">Smart Workers</h2>
          <h3 style="color:#1d4ed8;margin:0 0 16px">📋 New Service Booking!</h3>
          <p style="color:#374151;margin:0 0 16px">Hello <b>{worker_name}</b>, you have a new booking:</p>
          {_table(rows)}
          <p style="color:#9ca3af;font-size:13px;margin-top:20px">
            Please ensure you are available on the booked date.
          </p>
        </div>"""
        _send_email(email, f"New Booking from {customer_name} — Smart Workers", html)
    if mobile:
        _send_sms(mobile,
            f"Smart Workers: New booking! {customer_name} booked you for {job_type} on {date}. Address: {address or 'to be shared'}. Amount: Rs.{amount}")
