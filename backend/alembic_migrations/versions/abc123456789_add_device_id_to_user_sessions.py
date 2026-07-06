"""Add device_id to user_sessions

Revision ID: abc123456789
Revises: e912daf3bdbb
Create Date: 2026-06-27 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "abc123456789"
down_revision: Union[str, None] = "e912daf3bdbb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_sessions",
        sa.Column("device_id", sa.String(length=255), nullable=True),
    )
    op.create_index(
        op.f("ix_user_sessions_device_id"),
        "user_sessions",
        ["device_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_user_sessions_device_id"),
        table_name="user_sessions",
    )
    op.drop_column("user_sessions", "device_id")
