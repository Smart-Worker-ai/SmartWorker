from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from routers import auth, dashboard, customers, workers, bookings, grievances

app = FastAPI(title="Smart Workers — Admin Portal", version="1.0.0")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api/auth",       tags=["auth"])
app.include_router(dashboard.router,   prefix="/api/dashboard",  tags=["dashboard"])
app.include_router(customers.router,   prefix="/api/customers",  tags=["customers"])
app.include_router(workers.router,     prefix="/api/workers",    tags=["workers"])
app.include_router(bookings.router,    prefix="/api/bookings",   tags=["bookings"])
app.include_router(grievances.router,  prefix="/api/grievances", tags=["grievances"])

@app.get("/")
def root():
    return {"service": "smart-workers-admin", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy"}
