"""
Email + SMS dispatch helpers.

Email: direct SMTP (Gmail, Resend, Brevo — anything with SMTP).
SMS:   delegated to the self-hosted sms-gateway service. No SMS code lives
       here anymore — we just hand a (phone, body, idempotency_key) tuple
       to `sms_gateway_client.send_message` and the gateway picks a
       provider, retries, logs, and reports status.
"""

import logging
import os
import re
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import sms_gateway_client

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "Crewzo <noreply@crewzo.in>")

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


# ── SMS via sms-gateway ──────────────────────────────────────────────────────

def _normalize_phone(phone: str) -> str:
    """Return phone as +91XXXXXXXXXX (Indian numbers only) or empty string."""
    digits = re.sub(r"\D", "", phone)
    if len(digits) >= 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) != 10:
        return ""
    return f"+91{digits}"


def _send_sms(phone: str, message: str, priority: str = "transactional") -> bool:
    """Dispatch through the self-hosted sms-gateway. Idempotency key is a
    fresh UUID per call so retries from worker_website don't dedupe
    different messages on the gateway side."""
    e164 = _normalize_phone(phone)
    if not e164:
        logger.info(f"[sms] Bad phone format, skipping: {phone}")
        return False
    result = sms_gateway_client.send_message(
        phone=e164,
        body=message,
        idempotency_key=f"ws-{uuid.uuid4()}",
        priority=priority,
    )
    return result is not None


# ── Table helper ──────────────────────────────────────────────────────────────

def _row(label: str, value: str, alt: bool = False) -> str:
    bg = "background:#f9fafb;" if alt else ""
    return (f'<tr style="{bg}"><td style="padding:8px 14px;color:#6b7280;font-size:13px">{label}</td>'
            f'<td style="padding:8px 14px;font-weight:600;color:#111827">{value}</td></tr>')


def _table(rows: list) -> str:
    inner = "".join(_row(l, v, i % 2 == 1) for i, (l, v) in enumerate(rows))
    return (f'<table style="width:100%;border-collapse:collapse;border-radius:10px;'
            f'overflow:hidden;border:1px solid #e5e7eb">{inner}</table>')


# ── OTP delivery ────────────────────────────────────────────────────────────
# `send_otp` and `send_otp_email` removed — OTP lifecycle lives in the
# sms-gateway service. See routers/auth.py + sms_gateway_client.py.


# ── Worker Registration ────────────────────────────────────────────────────────

def send_registration_email(email: str, name: str) -> bool:
    html = f"""<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#4338ca;margin:0 0 8px">Crewzo</h2>
      <h3 style="color:#065f46;margin:0 0 16px">✅ Registration Submitted!</h3>
      <p style="color:#374151">Hello <b>{name}</b>, your registration has been received.</p>
      <p style="color:#374151">Our team will review your documents and verify your profile within
         <b>24–48 hours</b>.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0">
        <p style="color:#166534;font-size:13px;margin:0">
          Once verified, customers in your area can find and book your services.
        </p>
      </div>
      <p style="color:#9ca3af;font-size:13px">Thank you for joining Crewzo!</p>
    </div>"""
    return _send_email(email, "Registration Received — Crewzo", html)


def send_registration_sms(mobile: str, name: str) -> bool:
    return _send_sms(mobile,
        f"Crewzo: Hi {name}! Your registration is received. Our team will verify your profile within 24-48 hrs. Thank you!")


# ── Worker Approval ───────────────────────────────────────────────────────────

def send_approval_email(email: str, name: str) -> bool:
    html = f"""<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#4338ca;margin:0 0 8px">Crewzo</h2>
      <h3 style="color:#1d4ed8;margin:0 0 16px">🎉 Profile Approved!</h3>
      <p style="color:#374151">Hello <b>{name}</b>, congratulations!</p>
      <p style="color:#374151">Your profile has been <b>verified and approved</b>. You are now visible
         to customers searching for workers in your area.</p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin:20px 0">
        <p style="color:#1e40af;font-size:13px;margin:0">
          Log in to the Crewzo app to manage your bookings and profile.
        </p>
      </div>
      <p style="color:#9ca3af;font-size:13px">Welcome to the Crewzo family!</p>
    </div>"""
    return _send_email(email, "Profile Approved — Crewzo", html)


def send_approval_sms(mobile: str, name: str) -> bool:
    return _send_sms(mobile,
        f"Crewzo: Congratulations {name}! Your profile is approved. Customers can now find and book you. Welcome!")


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
          <h2 style="color:#4338ca;margin:0 0 8px">Crewzo</h2>
          <h3 style="color:#1d4ed8;margin:0 0 16px">📋 New Service Booking!</h3>
          <p style="color:#374151;margin:0 0 16px">Hello <b>{worker_name}</b>, you have a new booking:</p>
          {_table(rows)}
          <p style="color:#9ca3af;font-size:13px;margin-top:20px">
            Please ensure you are available on the booked date.
          </p>
        </div>"""
        _send_email(email, f"New Booking from {customer_name} — Crewzo", html)
    if mobile:
        _send_sms(mobile,
            f"Crewzo: New booking! {customer_name} booked you for {job_type} on {date}. Address: {address or 'to be shared'}. Amount: Rs.{amount}")
