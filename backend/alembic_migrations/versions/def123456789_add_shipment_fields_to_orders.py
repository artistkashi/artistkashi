"""Add shipment fields to orders

Revision ID: def123456789
Revises: abc123456789
Create Date: 2026-08-08 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "def123456789"
down_revision: Union[str, None] = "abc123456789"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("courier_name", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("tracking_number", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("tracking_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("shipping_note", sa.Text(), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("shipped_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "shipped_at")
    op.drop_column("orders", "shipping_note")
    op.drop_column("orders", "tracking_url")
    op.drop_column("orders", "tracking_number")
    op.drop_column("orders", "courier_name")
