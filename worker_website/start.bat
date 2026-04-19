@echo off
echo Starting Worker Website...
start "Worker Backend" cmd /k "cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000"
timeout /t 3
start "Worker Frontend" cmd /k "cd frontend && npm install && npm run dev"
echo Worker Website running:
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5174
