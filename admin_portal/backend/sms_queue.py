"""SMS notification queue system using RQ + Redis."""

import json
import httpx
import structlog
from typing import Optional
from rq import Queue
from redis import Redis

import config

log = structlog.get_logger("sms_queue")

redis_conn = Redis(
    host=config._optional("REDIS_HOST", "localhost"),
    port=int(config._optional("REDIS_PORT", "6379")),
    db=0,
    decode_responses=True,
)

sms_queue = Queue(connection=redis_conn, default_timeout=300)


def send_sms_via_gateway(phone: str, message: str, job_id: str = None) -> dict:
    """Call SMS Gateway API to send SMS. Runs in background worker."""
    try:
        log.info("sms_send_start", phone=phone, job_id=job_id)

        gateway_url = config._optional("SMS_GATEWAY_URL", "http://localhost:3100")
        gateway_secret = config._optional("SMS_GATEWAY_HMAC_SECRET", "dev-gateway-secret")

        payload = {
            "phone": phone,
            "message": message,
            "channel": "sms",
            "route": "auto",  # Let gateway pick best provider
        }

        # HMAC auth (same as SMS gateway expects)
        import hmac
        import hashlib
        body_json = json.dumps(payload)
        signature = hmac.new(
            gateway_secret.encode(),
            body_json.encode(),
            hashlib.sha256,
        ).hexdigest()

        headers = {
            "Content-Type": "application/json",
            "X-Signature": signature,
            "X-Idempotency-Key": job_id or phone,
        }

        with httpx.Client(timeout=10) as client:
            r = client.post(f"{gateway_url}/api/send", content=body_json, headers=headers)
            r.raise_for_status()
            result = r.json()

        log.info("sms_send_success", phone=phone, job_id=job_id, result=result)
        return result
    except Exception as e:
        log.error("sms_send_failed", phone=phone, job_id=job_id, error=str(e))
        raise


def enqueue_sms(phone: str, action: str, worker_name: str, **context) -> str:
    """Enqueue SMS notification for background processing."""
    templates = {
        "verified": f"Hi {worker_name}, your HAYAKU profile has been verified. Start accepting jobs now!",
        "approved": f"Congratulations {worker_name}! Your profile is approved. Download the app to start earning.",
        "rejected": f"Hi {worker_name}, your application was not approved at this time. Contact support for details.",
        "blocked": f"Hi {worker_name}, your account has been suspended. Contact support: support@crewzo.in",
    }

    message = templates.get(action, f"Update: {action}")

    try:
        job = sms_queue.enqueue(
            send_sms_via_gateway,
            phone=phone,
            message=message,
            job_id=f"sms-{action}-{phone}",
            job_timeout=300,
            result_ttl=86400,  # Keep result 24h
            failure_ttl=604800,  # Keep failure 7 days for debugging
        )
        log.info("sms_enqueued", phone=phone, action=action, job_id=job.id)
        return job.id
    except Exception as e:
        log.error("sms_enqueue_failed", phone=phone, action=action, error=str(e))
        raise
