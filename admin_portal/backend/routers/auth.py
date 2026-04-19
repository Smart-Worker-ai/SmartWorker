from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from jose import jwt
from config import ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET, JWT_ALGO, JWT_EXPIRE_HOURS

router = APIRouter()

class LoginBody(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(body: LoginBody):
    if body.username != ADMIN_USERNAME or body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    token = jwt.encode(
        {"sub": body.username, "role": "admin",
         "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)},
        JWT_SECRET, algorithm=JWT_ALGO
    )
    return {"token": token, "username": body.username}
