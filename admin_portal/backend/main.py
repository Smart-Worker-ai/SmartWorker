"""
Admin Portal backend — FastAPI entry point.

Wires CORS (env-driven allow-list), security headers, rate limiting,
structured logging, and the admin routers.
"""

from __future__ import annotations

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

import config
from rate_limit import limiter
from routers import auth, bookings, customers, dashboard, grievances, workers


# ── Structured logging ──────────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.dict_tracebacks,
        structlog.processors.JSONRenderer(),
    ],
)
log = structlog.get_logger("admin_backend")


app = FastAPI(title="Smart Workers — Admin Portal", version="1.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Security headers ─────────────────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )
        if config.IS_PROD:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response


app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
        except Exception as exc:
            log.exception(
                "request_failed",
                method=request.method,
                path=request.url.path,
                client=get_remote_address(request),
                error=str(exc),
            )
            return JSONResponse({"detail": "Internal server error."}, status_code=500)
        log.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            client=get_remote_address(request),
        )
        return response


app.add_middleware(AccessLogMiddleware)


@app.on_event("startup")
def startup():
    log.info("boot", env=config.ENV, cors_origins=config.CORS_ORIGINS)


app.include_router(auth.router,       prefix="/api/auth",       tags=["auth"])
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["dashboard"])
app.include_router(customers.router,  prefix="/api/customers",  tags=["customers"])
app.include_router(workers.router,    prefix="/api/workers",    tags=["workers"])
app.include_router(bookings.router,   prefix="/api/bookings",   tags=["bookings"])
app.include_router(grievances.router, prefix="/api/grievances", tags=["grievances"])


@app.get("/")
def root():
    return {"service": "smart-workers-admin", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}
