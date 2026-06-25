from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.schema import TimestampSchemaRead
from app.models.review import ReviewStatus, ReviewType


class ReviewBase(BaseModel):
    type: ReviewType
    entity_id: UUID
    rating: Decimal = Field(..., ge=0, le=5)
    text: str = Field(..., min_length=1, max_length=1000)

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: Decimal) -> Decimal:
        if v < 0 or v > 5:
            raise ValueError("Rating must be between 0 and 5")
        return v.quantize(Decimal("0.1"))


class ReviewCreate(BaseModel):
    rating: Decimal = Field(..., ge=0, le=5)
    text: str = Field(..., min_length=1, max_length=1000)

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: Decimal) -> Decimal:
        if v < 0 or v > 5:
            raise ValueError("Rating must be between 0 and 5")
        return v.quantize(Decimal("0.1"))


class ReviewUpdate(BaseModel):
    rating: Decimal | None = Field(None, ge=0, le=5)
    text: str | None = Field(None, min_length=1, max_length=1000)
    status: ReviewStatus | None = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: Decimal) -> Decimal:
        if v is not None and (v < 0 or v > 5):
            raise ValueError("Rating must be between 0 and 5")
        return v.quantize(Decimal("0.1")) if v is not None else v


class ReviewUserInfo(BaseModel):
    id: UUID
    name: str | None = None
    avatar: str | None = None

    model_config = {"from_attributes": True}


class ReviewRead(ReviewBase, TimestampSchemaRead):
    model_config = {"from_attributes": True}

    id: UUID
    user_id: UUID
    status: ReviewStatus


class ReviewReadPublic(TimestampSchemaRead):
    model_config = {"from_attributes": True}

    id: UUID
    rating: Decimal
    text: str
    user: ReviewUserInfo | None = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: Decimal) -> Decimal:
        if v < 0 or v > 5:
            raise ValueError("Rating must be between 0 and 5")
        return v.quantize(Decimal("0.1"))


class ReviewCreateDB(ReviewBase):
    user_id: UUID
    status: ReviewStatus = ReviewStatus.ACTIVE

    model_config = {"from_attributes": True}
