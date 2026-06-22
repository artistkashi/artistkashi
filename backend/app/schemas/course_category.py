from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.schema import TimestampSchemaRead, slugify


class CourseCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["Portrait Drawing"])
    slug: str | None = Field(None, max_length=120)
    description: str | None = Field(
        None, examples=["Courses focused on portrait drawing techniques"]
    )
    is_active: bool = True

    @model_validator(mode="after")
    def auto_slug(self) -> CourseCategoryCreate:
        if not self.slug:
            self.slug = slugify(self.name)
        return self


class CourseCategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    slug: str | None = Field(None, max_length=120)
    description: str | None = None
    is_active: bool | None = None


class CourseCategoryRead(TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    is_active: bool = True
