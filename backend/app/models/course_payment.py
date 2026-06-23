from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CoursePaymentStatus(enum.StrEnum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class CoursePayment(Base, TimestampMixin):
    __tablename__ = "course_payments"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    razorpay_order_id: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )

    razorpay_payment_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    razorpay_signature: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    status: Mapped[CoursePaymentStatus] = mapped_column(
        Enum(
            CoursePaymentStatus,
            values_callable=lambda obj: [e.value for e in obj],
            name="coursepaymentstatus",
        ),
        default=CoursePaymentStatus.PENDING,
        nullable=False,
    )

    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user = relationship("User", back_populates="course_payments")
    course = relationship("Course", back_populates="payments")
