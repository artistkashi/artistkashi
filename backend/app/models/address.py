from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Address(Base, TimestampMixin):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )

    line1: Mapped[str] = mapped_column(String(255), nullable=False)

    line2: Mapped[str | None] = mapped_column(String(255), nullable=True)

    city: Mapped[str | None] = mapped_column(String(128), nullable=True)

    state: Mapped[str | None] = mapped_column(String(128), nullable=True)

    postal_code: Mapped[str | None] = mapped_column(String(32), nullable=True)

    country: Mapped[str | None] = mapped_column(String(128), nullable=True)

    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)

    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    user = relationship("User", back_populates="addresses")
