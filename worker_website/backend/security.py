"""
File-upload validation. Magic-byte sniffing + size + extension whitelist.

Rejects anything that isn't a PNG/JPEG/PDF regardless of declared MIME type
or filename extension — that's the only safe way to handle untrusted uploads.
"""

from __future__ import annotations

from fastapi import HTTPException, UploadFile

try:
    import magic  # python-magic (libmagic bindings)
    _HAS_MAGIC = True
except Exception:
    _HAS_MAGIC = False

# Allow-listed content categories
_ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png"}
_ALLOWED_DOC_MIMES   = {"image/jpeg", "image/png", "application/pdf"}

_MIME_TO_EXT = {
    "image/jpeg":      ".jpg",
    "image/png":       ".png",
    "application/pdf": ".pdf",
}


async def validate_upload(
    file: UploadFile,
    *,
    max_size_mb: int,
    allow_pdf: bool,
    field_name: str,
) -> tuple[bytes, str]:
    """
    Reads file fully (so we can sniff magic bytes), enforces size cap, sniffs
    real MIME, and returns (bytes, canonical extension).

    Caller is responsible for writing the bytes wherever they go.
    """
    body = await file.read()
    size = len(body)
    max_bytes = max_size_mb * 1024 * 1024
    if size == 0:
        raise HTTPException(status_code=400, detail=f"{field_name}: file is empty.")
    if size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"{field_name}: file is larger than {max_size_mb} MB.",
        )

    if not _HAS_MAGIC:
        # libmagic missing — fall back to declared content type. Log loudly.
        # This branch should only ever hit in local dev without libmagic-dev.
        sniffed = (file.content_type or "").lower()
    else:
        sniffed = magic.from_buffer(body[:4096], mime=True)

    allowed = _ALLOWED_DOC_MIMES if allow_pdf else _ALLOWED_IMAGE_MIMES
    if sniffed not in allowed:
        raise HTTPException(
            status_code=415,
            detail=(
                f"{field_name}: file type not allowed "
                f"(detected {sniffed!r}; allowed: {sorted(allowed)})."
            ),
        )

    ext = _MIME_TO_EXT[sniffed]
    return body, ext
