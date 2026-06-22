from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.course import Course


class CourseCategory(Base, TimestampMixin):
    """
    Portrait Drawing
    Oil Painting
    Watercolor
    Sketching
    Charcoal Art
    Digital Art
    """

    __tablename__ = "course_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        default=uuid.uuid4, primary_key=True
    )
    name: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    slug: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    courses: Mapped[list[Course]] = relationship("Course", back_populates="category")
