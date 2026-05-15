"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-15

Creates workers, worker_sessions, worker_otps, sync_retries tables.
Idempotent for SQLite via batch ops; runs natively on Postgres.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workers",
        sa.Column("id",     sa.String(36), primary_key=True),
        sa.Column("name",   sa.String(120), nullable=False),
        sa.Column("age",    sa.Integer,    nullable=False),
        sa.Column("gender", sa.String(16), nullable=False),
        sa.Column("mobile", sa.String(20), nullable=False, unique=True),
        sa.Column("email",  sa.String(120)),
        sa.Column("address", sa.Text,      nullable=False),
        sa.Column("district", sa.String(60), nullable=False),
        sa.Column("town",     sa.String(60), nullable=False),
        sa.Column("job_type", sa.String(60), nullable=False),
        sa.Column("current_location",     sa.String(60), nullable=False),
        sa.Column("interested_locations", sa.Text,       nullable=False),
        sa.Column("facilities_requested", sa.Text, server_default=""),
        sa.Column("passbook_photo", sa.Text),
        sa.Column("aadhar_photo",   sa.Text),
        sa.Column("profile_photo",  sa.Text),
        sa.Column("accepted_terms", sa.Boolean, server_default=sa.false()),
        sa.Column("status",         sa.String(20), server_default="pending"),
        sa.Column("is_blocked",     sa.Boolean, server_default=sa.false()),
        sa.Column("is_verified",    sa.Boolean, server_default=sa.false()),
        sa.Column("daily_rate",       sa.Float,   server_default="800"),
        sa.Column("rating",           sa.Float,   server_default="0"),
        sa.Column("rating_sum",       sa.Float,   server_default="0"),
        sa.Column("total_reviews",    sa.Integer, server_default="0"),
        sa.Column("experience_years", sa.Integer, server_default="0"),
        sa.Column("created_at",       sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_workers_mobile",   "workers", ["mobile"], unique=True)
    op.create_index("ix_workers_email",    "workers", ["email"])
    op.create_index("ix_workers_district", "workers", ["district"])
    op.create_index("ix_workers_town",     "workers", ["town"])
    op.create_index("ix_workers_job_type", "workers", ["job_type"])
    op.create_index("ix_workers_status",   "workers", ["status"])

    op.create_table(
        "worker_sessions",
        sa.Column("token",     sa.String(64), primary_key=True),
        sa.Column("worker_id", sa.String(36),
                  sa.ForeignKey("workers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("expires_at", sa.BigInteger),
    )
    op.create_index("ix_worker_sessions_worker", "worker_sessions", ["worker_id"])

    op.create_table(
        "worker_otps",
        sa.Column("id",         sa.String(36), primary_key=True),
        sa.Column("mobile",     sa.String(20), nullable=False),
        sa.Column("otp",        sa.String(6),  nullable=False),
        sa.Column("expires_at", sa.BigInteger, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_worker_otps_mobile", "worker_otps", ["mobile"])

    op.create_table(
        "sync_retries",
        sa.Column("id",      sa.String(36), primary_key=True),
        sa.Column("target",  sa.String(40), nullable=False),
        sa.Column("payload", sa.Text,       nullable=False),
        sa.Column("attempts",   sa.Integer, server_default="0"),
        sa.Column("last_error", sa.Text),
        sa.Column("created_at",    sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("next_retry_at", sa.BigInteger),
    )


def downgrade() -> None:
    op.drop_table("sync_retries")
    op.drop_table("worker_otps")
    op.drop_table("worker_sessions")
    op.drop_table("workers")
