from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from typing import Optional
from config import JWT_SECRET, JWT_ALGO

def require_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized.")
    try:
        payload = jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required.")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
