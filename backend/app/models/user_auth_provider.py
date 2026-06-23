from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class ProviderType(enum.StrEnum):
    PASSWORD = "password"
    GOOGLE = "google"


class UserAuthProvider(Base, TimestampMixin):
    __tablename__ = "user_auth_providers"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    provider: Mapped[ProviderType] = mapped_column(
        Enum(
            ProviderType,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
    )

    provider_user_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    user: Mapped[User] = relationship(
        "User",
        back_populates="auth_providers",
    )

    __table_args__ = (
        UniqueConstraint(
            "provider",
            "provider_user_id",
            name="uq_provider_user_id",
        ),
        UniqueConstraint(
            "user_id",
            "provider",
            name="uq_user_id_provider",
        ),
    )
