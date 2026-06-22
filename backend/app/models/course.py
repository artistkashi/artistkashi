from __future__ import annotations

import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.course_category import CourseCategory
    from app.models.course_enrollment import CourseEnrollment
    from app.models.course_lesson import CourseLesson
    from app.models.course_section import CourseSection


class CourseLevel(enum.StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Course(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)

    slug: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )

    short_description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    thumbnail_key: Mapped[str | None] = mapped_column(String(500), nullable=True)

    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    demo_video_key: Mapped[str | None] = mapped_column(String(500), nullable=True)

    demo_video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    whatsapp_channel_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    level: Mapped[CourseLevel] = mapped_column(
        Enum(CourseLevel, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        default=CourseLevel.BEGINNER,
        nullable=False,
    )

    language: Mapped[str] = mapped_column(String(50), default="english", nullable=False)

    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # discount_price: Mapped[Decimal | None] = mapped_column(
    #     Numeric(10, 2), nullable=True
    # )

    # badge: Mapped[str | None] = mapped_column(String(100), nullable=True)

    welcome_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    what_you_will_learn: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    requirements: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    total_duration_seconds: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )

    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("course_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    category: Mapped[CourseCategory | None] = relationship(
        "CourseCategory", back_populates="courses"
    )

    sections: Mapped[list[CourseSection]] = relationship(
        "CourseSection",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="CourseSection.sort_order",
    )

    lessons: Mapped[list[CourseLesson]] = relationship(
        "CourseLesson", back_populates="course", cascade="all, delete-orphan"
    )

    enrollments: Mapped[list[CourseEnrollment]] = relationship(
        "CourseEnrollment", back_populates="course", cascade="all, delete-orphan"
    )
