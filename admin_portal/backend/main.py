from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, dashboard, customers, workers, bookings, grievances

app = FastAPI(title="Smart Workers — Admin Portal", version="1.0.0")

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
