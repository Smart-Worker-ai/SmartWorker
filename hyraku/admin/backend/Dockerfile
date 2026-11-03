FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PORT=8002
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl sqlite3 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/data
EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 CMD curl -fsS http://localhost:8002/health || exit 1
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
