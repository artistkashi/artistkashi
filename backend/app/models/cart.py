from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CartItem(Base, TimestampMixin):
    __tablename__ = "cart_items"

    __table_args__ = (
        CheckConstraint(
            """
            (
                product_id IS NOT NULL
                AND course_id IS NULL
            )
            OR
            (
                product_id IS NULL
                AND course_id IS NOT NULL
            )
            """,
            name="cartitem_one_item_only",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=True
    )

    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True
    )

    course_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=True
    )

    quantity: Mapped[int] = mapped_column(Integer, default=1)

    user = relationship("User", back_populates="cart_items")

    product = relationship("Product")

    variant = relationship("ProductVariant")

    course = relationship("Course")
