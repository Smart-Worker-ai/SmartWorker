import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from deps import require_admin
from config import CUSTOMER_BACKEND_URL, CUSTOMER_BACKEND_ADMIN_SECRET

router = APIRouter()
H = {"x-admin-secret": CUSTOMER_BACKEND_ADMIN_SECRET}

class ResolveBody(BaseModel):
    status: str
    adminNote: Optional[str] = None

@router.get("")
async def list_grievances(status: Optional[str] = None, _=Depends(require_admin)):
    params = {}
    if status:
        params["status"] = status
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(f"{CUSTOMER_BACKEND_URL}/admin/grievances", headers=H, params=params)
        r.raise_for_status()
        return r.json()

@router.patch("/{grievance_id}")
async def resolve_grievance(grievance_id: str, body: ResolveBody, _=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.patch(
            f"{CUSTOMER_BACKEND_URL}/admin/grievances/{grievance_id}",
            headers=H,
            json={"status": body.status, "adminNote": body.adminNote}
        )
        r.raise_for_status()
        return r.json()
