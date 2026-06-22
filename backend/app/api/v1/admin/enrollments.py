from __future__ import annotations

import uuid

from fastapi import APIRouter, Query

from app.api.dependencies import DatabaseDep
from app.crud.course import crud_course_enrollment
from app.schemas.course_enrollment import CourseEnrollmentCreate, CourseEnrollmentRead
from app.schemas.responses import SuccessResponse
from app.services.enrollment_service import enrollment_service

router = APIRouter(prefix="/enrollments", tags=["admin-enrollments"])


@router.get("", response_model=SuccessResponse[list[CourseEnrollmentRead]])
async def list_enrollments(
    session: DatabaseDep,
    course_id: uuid.UUID | None = Query(None),
    user_id: uuid.UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
):
    filters: dict = {}
    if course_id:
        filters["course_id"] = course_id
    if user_id:
        filters["user_id"] = user_id

    result = await crud_course_enrollment.get_multi(
        db=session,
        offset=(page - 1) * page_size,
        limit=page_size,
        sort_columns=["created_at"],
        sort_orders=["desc"],
        return_total_count=True,
        **filters,
    )

    return SuccessResponse(
        message="Enrollments retrieved successfully",
        data=[CourseEnrollmentRead.model_validate(e) for e in result["data"]],
    )


@router.post("", response_model=SuccessResponse[CourseEnrollmentRead])
async def admin_enroll_user(
    payload: CourseEnrollmentCreate,
    session: DatabaseDep,
):
    enrollment = await enrollment_service.enroll(
        session=session,
        user_id=payload.user_id,
        course_id=payload.course_id,
    )
    return SuccessResponse(message="User enrolled successfully", data=enrollment)


@router.get("/{enrollment_id}", response_model=SuccessResponse[CourseEnrollmentRead])
async def get_enrollment(
    enrollment_id: uuid.UUID,
    session: DatabaseDep,
):
    enrollment = await enrollment_service.get_enrollment(
        session=session, enrollment_id=enrollment_id
    )
    return SuccessResponse(message="Enrollment retrieved successfully", data=enrollment)


@router.delete("/{enrollment_id}", response_model=SuccessResponse[None])
async def delete_enrollment(
    enrollment_id: uuid.UUID,
    session: DatabaseDep,
):
    enrollment = await enrollment_service.get_enrollment(
        session=session, enrollment_id=enrollment_id
    )
    await enrollment_service.unenroll(
        session=session,
        user_id=enrollment.user_id,
        course_id=enrollment.course_id,
    )
    return SuccessResponse(message="Enrollment removed successfully")
