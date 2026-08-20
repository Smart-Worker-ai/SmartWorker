"""agent registration fields

Revision ID: 0004_agent_registration_fields
Revises: 0003_worker_identity_referral
Create Date: 2026-08-20

Adds:
  - workers.registration_type  ("worker" | "agent")
  - workers.num_workers        (agent-only headcount; NULL for plain workers)

These two columns were added to the Worker model by the agent-registration
feature but never got a migration, so every query against `workers` failed
with UndefinedColumn against a migrated database.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_agent_registration_fields"
down_revision: Union[str, None] = "0003_worker_identity_referral"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("workers") as batch_op:
        batch_op.add_column(
            sa.Column(
                "registration_type",
                sa.String(20),
                server_default="worker",
                nullable=False,
            )
        )
        batch_op.add_column(sa.Column("num_workers", sa.Integer, nullable=True))

    op.create_index(
        "ix_workers_registration_type", "workers", ["registration_type"]
    )


def downgrade() -> None:
    op.drop_index("ix_workers_registration_type", table_name="workers")
    with op.batch_alter_table("workers") as batch_op:
        batch_op.drop_column("num_workers")
        batch_op.drop_column("registration_type")
