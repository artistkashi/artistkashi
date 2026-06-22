from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.course_section import CourseSection
    from app.models.lesson_progress import LessonProgress


class LessonStatus(enum.StrEnum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class CourseLesson(Base, TimestampMixin):
    __tablename__ = "course_lessons"

    id: Mapped[uuid.UUID] = mapped_column(
        default=uuid.uuid4,
        primary_key=True,
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    section_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("course_sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    video_key: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    video_duration_seconds: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    thumbnail_key: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    is_preview: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    status: Mapped[LessonStatus] = mapped_column(
        Enum(
            LessonStatus,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        default=LessonStatus.PROCESSING,
        nullable=False,
    )

    course: Mapped[Course] = relationship(
        "Course",
        back_populates="lessons",
    )

    section: Mapped[CourseSection] = relationship(
        "CourseSection",
        back_populates="lessons",
    )

    progress: Mapped[list[LessonProgress]] = relationship(
        "LessonProgress",
        back_populates="lesson",
        cascade="all, delete-orphan",
    )
