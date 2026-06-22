from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.core.config import settings
from app.core.schema import TimestampSchemaRead
from app.models.course_lesson import LessonStatus
from app.services.storage_service import storage_service


class CourseLessonBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    video_duration_seconds: int = Field(default=0, ge=0)
    thumbnail_key: str | None = None
    is_preview: bool = False
    sort_order: int = Field(default=0, ge=0)
    status: LessonStatus = LessonStatus.PROCESSING


class CourseLessonCreate(CourseLessonBase):
    pass


class CourseLessonCreateDB(BaseModel):
    course_id: uuid.UUID
    section_id: uuid.UUID
    title: str
    description: str | None = None
    video_duration_seconds: int = 0
    thumbnail_key: str | None = None
    is_preview: bool = False
    sort_order: int = 0
    status: LessonStatus = LessonStatus.PROCESSING


class CourseLessonUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    video_duration_seconds: int | None = Field(None, ge=0)
    thumbnail_key: str | None = None
    is_preview: bool | None = None
    sort_order: int | None = Field(None, ge=0)
    status: LessonStatus | None = None


class CourseLessonRead(TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID
    section_id: uuid.UUID
    title: str
    description: str | None = None
    video_duration_seconds: int = 0
    video_key: str | None = None
    thumbnail_key: str | None = None
    is_preview: bool = False
    sort_order: int = 0
    status: LessonStatus

    @computed_field
    @property
    def computed_video_url(self) -> str | None:
        if self.video_key:
            return storage_service.generate_presigned_read_url(self.video_key)

    @computed_field
    @property
    def computed_thumbnail_url(self) -> str | None:
        if self.thumbnail_key:
            return f"{settings.S3_PUBLIC_URL}/{settings.S3_BUCKET_NAME}/{self.thumbnail_key}"
        return None


class CourseLessonReadWithVideo(CourseLessonRead):
    pass


class InitVideoUploadRequest(BaseModel):
    content_type: str
    file_name: str
    file_size: int | None = None


class InitVideoUploadResponse(BaseModel):
    upload_url: str
    video_key: str
    expires_in: int


class ConfirmVideoUploadRequest(BaseModel):
    video_key: str
    duration_seconds: float | None = None


class MoveLessonPayload(BaseModel):
    target_section_id: uuid.UUID
    sort_order: int | None = Field(None, ge=0)
