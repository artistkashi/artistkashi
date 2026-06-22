from __future__ import annotations

import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.schema import TimestampSchemaRead


class CourseEnrollmentBase(BaseModel):
    is_active: bool = True


class CourseEnrollmentCreate(CourseEnrollmentBase):
    user_id: uuid.UUID
    course_id: uuid.UUID
    enrolled_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CourseEnrollmentUpdate(BaseModel):
    is_active: bool | None = None
    completed_at: datetime | None = None
    expires_at: datetime | None = None


class CourseEnrollmentRead(TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    enrolled_at: datetime
    completed_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool = True
