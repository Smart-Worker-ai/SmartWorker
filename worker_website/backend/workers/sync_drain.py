"""
Background drainer for the sync_retries dead-letter table.

Reads pending rows where next_retry_at <= now (or NULL), POSTs them to the
Node.js backend, and either deletes the row on success or schedules the next
retry with exponential backoff. Capped at 6 attempts — after that the row
stays for ops to look at.

Run as a one-shot from cron / a sidecar, or import `drain_once()` from a
background task / scheduler.

Standalone:  python -m workers.sync_drain
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Optional

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import config
from db import SessionLocal
from models import SyncRetry

log = structlog.get_logger("sync_drain")

MAX_ATTEMPTS = 6
BACKOFFS_SECONDS = [30, 60, 300, 900, 3600, 21600]  # 30s → 6h


def _next_retry_ms(attempts: int) -> int:
    backoff = BACKOFFS_SECONDS[min(attempts, len(BACKOFFS_SECONDS) - 1)]
    return int(time.time() * 1000) + backoff * 1000


async def _process_row(session: AsyncSession, row: SyncRetry, client: httpx.AsyncClient) -> None:
    try:
        payload = json.loads(row.payload)
    except Exception as e:
        log.error("sync_retry_bad_payload", id=row.id, error=str(e))
        await session.delete(row)
        return

    try:
        r = await client.post(
            f"{config.CUSTOMER_BACKEND_URL}/admin/workers",
            json=payload,
            headers={"x-admin-secret": config.ADMIN_SECRET},
            timeout=10,
        )
        r.raise_for_status()
    except Exception as e:
        row.attempts += 1
        row.last_error = str(e)
        row.next_retry_at = _next_retry_ms(row.attempts)
        log.warning(
            "sync_retry_failed",
            id=row.id, attempts=row.attempts, error=str(e),
            next_retry_at=row.next_retry_at,
        )
        if row.attempts >= MAX_ATTEMPTS:
            log.error("sync_retry_exhausted", id=row.id, target=row.target)
        return

    log.info("sync_retry_ok", id=row.id, target=row.target, after_attempts=row.attempts)
    await session.delete(row)


async def drain_once(limit: int = 50) -> int:
    """Process up to `limit` ready rows. Returns count attempted."""
    now_ms = int(time.time() * 1000)
    async with SessionLocal() as session:
        rows = (await session.execute(
            select(SyncRetry)
            .where(
                (SyncRetry.next_retry_at.is_(None)) | (SyncRetry.next_retry_at <= now_ms),
                SyncRetry.attempts < MAX_ATTEMPTS,
            )
            .limit(limit)
        )).scalars().all()

        if not rows:
            return 0

        async with httpx.AsyncClient() as client:
            for row in rows:
                await _process_row(session, row, client)

        await session.commit()
        return len(rows)


async def _main() -> None:
    processed = await drain_once()
    log.info("drain_done", processed=processed)


if __name__ == "__main__":
    asyncio.run(_main())
