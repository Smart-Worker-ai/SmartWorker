import sqlite3
from pathlib import Path

DB_PATH = Path("data/workers_portal.db")

def get_conn():
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS workers (
            id              TEXT PRIMARY KEY,
            name            TEXT NOT NULL,
            age             INTEGER NOT NULL,
            gender          TEXT NOT NULL,
            mobile          TEXT NOT NULL UNIQUE,
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
            created_at  TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()
