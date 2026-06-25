from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query
from fastcrud import compute_offset

from app.api.dependencies import DatabaseDep
from app.core.exceptions import ErrorCode, NotFoundException
from app.core.pagination import build_paginated_response
from app.crud.review import crud_review
from app.models.review import ReviewStatus, ReviewType
from app.schemas.responses import PaginatedResponse, SuccessResponse
from app.schemas.review import ReviewRead, ReviewUpdate

router = APIRouter(tags=["admin-reviews"])


@router.get("/reviews", response_model=PaginatedResponse[ReviewRead])
async def list_all_reviews(
    db: DatabaseDep,
    review_type: Annotated[ReviewType | None, Query()] = None,
    entity_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[ReviewStatus | None, Query()] = None,
    rating: Annotated[int | None, Query(ge=1, le=5)] = None,
    sort_by: Annotated[str | None, Query(pattern="^(created_at|rating)$")] = None,
    sort_order: Annotated[str | None, Query(pattern="^(asc|desc)$")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
):
    """List all reviews (admin only)."""
    from sqlalchemy import desc, asc

    filters = {}
    if review_type:
        filters["type"] = review_type
    if entity_id is not None:
        filters["entity_id"] = entity_id
    if status:
        filters["status"] = status
    if rating is not None:
        filters["rating"] = rating

    sort_column = "created_at"
    sort_order_value = "desc"
    if sort_by in ("created_at", "rating"):
        sort_column = sort_by
    if sort_order in ("asc", "desc"):
        sort_order_value = sort_order

    reviews_data = await crud_review.get_multi(
        db=db,
        offset=compute_offset(page, page_size),
        limit=page_size,
        return_total_count=True,
        sort_columns=[sort_column],
        sort_orders=[sort_order_value],
        **filters,
    )

    return build_paginated_response(
        result=reviews_data,
        page=page,
        page_size=page_size,
        message="Reviews retrieved successfully",
    )


@router.get("/reviews/{review_id}", response_model=SuccessResponse[ReviewRead])
async def get_review_detail(
    review_id: UUID,
    db: DatabaseDep,
):
    """Get a single review (admin only)."""
    review = await crud_review.get(db=db, id=review_id)
    if not review:
        raise NotFoundException(
            resource="Review",
            identifier=review_id,
            error_code=ErrorCode.REVIEW_NOT_FOUND,
        )
    return SuccessResponse(message="Review retrieved successfully", data=review)


@router.put("/reviews/{review_id}", response_model=SuccessResponse[ReviewRead])
async def update_review(
    review_id: UUID,
    review_in: ReviewUpdate,
    db: DatabaseDep,
):
    """Update review status or content (admin only)."""
    update_data = review_in.model_dump(exclude_unset=True)
    review = await crud_review.update(db=db, id=review_id, object=update_data)
    if not review:
        raise NotFoundException(
            resource="Review",
            identifier=review_id,
            error_code=ErrorCode.REVIEW_NOT_FOUND,
        )
    return SuccessResponse(message="Review updated successfully", data=review)


@router.delete("/reviews/{review_id}", response_model=SuccessResponse[None])
async def delete_review(
    review_id: UUID,
    db: DatabaseDep,
):
    """Delete a review (admin only)."""
    review = await crud_review.get(db=db, id=review_id)
    if not review:
        raise NotFoundException(
            resource="Review",
            identifier=review_id,
            error_code=ErrorCode.REVIEW_NOT_FOUND,
        )

    await crud_review.delete(db=db, id=review_id)
    return SuccessResponse(message="Review deleted successfully")
