from typing import Annotated

from fastapi import APIRouter, File, Form, Query, UploadFile
from pydantic import Json

from app.api.dependencies import DatabaseDep
from app.core.pagination import build_paginated_response
from app.models.product import ProductStatus
from app.schemas.product import (
    ProductBase,
    ProductCardRead,
    ProductCreateRequest,
    ProductDetailRead,
    ProductUpdate,
    ProductUpdateRequest,
)
from app.schemas.responses import PaginatedResponse, SuccessResponse
from app.services.product_service import product_service

router = APIRouter(tags=["Products"])


@router.post("", response_model=SuccessResponse[ProductDetailRead])
async def create_product(
    session: DatabaseDep,
    payload: Annotated[Json[ProductCreateRequest], Form()],
    files: list[UploadFile] | None = File(None),
):
    result = await product_service.create_product_complete(
        session=session,
        payload=payload,
        files=files or [],
    )
    return SuccessResponse(message="Product created successfully", data=result)


@router.get("", response_model=PaginatedResponse[ProductCardRead])
async def list_products(
    session: DatabaseDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    category_id: int | None = None,
    is_featured: bool | None = None,
):
    products = await product_service.list_products(
        session=session,
        page=page,
        page_size=page_size,
        category_id=category_id,
        search=search,
        is_featured=is_featured,
    )

    return build_paginated_response(
        result=products,
        page=page,
        page_size=page_size,
        message="Products retrieved successfully",
    )


@router.get("/featured", response_model=PaginatedResponse[ProductCardRead])
async def featured_products(
    session: DatabaseDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    search: str | None = None,
):
    products = await product_service.list_products(
        session=session, page=page, page_size=page_size, search=search, is_featured=True
    )

    return build_paginated_response(
        result=products,
        page=page,
        page_size=page_size,
        message="Featured products retrieved successfully",
    )


@router.get("/search", response_model=PaginatedResponse[ProductCardRead])
async def search_products(
    q: str,
    session: DatabaseDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    products = await product_service.list_products(
        session=session, search=q, page=page, page_size=page_size
    )

    return build_paginated_response(
        result=products,
        page=page,
        page_size=page_size,
        message="Products retrieved successfully",
    )


@router.get("/slug/{slug}", response_model=SuccessResponse[ProductDetailRead])
async def get_product_by_slug(slug: str, session: DatabaseDep):
    product = await product_service.get_product_detail(
        session=session, slug=slug, check=True
    )

    return SuccessResponse(message="Product retrieved successfully", data=product)


@router.get("/{product_id}", response_model=SuccessResponse[ProductDetailRead])
async def get_product(product_id: int, session: DatabaseDep):
    product = await product_service.get_product_detail(
        session=session, product_id=product_id, check=True
    )

    return SuccessResponse(message="Product retrieved successfully", data=product)


@router.put(
    "/{product_id}",
    response_model=SuccessResponse[ProductDetailRead],
)
async def update_product(
    product_id: int,
    session: DatabaseDep,
    payload: Annotated[Json[ProductUpdateRequest], Form()],
    files: list[UploadFile] | None = File(None),
):
    result = await product_service.update_product_complete(
        session=session,
        product_id=product_id,
        payload=payload,  # already a validated ProductUpdateRequest
        files=files or [],
    )

    return SuccessResponse(
        message="Product updated successfully",
        data=result,
    )


@router.patch("/{product_id}/publish", response_model=SuccessResponse[ProductBase])
async def publish_product(product_id: int, session: DatabaseDep):
    product = await product_service.update_product(
        session=session,
        product_id=product_id,
        payload=ProductUpdate(status=ProductStatus.PUBLISHED),
    )

    return SuccessResponse(message="Product published successfully", data=product)


@router.patch("/{product_id}/archive", response_model=SuccessResponse[ProductBase])
async def archive_product(product_id: int, session: DatabaseDep):
    product = await product_service.update_product(
        session=session,
        product_id=product_id,
        payload=ProductUpdate(status=ProductStatus.ARCHIVED),
    )

    return SuccessResponse(message="Product archived successfully", data=product)


@router.delete("/{product_id}", response_model=SuccessResponse[None])
async def delete_product(product_id: int, session: DatabaseDep):
    await product_service.delete_product(session=session, product_id=product_id)

    return SuccessResponse(message="Product deleted successfully")
