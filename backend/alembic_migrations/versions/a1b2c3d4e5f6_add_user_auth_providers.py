"""Add UserAuthProvider table and make hashed_password nullable

Revision ID: a1b2c3d4e5f6
Revises: 7fdcfc30d34b
Create Date: 2026-06-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "7fdcfc30d34b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create provider_type enum
    provider_type_enum = sa.Enum(
        "password", "google", name="providertype"
    )
    provider_type_enum.create(op.get_bind(), checkfirst=True)

    # Create user_auth_providers table
    op.create_table(
        "user_auth_providers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "user_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "provider",
            postgresql.ENUM(
                "password", "google", name="providertype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "provider_user_id",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider",
            "provider_user_id",
            name="uq_provider_user_id",
        ),
        sa.UniqueConstraint(
            "user_id",
            "provider",
            name="uq_user_id_provider",
        ),
    )
    op.create_index(
        op.f("ix_user_auth_providers_user_id"),
        "user_auth_providers",
        ["user_id"],
    )

    # Make hashed_password nullable for Google-only users
    op.alter_column(
        "users",
        "hashed_password",
        existing_type=sa.String(length=255),
        nullable=True,
    )

    # Backfill: create UserAuthProvider(provider="password") for every existing user
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT id FROM users")
    )
    rows = result.fetchall()
    for row in rows:
        user_id = row[0]
        conn.execute(
            sa.text(
                """INSERT INTO user_auth_providers
                   (id, user_id, provider, provider_user_id, created_at, updated_at)
                   VALUES (gen_random_uuid(), :uid, 'password', NULL, NOW(), NULL)"""
            ),
            {"uid": user_id},
        )


def downgrade() -> None:
    # Drop backfill data first
    op.execute(
        "DELETE FROM user_auth_providers WHERE provider = 'password'"
    )

    # Revert hashed_password to NOT NULL
    op.alter_column(
        "users",
        "hashed_password",
        existing_type=sa.String(length=255),
        nullable=False,
    )

    # Drop table and index
    op.drop_index(
        op.f("ix_user_auth_providers_user_id"),
        table_name="user_auth_providers",
    )
    op.drop_table("user_auth_providers")

    # Drop the enum type
    provider_type_enum = sa.Enum(
        "password", "google", name="providertype"
    )
    provider_type_enum.drop(op.get_bind(), checkfirst=True)
