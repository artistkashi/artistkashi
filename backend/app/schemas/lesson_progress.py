from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.schema import TimestampSchemaRead
from app.models.lesson_progress import ProgressStatus


class LessonProgressBase(BaseModel):
    status: ProgressStatus = ProgressStatus.NOT_STARTED
    watch_seconds: int = Field(default=0, ge=0)
    resume_position_seconds: int = Field(default=0, ge=0)


class LessonProgressCreate(LessonProgressBase):
    user_id: uuid.UUID
    lesson_id: uuid.UUID
    completed_at: datetime | None = None
    last_watched_at: datetime | None = None


class LessonProgressUpdate(BaseModel):
    status: ProgressStatus | None = None
    watch_seconds: int | None = Field(None, ge=0)
    resume_position_seconds: int | None = Field(None, ge=0)
    completed_at: datetime | None = None
    last_watched_at: datetime | None = None


class LessonProgressRead(TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    lesson_id: uuid.UUID
    status: ProgressStatus
    watch_seconds: int = 0
    resume_position_seconds: int = 0
    completed_at: datetime | None = None
    last_watched_at: datetime | None = None


class LessonProgressDetail(BaseModel):
    progress: LessonProgressRead
    progress_percentage: float


class CourseProgressRead(BaseModel):
    course_id: uuid.UUID
    total_lessons: int
    completed_lessons: int
    progress_percentage: float


class LessonProgressWithLessonRead(
    LessonProgressRead,
):
    lesson_title: str
    course_title: str
    course_slug: str
