"""Add direct enrollment fields to course payments

Revision ID: fa1e2d3c4b5a
Revises: def123456789
Create Date: 2026-08-11 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "fa1e2d3c4b5a"
down_revision: Union[str, None] = "def123456789"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing rows are all Razorpay payments; backfill with server default,
    # then remove the default so the DB schema mirrors the model.
    op.add_column(
        "course_payments",
        sa.Column(
            "payment_method",
            sa.String(length=50),
            server_default="razorpay",
            nullable=False,
        ),
    )
    op.alter_column(
        "course_payments",
        "payment_method",
        server_default=None,
    )
    op.add_column(
        "course_payments",
        sa.Column("admin_note", sa.Text(), nullable=True),
    )
    # Direct (offline) payments have no Razorpay order reference.
    op.alter_column(
        "course_payments",
        "razorpay_order_id",
        existing_type=sa.String(length=255),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "course_payments",
        "razorpay_order_id",
        existing_type=sa.String(length=255),
        nullable=False,
    )
    op.drop_column("course_payments", "admin_note")
    op.drop_column("course_payments", "payment_method")
