import os
import re

import sqlcipher3.dbapi2 as sqlcipher
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DB_PATH = os.getenv("HYRAKU_DB_PATH", os.path.join(os.path.dirname(__file__), "data", "hyraku.db"))
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# The whole database file is encrypted with SQLCipher (AES-256). The key is a raw
# 256-bit value given as 64 hex characters; generate one with `openssl rand -hex 32`.
DB_KEY = (os.getenv("HYRAKU_DB_KEY") or "").strip().lower()
if not re.fullmatch(r"[0-9a-f]{64}", DB_KEY):
    raise RuntimeError("HYRAKU_DB_KEY must be 64 hex characters (openssl rand -hex 32).")

_KEY_PRAGMA = f"PRAGMA key = \"x'{DB_KEY}'\""
_PLAINTEXT_HEADER = b"SQLite format 3\x00"


def _apply_key(conn):
    cur = conn.cursor()
    cur.execute(_KEY_PRAGMA)
    # Fails here, not on first query, if the key is wrong.
    cur.execute("SELECT count(*) FROM sqlite_master")
    cur.close()


def _table_counts(conn) -> dict:
    cur = conn.cursor()
    tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
    counts = {t: cur.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0] for t in tables}
    cur.close()
    return counts


def _encrypt_plaintext_db():
    """One-time upgrade: re-write an existing unencrypted database as an encrypted one."""
    if not os.path.exists(DB_PATH):
        return
    with open(DB_PATH, "rb") as fh:
        if fh.read(16) != _PLAINTEXT_HEADER:
            return

    tmp = DB_PATH + ".encrypting"
    if os.path.exists(tmp):
        os.remove(tmp)

    src = sqlcipher.connect(DB_PATH)
    try:
        before = _table_counts(src)
        src.execute(f"ATTACH DATABASE ? AS encrypted KEY \"x'{DB_KEY}'\"", (tmp,))
        src.execute("SELECT sqlcipher_export('encrypted')")
        src.execute("DETACH DATABASE encrypted")
    finally:
        src.close()

    check = sqlcipher.connect(tmp)
    try:
        _apply_key(check)
        after = _table_counts(check)
    finally:
        check.close()
    if before != after:
        os.remove(tmp)
        raise RuntimeError(f"Database encryption check failed: {before} != {after}. Plain database left untouched.")

    os.replace(tmp, DB_PATH)
    for suffix in ("-journal", "-wal", "-shm"):
        if os.path.exists(DB_PATH + suffix):
            os.remove(DB_PATH + suffix)
    print(f"Encrypted existing database in place ({sum(after.values())} rows).", flush=True)


_encrypt_plaintext_db()

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    module=sqlcipher,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _on_connect(dbapi_conn, _record):
    _apply_key(dbapi_conn)


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
