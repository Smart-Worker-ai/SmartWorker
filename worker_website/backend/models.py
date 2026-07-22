"""
SQLAlchemy 2.0 ORM models for the Worker Registration backend.

Schema mirrors the legacy SQLite tables one-to-one so the data shape stays
stable. Postgres-specific types are used where they help (TIMESTAMPTZ for
created_at), with sensible defaults that work on SQLite too.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import BigInteger, Boolean, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _uuid() -> str:
    return str(uuid.uuid4())


class Worker(Base):
    __tablename__ = "workers"

    id:    Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name:  Mapped[str] = mapped_column(String(120), nullable=False)
    age:   Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(16), nullable=False)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    email:  Mapped[Optional[str]] = mapped_column(String(120), index=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    district: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    town:     Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    job_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    current_location: Mapped[str] = mapped_column(String(60), nullable=False)
    interested_locations: Mapped[str] = mapped_column(Text, nullable=False)
    facilities_requested: Mapped[str] = mapped_column(Text, default="")

    passbook_photo: Mapped[Optional[str]] = mapped_column(Text)
    aadhar_photo:   Mapped[Optional[str]] = mapped_column(Text)
    profile_photo:  Mapped[Optional[str]] = mapped_column(Text)

    accepted_terms: Mapped[bool]  = mapped_column(Boolean, default=False)
    status:         Mapped[str]   = mapped_column(String(20), default="pending", index=True)
    is_blocked:     Mapped[bool]  = mapped_column(Boolean, default=False)
    is_verified:    Mapped[bool]  = mapped_column(Boolean, default=False)

    registration_type: Mapped[str] = mapped_column(String(20), default="worker", index=True)
    num_workers:    Mapped[Optional[int]] = mapped_column(Integer)

    daily_rate:     Mapped[float] = mapped_column(Float, default=800.0)
    rating:         Mapped[float] = mapped_column(Float, default=0.0)
    rating_sum:     Mapped[float] = mapped_column(Float, default=0.0)
    total_reviews:  Mapped[int]   = mapped_column(Integer, default=0)
    experience_years: Mapped[int] = mapped_column(Integer, default=0)

    # ── Identity & Referral ──────────────────────────────────────────────────
    # worker_uid is a human-readable, immutable ID generated at registration
    # (e.g. SW-000042). Internal UUID `id` remains the FK target.
    worker_uid:       Mapped[Optional[str]] = mapped_column(String(20), unique=True, index=True)
    referral_credits: Mapped[int]           = mapped_column(Integer, default=0)
    total_referrals:  Mapped[int]           = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )

    sessions: Mapped[list["WorkerSession"]] = relationship(
        back_populates="worker", cascade="all, delete-orphan"
    )
    events: Mapped[list["WorkerEvent"]] = relationship(
        back_populates="worker", cascade="all, delete-orphan"
    )
    referral_downloads: Mapped[list["ReferralDownload"]] = relationship(
        back_populates="worker", cascade="all, delete-orphan"
    )
    earnings: Mapped[list["WorkerEarning"]] = relationship(
        back_populates="worker", cascade="all, delete-orphan"
    )


class WorkerSession(Base):
    __tablename__ = "worker_sessions"

    token:      Mapped[str] = mapped_column(String(64), primary_key=True)
    worker_id:  Mapped[str] = mapped_column(
        String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at: Mapped[Optional[int]] = mapped_column(BigInteger)  # epoch ms

    worker: Mapped["Worker"] = relationship(back_populates="sessions")


# NOTE: WorkerOtp model deleted in 0002_drop_otp_table. OTP storage is now
# owned by the sms-gateway service (HMAC-secured Postgres + Redis backend).
# Search history if you need the old schema; do NOT re-introduce it here.


# ── Outbox / dead-letter for the Node.js worker-approval sync ───────────────
# Phase 2 logged sync failures but had no retry. This table parks failed
# payloads; a background worker (phase 3 extension) drains it.
class SyncRetry(Base):
    __tablename__ = "sync_retries"

    id:          Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    target:      Mapped[str] = mapped_column(String(40), nullable=False)   # e.g. "node.admin_workers"
    payload:     Mapped[str] = mapped_column(Text, nullable=False)         # JSON blob
    attempts:    Mapped[int] = mapped_column(Integer, default=0)
    last_error:  Mapped[Optional[str]] = mapped_column(Text)
    created_at:  Mapped[datetime] = mapped_column(
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )
    next_retry_at: Mapped[Optional[int]] = mapped_column(BigInteger)        # epoch ms


# ── Worker Event Log ─────────────────────────────────────────────────────────
# Append-only audit trail for all important worker-lifecycle events.
# Used by admin notifications feed and worker activity timeline.
class WorkerEvent(Base):
    __tablename__ = "worker_events"

    id:          Mapped[str]          = mapped_column(String(36), primary_key=True, default=_uuid)
    worker_id:   Mapped[str]          = mapped_column(
        String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type:  Mapped[str]          = mapped_column(String(60), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    meta:        Mapped[Optional[str]] = mapped_column(Text)   # JSON blob for extra context
    created_at:  Mapped[datetime]     = mapped_column(
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    worker: Mapped["Worker"] = relationship(back_populates="events")

    def meta_dict(self) -> dict:
        try:
            return json.loads(self.meta) if self.meta else {}
        except Exception:
            return {}


# ── Referral Download Tracking ───────────────────────────────────────────────
# One row per (worker, device_hash). UNIQUE prevents duplicate credits.
class ReferralDownload(Base):
    __tablename__ = "referral_downloads"

    id:           Mapped[str]      = mapped_column(String(36), primary_key=True, default=_uuid)
    worker_id:    Mapped[str]      = mapped_column(
        String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    device_hash:  Mapped[str]      = mapped_column(String(128), nullable=False)
    downloaded_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )

    worker: Mapped["Worker"] = relationship(back_populates="referral_downloads")


# ── Worker Earnings (stub) ────────────────────────────────────────────────────
# Populated when the booking system integrates. Stored here so the schema
# is ready; admin profile view shows totals.
class WorkerEarning(Base):
    __tablename__ = "worker_earnings"

    id:         Mapped[str]          = mapped_column(String(36), primary_key=True, default=_uuid)
    worker_id:  Mapped[str]          = mapped_column(
        String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    booking_id: Mapped[Optional[str]] = mapped_column(String(120))
    amount:     Mapped[float]         = mapped_column(Float, nullable=False)
    period:     Mapped[Optional[str]] = mapped_column(String(20))   # YYYY-MM
    created_at: Mapped[datetime]      = mapped_column(
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )

    worker: Mapped["Worker"] = relationship(back_populates="earnings")
