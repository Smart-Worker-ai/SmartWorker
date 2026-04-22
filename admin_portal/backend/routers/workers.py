import httpx
from fastapi import APIRouter, Depends
from deps import require_admin
from config import CUSTOMER_BACKEND_URL, CUSTOMER_BACKEND_ADMIN_SECRET, WORKER_BACKEND_URL

router = APIRouter()
H  = {"x-admin-secret": CUSTOMER_BACKEND_ADMIN_SECRET}
HW = {"x-admin-secret": CUSTOMER_BACKEND_ADMIN_SECRET}  # same secret

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

@router.get("/{worker_id}/detail")
async def get_worker_detail(worker_id: str, _=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(f"{WORKER_BACKEND_URL}/workers/admin/{worker_id}", headers=HW)
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
        r = await c.post(f"{WORKER_BACKEND_URL}/workers/admin/{worker_id}/approve", headers=HW)
        r.raise_for_status()
        return r.json()

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
