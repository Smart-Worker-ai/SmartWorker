@echo off
echo Starting Worker Website...
start "Worker Backend" cmd /k "cd backend && python -m pip install -r requirements.txt && python -m uvicorn main:app --reload --port 8000"
timeout /t 3
start "Worker Frontend" cmd /k "cd frontend && npm install && npm run dev"
echo Worker Website running:
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5174
