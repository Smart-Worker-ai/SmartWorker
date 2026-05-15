"""
Async SQLAlchemy engine + session factory.

DATABASE_URL drives everything:
  postgresql+asyncpg://user:pass@host/db?sslmode=require   (production)
  sqlite+aiosqlite:///./data/workers_portal.db             (local dev fallback)

A bare `postgresql://` URL is rewritten to `postgresql+asyncpg://` so we
accept both forms.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

import config
from models import Base


def _normalize_url(url: str | None) -> str:
    if not url:
        # Dev fallback. data/ dir is created by the engine on first write.
        return "sqlite+aiosqlite:///./data/workers_portal.db"
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://"):]
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://"):]
    return url


DATABASE_URL = _normalize_url(config.DATABASE_URL)
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    # SQLite + aiosqlite ignores pool sizing; Postgres uses it.
    pool_size=10 if not IS_SQLITE else 5,
    max_overflow=20 if not IS_SQLITE else 0,
)

SessionLocal = async_sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency. Yields a session, commits on success, rolls back
    on exception, and always closes."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_models() -> None:
    """Create tables if they don't exist. Only used in dev / SQLite mode.
    Production must run `alembic upgrade head` instead."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
