from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies import CurrentUserDep, CurrentUserOptionalDep, DatabaseDep
from app.core.exceptions import (
    ConflictException,
    ErrorCode,
    NotFoundException,
)
from app.core.pagination import build_paginated_response
from app.models.review import ReviewType
from app.schemas.responses import PaginatedResponse, SuccessResponse
from app.schemas.review import (
    ReviewCreate,
    ReviewRead,
    ReviewReadPublic,
    ReviewUpdate,
)
from app.services.product_service import product_service
from app.services.review_service import review_service

router = APIRouter(tags=["product-reviews"])


@router.get(
    "/products/{product_id}/reviews",
    response_model=PaginatedResponse[ReviewReadPublic],
)
async def list_product_reviews(
    product_id: str,
    session: DatabaseDep,
    user: CurrentUserOptionalDep = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    rating: Annotated[int | None, Query(ge=1, le=5)] = None,
    sort_by: Annotated[str | None, Query(pattern="^(created_at|rating)$")] = None,
    sort_order: Annotated[str | None, Query(pattern="^(asc|desc)$")] = None,
):
    print(product_id, "SLUGGGG")
    # product = await product_service.get_product_detail(
    #     session=session,
    #     slug=slug,
    #     check=True,
    # )

    result = await review_service.get_reviews(
        session=session,
        review_type=ReviewType.PRODUCT,
        entity_id=product_id,
        page=page,
        page_size=page_size,
        rating=rating,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    return build_paginated_response(
        result=result,
        page=page,
        page_size=page_size,
        message="Product reviews retrieved successfully",
    )


@router.post(
    "/products/{slug}/reviews",
    response_model=SuccessResponse[ReviewRead],
)
async def create_product_review(
    slug: str,
    payload: ReviewCreate,
    user: CurrentUserDep,
    session: DatabaseDep,
):
    product = await product_service.get_product_detail(
        session=session,
        slug=slug,
        check=True,
    )

    # Check if user has purchased the product
    # TODO: Implement purchase check for products

    existing = await review_service.get_review(
        session=session,
        user_id=user.id,
        review_type=ReviewType.PRODUCT,
        entity_id=product.id,
    )

    if existing:
        raise ConflictException(
            message="You have already reviewed this product",
            error_code=ErrorCode.REVIEW_ALREADY_EXISTS,
        )

    review = await review_service.create_review(
        session=session,
        user_id=user.id,
        review_type=ReviewType.PRODUCT,
        entity_id=product.id,
        rating=payload.rating,
        text=payload.text,
    )

    return SuccessResponse(
        message="Product review created successfully",
        data=review,
    )


@router.get(
    "/products/{slug}/reviews/my-review",
    response_model=SuccessResponse[ReviewRead | None],
)
async def get_my_product_review(
    slug: str,
    user: CurrentUserDep,
    session: DatabaseDep,
):
    product = await product_service.get_product_detail(
        session=session,
        slug=slug,
        check=True,
    )

    review = await review_service.get_review(
        session=session,
        user_id=user.id,
        review_type=ReviewType.PRODUCT,
        entity_id=product.id,
    )

    return SuccessResponse(
        message="Your review retrieved successfully",
        data=review,
    )


@router.put(
    "/products/{slug}/reviews/my-review",
    response_model=SuccessResponse[ReviewRead],
)
async def update_product_review(
    slug: str,
    payload: ReviewUpdate,
    user: CurrentUserDep,
    session: DatabaseDep,
):
    product = await product_service.get_product_detail(
        session=session,
        slug=slug,
        check=True,
    )

    review = await review_service.get_review(
        session=session,
        user_id=user.id,
        review_type=ReviewType.PRODUCT,
        entity_id=product.id,
    )

    if not review:
        raise NotFoundException(
            resource="Review",
            identifier=str(product.id),
            error_code=ErrorCode.REVIEW_NOT_FOUND,
        )

    updated = await review_service.update_review(
        session=session,
        review_id=review.id,
        update_data=payload.model_dump(
            exclude_unset=True,
            mode="python",
        ),
    )

    return SuccessResponse(
        message="Product review updated successfully",
        data=updated,
    )


@router.delete(
    "/products/{slug}/reviews/my-review",
    response_model=SuccessResponse[None],
)
async def delete_product_review(
    slug: str,
    user: CurrentUserDep,
    session: DatabaseDep,
):
    product = await product_service.get_product_detail(
        session=session,
        slug=slug,
        check=True,
    )

    review = await review_service.get_review(
        session=session,
        user_id=user.id,
        review_type=ReviewType.PRODUCT,
        entity_id=product.id,
    )

    if not review:
        raise NotFoundException(
            resource="Review",
            error_code=ErrorCode.REVIEW_NOT_FOUND,
        )

    await review_service.delete_review(
        session=session,
        review_id=review.id,
    )

    return SuccessResponse(
        message="Product review deleted successfully",
        data=None,
    )
