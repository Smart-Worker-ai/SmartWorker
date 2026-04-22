import os

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "***REMOVED-SECRET***")
JWT_SECRET = os.getenv("JWT_SECRET", "admin-jwt-secret-change-in-production")
JWT_ALGO = "HS256"
JWT_EXPIRE_HOURS = 12

# Customer backend (Node.js on Railway)
CUSTOMER_BACKEND_URL = os.getenv("CUSTOMER_BACKEND_URL", "https://smart-workers-backend-production.up.railway.app/api/v1")
CUSTOMER_BACKEND_ADMIN_SECRET = os.getenv("CUSTOMER_BACKEND_ADMIN_SECRET", "***REMOVED-SECRET***")

# Worker website backend
WORKER_BACKEND_URL = os.getenv("WORKER_BACKEND_URL", "https://worker-portal-backend-production.up.railway.app/api")
