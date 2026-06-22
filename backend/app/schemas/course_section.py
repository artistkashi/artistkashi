from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.core.schema import TimestampSchemaRead
from app.schemas.course_lesson import CourseLessonRead


class CourseSectionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    sort_order: int = Field(default=0, ge=0)


class CourseSectionCreate(CourseSectionBase):
    pass


class CourseSectionCreateDB(BaseModel):
    course_id: uuid.UUID
    title: str
    description: str | None = None
    sort_order: int = 0


class CourseSectionUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    sort_order: int | None = Field(None, ge=0)


class CourseSectionRead(TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    description: str | None = None
    sort_order: int = 0

    lesson_count: int = 0


class CourseSectionWithLessonsRead(CourseSectionRead):
    lessons: list[CourseLessonRead] = Field(default_factory=list)
