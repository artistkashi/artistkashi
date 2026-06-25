import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas.course import CourseRead
from app.schemas.product import ProductCardRead, ProductVariantRead


class CartItemBase(BaseModel):
    product_id: uuid.UUID | None = None
    variant_id: uuid.UUID | None = None
    course_id: uuid.UUID | None = None
    quantity: int = 1


class CartItemCreate(CartItemBase):
    pass


class CartItemDB(CartItemBase):
    user_id: uuid.UUID


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemRead(CartItemBase):
    id: int
    user_id: uuid.UUID
    product: ProductCardRead | None = None
    variant: ProductVariantRead | None = None
    course: CourseRead | None = None

    model_config = ConfigDict(from_attributes=True)


class ClearCartRequest(BaseModel):
    item_ids: list[int]
