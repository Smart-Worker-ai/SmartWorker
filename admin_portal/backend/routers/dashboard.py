import httpx
from fastapi import APIRouter, Depends
from deps import require_admin
from config import CUSTOMER_BACKEND_URL, CUSTOMER_BACKEND_ADMIN_SECRET, WORKER_BACKEND_URL

router = APIRouter()

ADMIN_HEADERS = {"x-admin-secret": CUSTOMER_BACKEND_ADMIN_SECRET}


async def _fetch(path: str):
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{CUSTOMER_BACKEND_URL}{path}", headers=ADMIN_HEADERS)
        r.raise_for_status()
        return r.json()


@router.get("/stats")
async def get_stats(_=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as client:
        # Get stats from customer backend
        stats = await _fetch("/admin/stats")

        # Also fetch portal-registered workers and merge counts
        try:
            r = await client.get(f"{WORKER_BACKEND_URL}/workers/admin/all", headers=ADMIN_HEADERS)
            if r.status_code == 200:
                portal_data = r.json()
                portal_workers = portal_data.get("workers", [])
                # Add portal worker count to total
                stats["totalWorkers"] = stats.get("totalWorkers", 0) + len(portal_workers)
                # Also include top portal workers in leaderboard if available
                if "topWorkers" not in stats or not stats["topWorkers"]:
                    stats["topWorkers"] = []
                stats["topWorkers"].extend([{
                    "id": w.get("id"),
                    "name": w.get("name") or w.get("full_name", "Unknown"),
                    "job_type": w.get("trade_type") or w.get("job_type", ""),
                    "district": w.get("district", ""),
                    "bookingCount": w.get("bookingCount", 0),
                } for w in portal_workers[:5]])
        except Exception:
            pass

        return stats


@router.get("/leaderboard/customers")
async def leaderboard_customers(_=Depends(require_admin)):
    stats = await _fetch("/admin/stats")
    return {"leaderboard": stats.get("topCustomers", [])}


@router.get("/leaderboard/workers")
async def leaderboard_workers(_=Depends(require_admin)):
    stats = await _fetch("/admin/stats")
    return {"leaderboard": stats.get("topWorkers", [])}
