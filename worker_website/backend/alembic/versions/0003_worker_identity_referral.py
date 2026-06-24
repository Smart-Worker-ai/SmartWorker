"""worker identity, referral system, and event log

Revision ID: 0003_worker_identity_referral
Revises: 0002_drop_otp_table
Create Date: 2026-06-16

Adds:
  - workers.worker_uid          (human-readable SW-XXXXXX identity)
  - workers.referral_credits
  - workers.total_referrals
  - worker_events table         (append-only audit / notification feed)
  - referral_downloads table    (dedup APK download tracking)
  - worker_earnings table       (earnings stub for future booking integration)

Backfills worker_uid for existing workers ordered by created_at.
"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_worker_identity_referral"
down_revision: Union[str, None] = "0002_drop_otp_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. New columns on workers ─────────────────────────────────────────────
    with op.batch_alter_table("workers") as batch_op:
        batch_op.add_column(
            sa.Column("worker_uid", sa.String(20), nullable=True, unique=True)
        )
        batch_op.add_column(
            sa.Column("referral_credits", sa.Integer, server_default="0", nullable=False)
        )
        batch_op.add_column(
            sa.Column("total_referrals", sa.Integer, server_default="0", nullable=False)
        )

    op.create_index("ix_workers_worker_uid", "workers", ["worker_uid"], unique=True)

    # ── 2. Backfill worker_uid for existing rows ──────────────────────────────
    # Use a numbered window ordered by created_at so UIDs are chronological.
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id FROM workers ORDER BY created_at ASC")
    ).fetchall()
    for i, (row_id,) in enumerate(rows, start=1):
        uid = f"SW-{i:06d}"
        conn.execute(
            sa.text("UPDATE workers SET worker_uid = :uid WHERE id = :id"),
            {"uid": uid, "id": row_id},
        )

    # ── 3. worker_events ──────────────────────────────────────────────────────
    op.create_table(
        "worker_events",
        sa.Column("id",          sa.String(36), primary_key=True),
        sa.Column("worker_id",   sa.String(36),
                  sa.ForeignKey("workers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type",  sa.String(60),  nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("meta",        sa.Text),           # JSON blob
        sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_worker_events_worker",  "worker_events", ["worker_id"])
    op.create_index("ix_worker_events_type",    "worker_events", ["event_type"])
    op.create_index("ix_worker_events_ts",      "worker_events", ["created_at"])

    # Log a bootstrap event for every existing worker so the timeline is complete.
    for (row_id,) in rows:
        conn.execute(
            sa.text(
                "INSERT INTO worker_events (id, worker_id, event_type, description) "
                "VALUES (:id, :wid, 'registered', 'Worker account (backfilled by migration 0003)')"
            ),
            {"id": str(uuid.uuid4()), "wid": row_id},
        )

    # ── 4. referral_downloads ─────────────────────────────────────────────────
    op.create_table(
        "referral_downloads",
        sa.Column("id",           sa.String(36), primary_key=True),
        sa.Column("worker_id",    sa.String(36),
                  sa.ForeignKey("workers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_hash",  sa.String(128), nullable=False),
        sa.Column("downloaded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_referral_downloads_worker", "referral_downloads", ["worker_id"])
    # Unique constraint prevents double credits for the same device.
    op.create_index(
        "ux_referral_device",
        "referral_downloads",
        ["worker_id", "device_hash"],
        unique=True,
    )

    # ── 5. worker_earnings ────────────────────────────────────────────────────
    op.create_table(
        "worker_earnings",
        sa.Column("id",         sa.String(36), primary_key=True),
        sa.Column("worker_id",  sa.String(36),
                  sa.ForeignKey("workers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("booking_id", sa.String(120)),
        sa.Column("amount",     sa.Float, nullable=False),
        sa.Column("period",     sa.String(20)),    # YYYY-MM
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_worker_earnings_worker", "worker_earnings", ["worker_id"])
    op.create_index("ix_worker_earnings_period", "worker_earnings", ["period"])


def downgrade() -> None:
    op.drop_table("worker_earnings")
    op.drop_index("ux_referral_device",          table_name="referral_downloads")
    op.drop_index("ix_referral_downloads_worker", table_name="referral_downloads")
    op.drop_table("referral_downloads")
    op.drop_index("ix_worker_events_ts",     table_name="worker_events")
    op.drop_index("ix_worker_events_type",   table_name="worker_events")
    op.drop_index("ix_worker_events_worker", table_name="worker_events")
    op.drop_table("worker_events")
    op.drop_index("ix_workers_worker_uid", table_name="workers")
    with op.batch_alter_table("workers") as batch_op:
        batch_op.drop_column("total_referrals")
        batch_op.drop_column("referral_credits")
        batch_op.drop_column("worker_uid")
