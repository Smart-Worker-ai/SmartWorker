"""drop worker_otps table

Revision ID: 0002_drop_otp_table
Revises: 0001_initial
Create Date: 2026-05-18

OTP storage moved to the sms-gateway service. worker_website no longer
generates, hashes, or stores OTPs — it just delegates send + verify over
HMAC-signed HTTP to the gateway.

Downgrade re-creates an empty table for rollback safety; any in-flight OTPs
from the old code path are lost (they expire in 10 min anyway).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_drop_otp_table"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop index first on SQLite (idempotent on Postgres).
    try:
        op.drop_index("ix_worker_otps_mobile", table_name="worker_otps")
    except Exception:
        pass
    op.drop_table("worker_otps")


def downgrade() -> None:
    op.create_table(
        "worker_otps",
        sa.Column("id",         sa.String(36), primary_key=True),
        sa.Column("mobile",     sa.String(20), nullable=False),
        sa.Column("otp",        sa.String(6),  nullable=False),
        sa.Column("expires_at", sa.BigInteger, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_worker_otps_mobile", "worker_otps", ["mobile"])
