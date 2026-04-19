import httpx
from fastapi import APIRouter, Depends
from deps import require_admin
from config import CUSTOMER_BACKEND_URL, CUSTOMER_BACKEND_ADMIN_SECRET

router = APIRouter()

ADMIN_HEADERS = {"x-admin-secret": CUSTOMER_BACKEND_ADMIN_SECRET}


async def _fetch(path: str):
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{CUSTOMER_BACKEND_URL}{path}", headers=ADMIN_HEADERS)
        r.raise_for_status()
        return r.json()


@router.get("/stats")
async def get_stats(_=Depends(require_admin)):
    return await _fetch("/admin/stats")


@router.get("/leaderboard/customers")
async def leaderboard_customers(_=Depends(require_admin)):
    stats = await _fetch("/admin/stats")
    return {"leaderboard": stats.get("topCustomers", [])}


@router.get("/leaderboard/workers")
async def leaderboard_workers(_=Depends(require_admin)):
    stats = await _fetch("/admin/stats")
    return {"leaderboard": stats.get("topWorkers", [])}
