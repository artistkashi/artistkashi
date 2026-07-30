import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies import CurrentUserOptionalDep, DatabaseDep
from app.core.exceptions import ErrorCode, NotFoundException
from app.core.pagination import build_paginated_response
from app.models.product import ProductStatus
from app.schemas.product import ProductCardRead, ProductDetailRead
from app.schemas.responses import PaginatedResponse, SuccessResponse
from app.services.product_service import (
    product_service,
)

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=PaginatedResponse[ProductCardRead])
async def list_products(
    session: DatabaseDep,
    user: CurrentUserOptionalDep = None,
    page: int = 1,
    page_size: int = 20,
):
    products = await product_service.list_published_products(
        session=session,
        page=page,
        page_size=page_size,
        user_id=user.id if user else None,
    )

    return build_paginated_response(
        result=products, page=page, page_size=page_size, message="Products retrieved"
    )


@router.get("/by-ids", response_model=SuccessResponse[list[ProductCardRead]])
async def get_products_by_ids(
    ids: Annotated[list[uuid.UUID], Query()],
    session: DatabaseDep,
    user: CurrentUserOptionalDep = None,
):
    products = await product_service.get_published_products_by_ids(
        session=session,
        ids=ids,
        user_id=user.id if user else None,
    )
    return SuccessResponse(message="Products retrieved", data=products)


@router.get("/{slug}", response_model=SuccessResponse[ProductDetailRead])
async def get_product(
    slug: str,
    session: DatabaseDep,
    user: CurrentUserOptionalDep = None,
):
    product = await product_service.get_product_detail(
        session=session,
        slug=slug,
        status=ProductStatus.PUBLISHED,
        check=False,
        user_id=user.id if user else None,
    )

    if not product:
        raise NotFoundException(
            resource="Product",
            identifier=slug,
            error_code=ErrorCode.PRODUCT_NOT_FOUND,
        )

    return SuccessResponse(message="Product retrieved", data=product)
