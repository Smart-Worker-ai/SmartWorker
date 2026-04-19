import httpx
from fastapi import APIRouter, Depends
from typing import Optional
from deps import require_admin
from config import CUSTOMER_BACKEND_URL, CUSTOMER_BACKEND_ADMIN_SECRET

router = APIRouter()
H = {"x-admin-secret": CUSTOMER_BACKEND_ADMIN_SECRET}

@router.get("")
async def list_bookings(status: Optional[str] = None, _=Depends(require_admin)):
    params = {}
    if status:
        params["status"] = status
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(f"{CUSTOMER_BACKEND_URL}/admin/bookings", headers=H, params=params)
        r.raise_for_status()
        return r.json()
