from fastapi import APIRouter

from app.api.dependencies import DatabaseDep
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
async def list_products(session: DatabaseDep, page: int = 1, page_size: int = 20):
    products = await product_service.list_published_products(
        session=session, page=page, page_size=page_size
    )

    return build_paginated_response(
        result=products, page=page, page_size=page_size, message="Products retrieved"
    )


@router.get("/{slug}", response_model=SuccessResponse[ProductDetailRead])
async def get_product(slug: str, session: DatabaseDep):
    product = await product_service.get_product_detail(
        session=session, slug=slug, status=ProductStatus.PUBLISHED, check=False
    )

    if not product:
        raise NotFoundException(
            resource="Product",
            identifier=slug,
            error_code=ErrorCode.PRODUCT_NOT_FOUND,
        )

    return SuccessResponse(message="Product retrieved", data=product)
