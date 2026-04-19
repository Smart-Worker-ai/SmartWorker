import httpx
from fastapi import APIRouter, Depends
from deps import require_admin
from config import CUSTOMER_BACKEND_URL, CUSTOMER_BACKEND_ADMIN_SECRET

router = APIRouter()
H = {"x-admin-secret": CUSTOMER_BACKEND_ADMIN_SECRET}

@router.get("")
async def list_customers(_=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(f"{CUSTOMER_BACKEND_URL}/admin/customers", headers=H)
        r.raise_for_status()
        return r.json()

@router.post("/{customer_id}/block")
async def block_customer(customer_id: str, _=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(f"{CUSTOMER_BACKEND_URL}/admin/customers/{customer_id}/block", headers=H)
        r.raise_for_status()
        return r.json()

@router.post("/{customer_id}/unblock")
async def unblock_customer(customer_id: str, _=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(f"{CUSTOMER_BACKEND_URL}/admin/customers/{customer_id}/unblock", headers=H)
        r.raise_for_status()
        return r.json()
