"""
Admin Portal workers router.

Proxies to both:
  - Worker Website backend (WORKER_BACKEND_URL)  — for portal-registered workers
  - Node.js customer backend (CUSTOMER_BACKEND_URL) — for seeded/active workers

Phase 4 additions:
  - Worker profile endpoint (full detail + events + earnings + referral stats)
  - Platform-wide events endpoint (admin notifications feed)
  - Per-worker events endpoint
"""

import httpx
import structlog
from fastapi import APIRouter, Depends, Query
from typing import Optional
from deps import require_admin
from config import CUSTOMER_BACKEND_URL, CUSTOMER_BACKEND_ADMIN_SECRET, WORKER_BACKEND_URL

log = structlog.get_logger("admin.workers")

router = APIRouter()
H  = {"x-admin-secret": CUSTOMER_BACKEND_ADMIN_SECRET}
HW = {"x-admin-secret": CUSTOMER_BACKEND_ADMIN_SECRET}  # same secret used for worker backend


@router.get("")
async def list_workers(_=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as c:
        # Seeded/active workers from Node.js backend
        r1 = await c.get(f"{CUSTOMER_BACKEND_URL}/admin/workers", headers=H)
        node_workers = []
        if r1.status_code == 200:
            node_workers = r1.json().get("workers", [])
            for w in node_workers:
                w["_source"] = "main"

        # Registered workers from Worker Website backend
        portal_workers = []
        try:
            r2 = await c.get(f"{WORKER_BACKEND_URL}/workers/admin/all", headers=HW)
            if r2.status_code == 200:
                portal_workers = r2.json().get("workers", [])
                for w in portal_workers:
                    w["_source"] = "portal"
        except Exception:
            pass

        return {"workers": portal_workers + node_workers}


@router.get("/events")
async def list_events(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    event_type: Optional[str] = None,
    _=Depends(require_admin),
):
    """Platform-wide event/notification feed, proxied from worker backend."""
    params = {"limit": limit, "offset": offset}
    if event_type:
        params["event_type"] = event_type
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"{WORKER_BACKEND_URL}/workers/admin/events", headers=HW, params=params)
        r.raise_for_status()
        return r.json()


@router.get("/{worker_id}/detail")
async def get_worker_detail(worker_id: str, _=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(f"{WORKER_BACKEND_URL}/workers/admin/{worker_id}", headers=HW)
        r.raise_for_status()
        return r.json()


@router.get("/{worker_id}/profile")
async def get_worker_profile(worker_id: str, _=Depends(require_admin)):
    """Full worker profile including events, earnings summary, and referral stats."""
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"{WORKER_BACKEND_URL}/workers/admin/{worker_id}/profile", headers=HW)
        r.raise_for_status()
        return r.json()


@router.get("/{worker_id}/events")
async def get_worker_events(
    worker_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _=Depends(require_admin),
):
    """Per-worker event/activity history."""
    params = {"limit": limit, "offset": offset}
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(
            f"{WORKER_BACKEND_URL}/workers/admin/{worker_id}/events",
            headers=HW,
            params=params,
        )
        r.raise_for_status()
        return r.json()


@router.delete("/{worker_id}")
async def delete_worker(worker_id: str, source: str = "main", _=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as c:
        if source == "portal":
            r = await c.delete(f"{WORKER_BACKEND_URL}/workers/admin/{worker_id}", headers=HW)
        else:
            r = await c.delete(f"{CUSTOMER_BACKEND_URL}/admin/workers/{worker_id}", headers=H)
        r.raise_for_status()
        return r.json()


@router.post("/{worker_id}/approve")
async def approve_portal_worker(worker_id: str, _=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=15) as c:
        # 1. Approve in portal (worker website) backend
        r = await c.post(f"{WORKER_BACKEND_URL}/workers/admin/{worker_id}/approve", headers=HW)
        r.raise_for_status()
        result = r.json()

        # 2. Fetch full worker details to sync to main Node.js backend
        try:
            detail_r = await c.get(f"{WORKER_BACKEND_URL}/workers/admin/{worker_id}", headers=HW)
            if detail_r.status_code == 200:
                worker = detail_r.json().get("worker") or detail_r.json()
                sync_payload = {
                    "name":             worker.get("name") or worker.get("full_name", ""),
                    "phone":            worker.get("mobile") or worker.get("phone", ""),
                    "job_type":         worker.get("trade_type") or worker.get("job_type", ""),
                    "district":         worker.get("district", ""),
                    "town":             worker.get("town") or worker.get("city", ""),
                    "experience_years": worker.get("experience_years", 0),
                    "is_verified":      True,
                    "status":           "approved",
                    "portal_id":        worker_id,
                    "worker_uid":       worker.get("worker_uid"),
                }
                await c.post(f"{CUSTOMER_BACKEND_URL}/admin/workers", headers=H, json=sync_payload)
        except Exception as sync_err:
            log.error("worker_sync_failed", worker_id=worker_id, error=str(sync_err))

        return result


@router.post("/{worker_id}/reject")
async def reject_portal_worker(worker_id: str, _=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(f"{WORKER_BACKEND_URL}/workers/admin/{worker_id}/reject", headers=HW)
        r.raise_for_status()
        return r.json()


@router.post("/{worker_id}/block")
async def block_worker(worker_id: str, source: str = "main", _=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as c:
        if source == "portal":
            r = await c.post(f"{WORKER_BACKEND_URL}/workers/admin/{worker_id}/block", headers=HW)
        else:
            r = await c.post(f"{CUSTOMER_BACKEND_URL}/admin/workers/{worker_id}/block", headers=H)
        r.raise_for_status()
        return r.json()


@router.post("/{worker_id}/unblock")
async def unblock_worker(worker_id: str, source: str = "main", _=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as c:
        if source == "portal":
            r = await c.post(f"{WORKER_BACKEND_URL}/workers/admin/{worker_id}/unblock", headers=HW)
        else:
            r = await c.post(f"{CUSTOMER_BACKEND_URL}/admin/workers/{worker_id}/unblock", headers=H)
        r.raise_for_status()
        return r.json()


@router.post("/{worker_id}/verify")
async def verify_worker(worker_id: str, _=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(f"{CUSTOMER_BACKEND_URL}/admin/workers/{worker_id}/verify", headers=H)
        r.raise_for_status()
        return r.json()
