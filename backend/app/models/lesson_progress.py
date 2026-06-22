from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.course_lesson import CourseLesson
    from app.models.user import User


class ProgressStatus(enum.StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class LessonProgress(Base, TimestampMixin):
    __tablename__ = "lesson_progress"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "lesson_id",
            name="uq_user_lesson_progress",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        default=uuid.uuid4,
        primary_key=True,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("course_lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[ProgressStatus] = mapped_column(
        Enum(
            ProgressStatus,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        default=ProgressStatus.NOT_STARTED,
        nullable=False,
    )

    watch_seconds: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    resume_position_seconds: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_watched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped[User] = relationship(
        "User",
        back_populates="lesson_progress",
    )

    lesson: Mapped[CourseLesson] = relationship(
        "CourseLesson",
        back_populates="progress",
    )
