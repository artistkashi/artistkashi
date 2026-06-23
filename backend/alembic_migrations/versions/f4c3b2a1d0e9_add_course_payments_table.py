"""Add course_payments table

Revision ID: f4c3b2a1d0e9
Revises: 6aba67161f70
Create Date: 2026-06-23 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f4c3b2a1d0e9"
down_revision: Union[str, None] = "6aba67161f70"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "course_payments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("razorpay_order_id", sa.String(255), nullable=False),
        sa.Column("razorpay_payment_id", sa.String(255), nullable=True),
        sa.Column("razorpay_signature", sa.String(500), nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending", "paid", "failed", "refunded",
                name="coursepaymentstatus",
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["course_id"], ["courses.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_course_payments_user_id", "course_payments", ["user_id"]
    )
    op.create_index(
        "ix_course_payments_course_id", "course_payments", ["course_id"]
    )
    op.create_index(
        "ix_course_payments_razorpay_order_id",
        "course_payments",
        ["razorpay_order_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_course_payments_razorpay_order_id", table_name="course_payments")
    op.drop_index("ix_course_payments_course_id", table_name="course_payments")
    op.drop_index("ix_course_payments_user_id", table_name="course_payments")
    op.drop_table("course_payments")
    op.execute("DROP TYPE IF EXISTS coursepaymentstatus")
