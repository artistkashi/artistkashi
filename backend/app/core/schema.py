# -------------- mixins --------------
import re
import uuid
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_serializer


def slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


class UUIDSchema(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    model_config = ConfigDict(from_attributes=True)


class TimestampSchema(BaseModel):
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime | None = Field(default=None)

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def serialize_dt(self, created_at: datetime | None, _info: Any) -> str | None:
        if created_at is not None:
            return created_at.isoformat()

        return None

    @field_serializer("updated_at")
    def serialize_updated_at(
        self, updated_at: datetime | None, _info: Any
    ) -> str | None:
        if updated_at is not None:
            return updated_at.isoformat()

        return None


class TimestampSchemaRead(BaseModel):
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PersistentDeletion(BaseModel):
    deleted_at: datetime | None = Field(default=None)
    is_deleted: bool = False

    @field_serializer("deleted_at")
    def serialize_dates(self, deleted_at: datetime | None, _info: Any) -> str | None:
        if deleted_at is not None:
            return deleted_at.isoformat()

        return None
