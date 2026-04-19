@echo off
echo Starting Admin Portal...
start "Admin Backend" cmd /k "cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8002"
timeout /t 3
start "Admin Frontend" cmd /k "cd frontend && npm install && npm run dev"
echo Admin Portal running:
echo   Backend:  http://localhost:8002
echo   Frontend: http://localhost:5175
echo.
echo Admin credentials:
echo   Username: admin
echo   Password: ***REMOVED-SECRET***
