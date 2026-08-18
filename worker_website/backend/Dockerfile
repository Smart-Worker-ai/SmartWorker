# syntax=docker/dockerfile:1.7

# ──────────────────────────────────────────────────────────────────────────────
# Worker Registration backend  ·  FastAPI + async SQLAlchemy
# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Build-time deps (compilers + libs needed only to build wheels).
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libffi-dev \
        libssl-dev \
        libjpeg-dev \
        zlib1g-dev \
        libmagic-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt


# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/usr/local/bin:$PATH" \
    PORT=8000

WORKDIR /app

# Runtime libs only — no compilers in the final image.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libjpeg62-turbo \
        libmagic1 \
        curl \
        ca-certificates \
        tini \
    && rm -rf /var/lib/apt/lists/*

# Bring in built Python packages.
COPY --from=builder /install /usr/local

# Non-root user.
RUN useradd -m -u 1000 -s /bin/bash app
RUN mkdir -p /app/data /app/uploads && chown -R app:app /app
USER app

COPY --chown=app:app . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers ${UVICORN_WORKERS:-2}"]
