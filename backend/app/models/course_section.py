from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.course_lesson import CourseLesson


class CourseSection(Base, TimestampMixin):
    __tablename__ = "course_sections"

    id: Mapped[uuid.UUID] = mapped_column(
        default=uuid.uuid4,
        primary_key=True,
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
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

    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    course: Mapped[Course] = relationship(
        "Course",
        back_populates="sections",
    )

    lessons: Mapped[list[CourseLesson]] = relationship(
        "CourseLesson",
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="CourseLesson.sort_order",
    )
