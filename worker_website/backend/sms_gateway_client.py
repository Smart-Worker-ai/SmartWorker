"""
Client for the self-hosted SMS Gateway service (`feature/custom-sms-gateway`).

The gateway expects HMAC-signed requests:
  X-Timestamp:  ms since epoch (5-min window enforced)
  X-Nonce:      single-use random hex (gateway tracks via Redis)
  X-Signature:  HMAC-SHA256(`${timestamp}:${nonce}:${payload}`)
  Content-Type: application/json
  payload   =   JSON.stringify(body)  — note: NO spaces, must match Node's
               canonical serialization.

Public API:
  send_message(phone, body, idempotency_key, priority='transactional') -> dict
  send_otp(phone)                                                      -> dict {otpId, expiresAt}
  verify_otp(phone, otp)                                               -> bool

All calls fail-soft: on error they log + return None / False. Caller decides
whether to surface that to the end user.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import time
import urllib.error
import urllib.request
from typing import Optional

import structlog

import config

log = structlog.get_logger("sms_gateway")


def _enabled() -> bool:
    return bool(config.SMS_GATEWAY_URL and config.SMS_GATEWAY_HMAC_SECRET)


def _sign(payload: str) -> dict[str, str]:
    """Return signing headers for `payload` (already-serialised JSON body)."""
    ts = str(int(time.time() * 1000))
    nonce = secrets.token_hex(16)
    data = f"{ts}:{nonce}:{payload}".encode()
    sig = hmac.new(
        config.SMS_GATEWAY_HMAC_SECRET.encode(),
        data,
        hashlib.sha256,
    ).hexdigest()
    return {
        "X-Timestamp": ts,
        "X-Nonce": nonce,
        "X-Signature": sig,
        "Content-Type": "application/json",
    }


def _post(path: str, body: dict, timeout: float = 10.0) -> Optional[dict]:
    if not _enabled():
        log.info("sms_gateway_disabled", path=path,
                 reason="SMS_GATEWAY_URL or SMS_GATEWAY_HMAC_SECRET not set")
        return None

    # MUST match Node's JSON.stringify output — no spaces.
    payload = json.dumps(body, separators=(",", ":"))
    headers = _sign(payload)
    url = f"{config.SMS_GATEWAY_URL.rstrip('/')}{path}"

    req = urllib.request.Request(url, data=payload.encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode() or "{}")
        if not data.get("success", True):
            log.warning("sms_gateway_error", path=path,
                        code=data.get("error", {}).get("code"),
                        message=data.get("error", {}).get("message"))
            return None
        return data.get("data") or data
    except urllib.error.HTTPError as e:
        body_text = ""
        try:
            body_text = e.read().decode()
        except Exception:
            pass
        log.error("sms_gateway_http_error", path=path, status=e.code, body=body_text[:300])
        return None
    except Exception as e:
        log.error("sms_gateway_call_failed", path=path, error=str(e))
        return None


# ── Public API ──────────────────────────────────────────────────────────────

def send_message(
    phone: str,
    body: str,
    idempotency_key: str,
    priority: str = "transactional",
    metadata: Optional[dict] = None,
) -> Optional[dict]:
    """Fire-and-forget SMS dispatch. Returns gateway response (queued message
    record) or None on failure."""
    return _post("/api/v1/messages/send", {
        "to":             phone,
        "body":           body,
        "channel":        "sms",
        "priority":       priority,
        "idempotencyKey": idempotency_key,
        **({"metadata": metadata} if metadata else {}),
    })


def send_otp(phone: str, user_id: Optional[str] = None) -> Optional[dict]:
    """Tell the gateway to generate + store + send an OTP. Gateway owns the
    full OTP lifecycle — worker_website does NOT persist OTPs anymore."""
    body = {"phone": phone}
    if user_id:
        body["userId"] = user_id
    return _post("/api/v1/otp/send", body)


def verify_otp(phone: str, otp: str) -> bool:
    """Verify the OTP through the gateway. True on match, False on any
    failure (wrong OTP, expired, rate-limited, gateway down, …)."""
    result = _post("/api/v1/otp/verify", {"phone": phone, "otp": otp})
    if not result:
        return False
    # Gateway shape: { success: true, data: { verified: bool, ... } }
    return bool(result.get("verified") or result.get("valid"))
