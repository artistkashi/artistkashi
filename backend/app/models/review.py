import enum
import uuid

from sqlalchemy import (
    CheckConstraint,
    Enum,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ReviewType(enum.StrEnum):
    COURSE = "course"
    PRODUCT = "product"


class ReviewStatus(enum.StrEnum):
    ACTIVE = "active"
    BLOCKED = "blocked"


class Review(Base, TimestampMixin):
    __tablename__ = "reviews"

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_review_rating"),
        UniqueConstraint("user_id", "type", "entity_id", name="uq_review_user_entity"),
    )
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    type: Mapped[ReviewType] = mapped_column(
        Enum(ReviewType, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
        index=True,
    )

    entity_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )

    rating: Mapped[int] = mapped_column(Integer, nullable=False)

    text: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[ReviewStatus] = mapped_column(
        Enum(
            ReviewStatus, values_callable=lambda enum_cls: [e.value for e in enum_cls]
        ),
        default=ReviewStatus.ACTIVE,
        nullable=False,
    )

    user = relationship("User", back_populates="reviews")
