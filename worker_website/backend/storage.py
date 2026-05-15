"""
File storage abstraction. Local-disk in dev, S3-compatible (Cloudflare R2,
AWS S3, MinIO) in production. Phase-4 will flip USE_S3_STORAGE in config and
this module starts uploading to R2 with no caller-side changes.

Public API:
    storage.save(data, folder, ext) -> public_url (str)
    storage.delete(public_url)
"""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import Optional

import config

# ── S3 client (lazy, only if configured) ────────────────────────────────────
_s3_client = None


def _get_s3():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    if not config.USE_S3_STORAGE:
        raise RuntimeError("S3 not configured")
    import boto3  # lazy import — keeps dev image smaller
    from botocore.config import Config as BotoConfig

    _s3_client = boto3.client(
        "s3",
        endpoint_url=config.S3_ENDPOINT_URL,
        aws_access_key_id=config.S3_ACCESS_KEY,
        aws_secret_access_key=config.S3_SECRET_KEY,
        region_name=config.S3_REGION,
        config=BotoConfig(signature_version="s3v4", retries={"max_attempts": 3}),
    )
    return _s3_client


# ── Local fallback ───────────────────────────────────────────────────────────
_UPLOADS_DIR = Path("uploads")


def _save_local(data: bytes, folder: str, ext: str) -> str:
    dest_dir = _UPLOADS_DIR / folder
    dest_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4()}{ext}"
    (dest_dir / name).write_bytes(data)
    return f"/uploads/{folder}/{name}"


def _delete_local(public_url: str) -> None:
    # public_url like /uploads/passbook/<uuid>.jpg
    if not public_url.startswith("/uploads/"):
        return
    p = Path(public_url.lstrip("/"))
    try:
        p.unlink(missing_ok=True)
    except OSError:
        pass


# ── S3 / R2 ──────────────────────────────────────────────────────────────────
def _save_s3(data: bytes, folder: str, ext: str) -> str:
    name = f"{uuid.uuid4()}{ext}"
    key = f"{folder}/{name}"
    content_type = {
        ".jpg":  "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png":  "image/png",
        ".pdf":  "application/pdf",
    }.get(ext.lower(), "application/octet-stream")

    s3 = _get_s3()
    s3.put_object(
        Bucket=config.S3_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
        # Bucket-level public-read should be OFF. Caller fetches via signed URL.
    )
    if config.S3_PUBLIC_URL_BASE:
        # If a public CDN base is configured (e.g. R2 custom domain), return that.
        return f"{config.S3_PUBLIC_URL_BASE.rstrip('/')}/{key}"
    # Otherwise return an opaque token — `presigned_url()` below resolves it.
    return f"s3://{key}"


def _delete_s3(public_url: str) -> None:
    key = _key_from_public_url(public_url)
    if not key:
        return
    try:
        _get_s3().delete_object(Bucket=config.S3_BUCKET, Key=key)
    except Exception:
        # Swallow — orphaned object is harmless.
        pass


def _key_from_public_url(public_url: str) -> Optional[str]:
    if public_url.startswith("s3://"):
        return public_url[len("s3://"):]
    if config.S3_PUBLIC_URL_BASE and public_url.startswith(config.S3_PUBLIC_URL_BASE):
        return public_url[len(config.S3_PUBLIC_URL_BASE):].lstrip("/")
    return None


# ── Public API ───────────────────────────────────────────────────────────────
def save(data: bytes, folder: str, ext: str) -> str:
    """Persist `data` and return a value suitable for storing in the DB and
    later resolving to a viewable URL via `resolve_url()`."""
    if config.USE_S3_STORAGE:
        return _save_s3(data, folder, ext)
    return _save_local(data, folder, ext)


def delete(public_url: str) -> None:
    if not public_url:
        return
    if public_url.startswith("s3://") or (
        config.S3_PUBLIC_URL_BASE and public_url.startswith(config.S3_PUBLIC_URL_BASE)
    ):
        _delete_s3(public_url)
    else:
        _delete_local(public_url)


def resolve_url(stored: Optional[str], *, expires_in: int = 3600) -> Optional[str]:
    """Turn whatever we stored in the DB into a browser-loadable URL.

    Local path  → absolute URL under SELF_BASE_URL/uploads/...
    s3://key    → presigned GET URL (short-lived)
    Already-absolute URL (S3_PUBLIC_URL_BASE was set) → returned as-is.
    """
    if not stored:
        return None

    if stored.startswith("http://") or stored.startswith("https://"):
        return stored

    if stored.startswith("s3://"):
        key = stored[len("s3://"):]
        try:
            return _get_s3().generate_presigned_url(
                "get_object",
                Params={"Bucket": config.S3_BUCKET, "Key": key},
                ExpiresIn=expires_in,
            )
        except Exception:
            return None

    # Local path stored like "/uploads/folder/file.jpg"
    if stored.startswith("/"):
        return f"{config.SELF_BASE_URL}{stored}"
    return stored
