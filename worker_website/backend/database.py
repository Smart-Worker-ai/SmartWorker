"""
SQLite connection + schema bootstrap.

Phase 3 will swap this for SQLAlchemy + Postgres. This file is kept tiny so
that swap is clean.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path("data/workers_portal.db")


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    conn = get_conn()
    # Forward migrations for columns missing in older DBs.
    for col, definition in [
        ("email",      "TEXT"),
        ("expires_at", "INTEGER"),   # on worker_sessions, see below
    ]:
        try:
            conn.execute(f"ALTER TABLE workers ADD COLUMN {col} {definition}")
            conn.commit()
        except Exception:
            pass

    # Sessions: add expires_at if missing.
    try:
        conn.execute("ALTER TABLE worker_sessions ADD COLUMN expires_at INTEGER")
        conn.commit()
    except Exception:
        pass

    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS workers (
            id              TEXT PRIMARY KEY,
            name            TEXT NOT NULL,
            age             INTEGER NOT NULL,
            gender          TEXT NOT NULL,
            mobile          TEXT NOT NULL UNIQUE,
            email           TEXT,
            address         TEXT NOT NULL,
            district        TEXT NOT NULL,
            town            TEXT NOT NULL,
            job_type        TEXT NOT NULL,
            current_location TEXT NOT NULL,
            interested_locations TEXT NOT NULL,
            facilities_requested TEXT DEFAULT '',
            passbook_photo  TEXT,
            aadhar_photo    TEXT,
            profile_photo   TEXT,
            accepted_terms  INTEGER DEFAULT 0,
            status          TEXT DEFAULT 'pending',
            is_blocked      INTEGER DEFAULT 0,
            is_verified     INTEGER DEFAULT 0,
            daily_rate      REAL DEFAULT 800,
            rating          REAL DEFAULT 0,
            rating_sum      REAL DEFAULT 0,
            total_reviews   INTEGER DEFAULT 0,
            experience_years INTEGER DEFAULT 0,
            created_at      TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS worker_sessions (
            token       TEXT PRIMARY KEY,
            worker_id   TEXT NOT NULL REFERENCES workers(id),
            created_at  TEXT DEFAULT (datetime('now')),
            expires_at  INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_worker_sessions_worker
            ON worker_sessions(worker_id);

        CREATE TABLE IF NOT EXISTS worker_otps (
            id         TEXT PRIMARY KEY,
            mobile     TEXT NOT NULL,
            otp        TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_worker_otps_mobile ON worker_otps(mobile);
        """
    )
    conn.commit()
    conn.close()
