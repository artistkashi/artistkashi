from __future__ import annotations

import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

from app.core.config import settings
from app.core.schema import TimestampSchemaRead, slugify
from app.models.course import CourseLevel
from app.schemas.course_category import CourseCategoryRead
from app.schemas.course_section import CourseSectionWithLessonsRead


class CourseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    slug: str | None = Field(None, max_length=255)
    short_description: str | None = Field(None, max_length=500)
    description: str | None = None
    level: CourseLevel = CourseLevel.BEGINNER
    language: str = Field(default="English", max_length=50)
    price: Decimal = Field(..., gt=0, decimal_places=2)
    # discount_price: Decimal | None = Field(
    # None, ge=0, decimal_places=2, max_digits=10)
    # badge: str | None = Field(None, max_length=100)
    welcome_message: str | None = None
    what_you_will_learn: list[str] | None = None
    requirements: list[str] | None = None
    is_featured: bool = False
    is_published: bool = False
    category_id: uuid.UUID | None = None
    thumbnail_url: str | None = None
    demo_video_url: str | None = None


class CourseCreate(CourseBase):
    whatsapp_channel_url: str | None = None

    @model_validator(mode="after")
    def auto_slug(self) -> CourseCreate:
        if not self.slug:
            self.slug = slugify(self.title)
        return self


class CourseUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    slug: str | None = Field(None, max_length=255)
    short_description: str | None = Field(None, max_length=500)
    description: str | None = None
    level: CourseLevel | None = None
    language: str | None = Field(None, max_length=50)
    price: Decimal | None = Field(None, gt=0, decimal_places=2, max_digits=10)
    # discount_price: Decimal | None = Field(
    # None, ge=0, decimal_places=2, max_digits=10)
    # badge: str | None = Field(None, max_length=100)
    whatsapp_channel_url: str | None = None
    welcome_message: str | None = None
    what_you_will_learn: list[str] | None = None
    requirements: list[str] | None = None
    is_featured: bool | None = None
    is_published: bool | None = None
    category_id: uuid.UUID | None = None
    thumbnail_url: str | None = None
    demo_video_url: str | None = None

    @model_validator(mode="after")
    def auto_slug(self) -> CourseUpdate:
        if self.slug == "":
            self.slug = None
        return self


class CourseRead(TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    slug: str
    short_description: str | None = None
    description: str | None = None
    thumbnail_key: str | None = None
    thumbnail_url: str | None = None
    demo_video_key: str | None = None
    demo_video_url: str | None = None
    whatsapp_channel_url: str | None = None
    level: CourseLevel
    language: str
    price: Decimal
    # discount_price: Decimal | None = None
    # badge: str | None = None
    welcome_message: str | None = None
    what_you_will_learn: list[str] | None = None
    requirements: list[str] | None = None
    total_duration_seconds: int = 0
    is_featured: bool = False
    is_published: bool = False
    category_id: uuid.UUID | None = None
    category: CourseCategoryRead | None = None
    average_rating: float = 0.0
    review_count: int = 0
    lessons_count: int = 0
    enrollment_count: int = 0

    @computed_field
    @property
    def computed_thumbnail_url(self) -> str | None:
        if self.thumbnail_key:
            base = f"{settings.S3_PUBLIC_URL}/{settings.S3_BUCKET_NAME}"
            return f"{base}/{self.thumbnail_key}"
        return self.thumbnail_url

    @computed_field
    @property
    def computed_demo_video_url(self) -> str | None:
        if self.demo_video_key:
            base = f"{settings.S3_PUBLIC_URL}/{settings.S3_BUCKET_NAME}"
            return f"{base}/{self.demo_video_key}"
        return self.demo_video_url


class CourseListRead(CourseRead):
    pass


class CourseCurriculumRead(CourseRead):
    sections: list[CourseSectionWithLessonsRead] = []


class CourseStatsRead(BaseModel):
    enrollment_count: int
    total_revenue: Decimal
