import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class ReviewType(enum.StrEnum):
    COURSE = "course"
    PRODUCT = "product"


class ReviewStatus(enum.StrEnum):
    ACTIVE = "active"
    BLOCKED = "blocked"
    FLAGGED = "flagged"


class Review(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "reviews"
    __allow_unmapped__ = True

    __table_args__ = (
        CheckConstraint("rating >= 0 AND rating <= 5", name="check_review_rating"),
        UniqueConstraint("user_id", "type", "entity_id", name="uq_review_user_entity"),
    )

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)

    type: Mapped[ReviewType] = mapped_column(
        SQLAlchemyEnum(
            ReviewType, values_callable=lambda enum_cls: [e.value for e in enum_cls]
        ),
        nullable=False,
        index=True,
    )

    entity_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )

    rating: Mapped[Decimal] = mapped_column(Numeric(3, 1), nullable=False)

    text: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[ReviewStatus] = mapped_column(
        SQLAlchemyEnum(
            ReviewStatus, values_callable=lambda enum_cls: [e.value for e in enum_cls]
        ),
        default=ReviewStatus.ACTIVE,
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="reviews")

    reports: Mapped[list["ReviewReport"]] = relationship(
        "ReviewReport", back_populates="review", cascade="all, delete-orphan"
    )

    @property
    def entity_name(self) -> str:
        if self.type == ReviewType.COURSE and self.course:
            return self.course.title
        elif self.type == ReviewType.PRODUCT and self.product:
            return self.product.name
        return "Unknown"

    @property
    def avatar_seed(self) -> str | None:
        if self.user.full_name:
            return self.user.full_name.split("")[0]
        return None


class ReviewReport(Base, TimestampMixin):
    __tablename__ = "review_reports"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)

    review_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )

    reason: Mapped[str] = mapped_column(Text, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="review_reports")

    review: Mapped["Review"] = relationship("Review", back_populates="reports")
