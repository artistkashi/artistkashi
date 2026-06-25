import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas.course import CourseRead
from app.schemas.product import ProductCardRead


class WishlistBase(BaseModel):
    product_id: uuid.UUID | None = None
    course_id: uuid.UUID | None = None


class WishlistCreate(WishlistBase):
    pass


class WishlistCreateDB(WishlistBase):
    user_id: uuid.UUID


class WishlistRead(WishlistBase):
    id: int
    user_id: uuid.UUID
    product: ProductCardRead | None = None
    course: CourseRead | None = None

    model_config = ConfigDict(from_attributes=True)


class WishlistProductId(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    product_id: uuid.UUID
