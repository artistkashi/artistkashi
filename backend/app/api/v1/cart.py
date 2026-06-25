from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.core.exceptions import ErrorCode, NotFoundException
from app.crud.cart import crud_cart
from app.models.cart import CartItem
from app.models.product import Product
from app.schemas.cart import (
    CartItemCreate,
    CartItemDB,
    CartItemRead,
    CartItemUpdate,
    ClearCartRequest,
)
from app.schemas.product import (
    ProductCardRead,
    ProductCategoryRead,
    ProductMediumRead,
    ProductVariantRead,
)
from app.schemas.responses import SuccessResponse

router = APIRouter(tags=["cart"], prefix="/cart")


@router.get("", response_model=SuccessResponse[list[CartItemRead]])
async def get_my_cart(user: CurrentUserDep, db: DatabaseDep) -> SuccessResponse:
    stmt = (
        select(CartItem)
        .options(
            selectinload(CartItem.product).selectinload(Product.variants),
            selectinload(CartItem.product).selectinload(Product.images),
            selectinload(CartItem.product).selectinload(Product.medium),
            selectinload(CartItem.product).selectinload(Product.category),
            selectinload(CartItem.variant),
            selectinload(CartItem.course),
        )
        .where(CartItem.user_id == user.id)
        .order_by(CartItem.created_at.desc())
    )
    result = await db.execute(stmt)
    items = result.scalars().all()

    data = []
    for item in items:
        product_read = None
        if item.product:
            default_variant = next(
                (v for v in item.product.variants if v.is_default),
                item.product.variants[0] if item.product.variants else None,
            )
            primary_image = next(
                (img for img in item.product.images if img.is_primary),
                item.product.images[0] if item.product.images else None,
            )
            product_read = ProductCardRead(
                id=item.product.id,
                title=item.product.title,
                slug=item.product.slug,
                short_description=item.product.short_description,
                is_original_available=item.product.is_original_available,
                medium=ProductMediumRead.model_validate(item.product.medium)
                if item.product.medium
                else None,
                category=ProductCategoryRead.model_validate(item.product.category)
                if item.product.category
                else None,
                status=item.product.status,
                price=default_variant.price if default_variant else 0,
                primary_image=primary_image.image_url if primary_image else None,
            )

        data.append(
            CartItemRead(
                id=item.id,
                user_id=item.user_id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                course_id=item.course_id,
                quantity=item.quantity,
                product=product_read,
                variant=ProductVariantRead.model_validate(item.variant)
                if item.variant
                else None,
                course=item.course,
            )
        )

    return SuccessResponse(message="Cart retrieved successfully", data=data)


@router.post("", response_model=SuccessResponse[CartItemRead])
async def add_to_cart(
    item_in: CartItemCreate, user: CurrentUserDep, db: DatabaseDep
) -> SuccessResponse:
    filters = {"user_id": user.id}
    if item_in.product_id:
        filters["product_id"] = item_in.product_id
        if item_in.variant_id:
            filters["variant_id"] = item_in.variant_id
    if item_in.course_id:
        filters["course_id"] = item_in.course_id

    existing = await crud_cart.get(db=db, **filters)
    if existing:
        updated = await crud_cart.update(
            db=db,
            id=existing.id,
            object=CartItemUpdate(quantity=existing.quantity + item_in.quantity),
        )
        return SuccessResponse(message="Cart item quantity updated", data=updated)

    item = await crud_cart.create(
        db=db,
        object=CartItemDB(**item_in.model_dump(), user_id=user.id),
        schema_to_select=CartItemRead,
        return_as_model=True,
    )
    return SuccessResponse(message="Item added to cart", data=item)


@router.patch("/{item_id}", response_model=SuccessResponse[CartItemRead])
async def update_cart_item(
    item_id: int, item_in: CartItemUpdate, user: CurrentUserDep, db: DatabaseDep
) -> SuccessResponse:
    item = await crud_cart.get(db=db, id=item_id, user_id=user.id)
    if not item:
        raise NotFoundException(
            resource="Cart item",
            identifier=item_id,
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
        )

    updated = await crud_cart.update(
        db=db,
        id=item_id,
        object=item_in.model_dump(exclude_unset=True),
        schema_to_select=CartItemRead,
        return_as_model=True,
    )
    return SuccessResponse(message="Cart item updated", data=updated)


@router.post("/clear", response_model=SuccessResponse[None])
async def clear_cart(
    body: ClearCartRequest, user: CurrentUserDep, db: DatabaseDep
) -> SuccessResponse:
    await crud_cart.delete(
        db=db,
        allow_multiple=True,
        user_id=user.id,
        id__in=body.item_ids,
    )
    return SuccessResponse(message="Cart cleared")


@router.delete("/{item_id}", response_model=SuccessResponse[None])
async def remove_from_cart(
    item_id: int, user: CurrentUserDep, db: DatabaseDep
) -> SuccessResponse:
    item = await crud_cart.get(db=db, id=item_id, user_id=user.id)
    if not item:
        raise NotFoundException(
            resource="Cart item",
            identifier=item_id,
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
        )

    await crud_cart.delete(db=db, id=item_id)
    return SuccessResponse(message="Item removed from cart")
