from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.core.exceptions import (
    ConflictException,
    ErrorCode,
    ForbiddenException,
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
from app.services.course_service import course_service
from app.services.enrollment_service import enrollment_service
from app.services.review_service import review_service

router = APIRouter(tags=["course-reviews"])


@router.get(
    "/courses/{slug}/reviews",
    response_model=PaginatedResponse[ReviewReadPublic],
)
async def list_course_reviews(
    slug: str,
    session: DatabaseDep,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    course = await course_service.get_course(
        session=session,
        slug=slug,
        check=True,
    )

    result = await review_service.get_reviews(
        session=session,
        review_type=ReviewType.COURSE,
        entity_id=course.id,
        page=page,
        page_size=page_size,
    )


    return build_paginated_response(
        result=result,
        page=page,
        page_size=page_size,
        message="Course reviews retrieved successfully",
    )


@router.post(
    "/courses/{slug}/reviews",
    response_model=SuccessResponse[ReviewRead],
)
async def create_course_review(
    slug: str,
    payload: ReviewCreate,
    user: CurrentUserDep,
    session: DatabaseDep,
):
    course = await course_service.get_course(
        session=session,
        slug=slug,
        check=True,
    )

    if not await enrollment_service.is_enrolled(
        session=session,
        user_id=user.id,
        course_id=course.id,
    ):
        raise ForbiddenException(
            message="Only enrolled users can review this course",
            error_code=ErrorCode.NOT_ENROLLED,
        )

    existing = await review_service.get_review(
        session=session,
        user_id=user.id,
        review_type=ReviewType.COURSE,
        entity_id=course.id,
    )

    if existing:
        raise ConflictException(
            message="You have already reviewed this course",
            error_code=ErrorCode.REVIEW_ALREADY_EXISTS,
        )

    review = await review_service.create_review(
        session=session,
        user_id=user.id,
        review_type=ReviewType.COURSE,
        entity_id=course.id,
        rating=payload.rating,
        text=payload.text,
    )

    return SuccessResponse(
        message="Course review created successfully",
        data=review,
    )


@router.get(
    "/courses/{slug}/reviews/my-review",
    response_model=SuccessResponse[ReviewRead | None],
)
async def get_my_course_review(
    slug: str,
    user: CurrentUserDep,
    session: DatabaseDep,
):
    course = await course_service.get_course(
        session=session,
        slug=slug,
        check=True,
    )

    review = await review_service.get_review(
        session=session,
        user_id=user.id,
        review_type=ReviewType.COURSE,
        entity_id=course.id,
    )

    return SuccessResponse(
        message="Your review retrieved successfully",
        data=review,
    )


@router.put(
    "/courses/{slug}/reviews/my-review",
    response_model=SuccessResponse[ReviewRead],
)
async def update_course_review(
    slug: str,
    payload: ReviewUpdate,
    user: CurrentUserDep,
    session: DatabaseDep,
):
    course = await course_service.get_course(
        session=session,
        slug=slug,
        check=True,
    )

    review = await review_service.get_review(
        session=session,
        user_id=user.id,
        review_type=ReviewType.COURSE,
        entity_id=course.id,
    )

    if not review:
        raise NotFoundException(
            resource="Review",
            identifier=str(course.id),
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
        message="Course review updated successfully",
        data=updated,
    )


@router.delete(
    "/courses/{slug}/reviews/my-review",
    response_model=SuccessResponse[None],
)
async def delete_course_review(
    slug: str,
    user: CurrentUserDep,
    session: DatabaseDep,
):
    """Delete the current user's review for a course."""
    course = await course_service.get_course(
        session=session,
        slug=slug,
        check=True,
    )

    review = await review_service.get_review(
        session=session,
        user_id=user.id,
        review_type=ReviewType.COURSE,
        entity_id=course.id,
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
        message="Course review deleted successfully",
        data=None,
    )
