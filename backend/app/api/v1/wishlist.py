from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.core.exceptions import ErrorCode, NotFoundException
from app.crud.wishlist import crud_wishlist
from app.models.product import Product
from app.models.wishlist import Wishlist
from app.schemas.product import ProductCardRead, ProductMediumRead, ProductCategoryRead
from app.schemas.responses import SuccessResponse
from app.schemas.wishlist import WishlistCreate, WishlistCreateDB, WishlistRead

router = APIRouter(tags=["wishlist"], prefix="/wishlist")


@router.get("", response_model=SuccessResponse[list[WishlistRead]])
async def get_my_wishlist(user: CurrentUserDep, db: DatabaseDep) -> SuccessResponse:
    stmt = (
        select(Wishlist)
        .options(
            selectinload(Wishlist.product).selectinload(Product.variants),
            selectinload(Wishlist.product).selectinload(Product.images),
            selectinload(Wishlist.product).selectinload(Product.medium),
            selectinload(Wishlist.product).selectinload(Product.category),
            selectinload(Wishlist.course),
        )
        .where(Wishlist.user_id == user.id)
        .order_by(Wishlist.created_at.desc())
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
                medium=ProductMediumRead.model_validate(item.product.medium) if item.product.medium else None,
                category=ProductCategoryRead.model_validate(item.product.category) if item.product.category else None,
                status=item.product.status,
                price=default_variant.price if default_variant else 0,
                primary_image=primary_image.image_url if primary_image else None,
            )

        course_read = item.course if item.course else None

        data.append(
            WishlistRead(
                id=item.id,
                user_id=item.user_id,
                product_id=item.product_id,
                course_id=item.course_id,
                product=product_read,
                course=course_read,
            )
        )

    return SuccessResponse(message="Wishlist retrieved successfully", data=data)


@router.post("", response_model=SuccessResponse[WishlistRead])
async def add_to_wishlist(
    item_in: WishlistCreate, user: CurrentUserDep, db: DatabaseDep
) -> SuccessResponse:
    # Check if already in wishlist
    existing = await crud_wishlist.get(
        db=db,
        user_id=user.id,
        product_id=item_in.product_id,
        course_id=item_in.course_id,
        schema_to_select=WishlistRead,
        return_as_model=True,
    )
    if existing:
        return SuccessResponse(message="Item already in wishlist", data=existing)

    item = await crud_wishlist.create(
        db=db, object=WishlistCreateDB(**item_in.model_dump(), user_id=user.id)
    )
    return SuccessResponse(message="Item added to wishlist", data=item)


@router.delete("/{item_id}", response_model=SuccessResponse[None])
async def remove_from_wishlist(
    item_id: int, user: CurrentUserDep, db: DatabaseDep
) -> SuccessResponse:
    item = await crud_wishlist.get(db=db, id=item_id, user_id=user.id)
    if not item:
        raise NotFoundException(
            resource="Wishlist item",
            identifier=item_id,
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
        )

    await crud_wishlist.delete(db=db, id=item_id)
    return SuccessResponse(message="Item removed from wishlist")
