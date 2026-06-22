from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.schema import TimestampSchemaRead
from app.models.review import ReviewStatus, ReviewType


class ReviewBase(BaseModel):
    type: ReviewType
    entity_id: UUID
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=1, max_length=1000)


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=1, max_length=1000)


class ReviewCreateDB(ReviewBase):
    user_id: UUID
    status: ReviewStatus = ReviewStatus.ACTIVE


class ReviewUpdate(BaseModel):
    rating: int | None = Field(None, ge=1, le=5)
    text: str | None = Field(None, min_length=1, max_length=1000)
    status: ReviewStatus | None = None


class ReviewUserInfo(BaseModel):
    id: UUID
    name: str | None = None
    avatar: str | None = None


class ReviewRead(ReviewBase, TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    status: ReviewStatus


class ReviewReadPublic(TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: UUID

    rating: int
    text: str

    user: ReviewUserInfo | None = None
