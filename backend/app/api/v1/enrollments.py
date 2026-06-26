from __future__ import annotations

import uuid

from fastapi import APIRouter

from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.crud.course import crud_course as crud_course_enroll
from app.schemas.course import CourseRead
from app.schemas.course_enrollment import CourseEnrollmentCreate, CourseEnrollmentRead
from app.schemas.responses import SuccessResponse
from app.services.email.email import send_course_purchase_email
from app.services.enrollment_service import enrollment_service

router = APIRouter(prefix="/enrollments", tags=["enrollments"])


@router.post("", response_model=SuccessResponse[CourseEnrollmentRead])
async def enroll_in_course(
    payload: CourseEnrollmentCreate,
    session: DatabaseDep,
    current_user: CurrentUserDep,
):
    enrollment = await enrollment_service.enroll(
        session=session,
        user_id=current_user.id,
        course_id=payload.course_id,
    )

    try:
        course = await crud_course_enroll.get(
            db=session,
            id=payload.course_id,
            schema_to_select=CourseRead,
            return_as_model=True,
        )
        if course:
            await send_course_purchase_email(
                user=current_user,
                course_title=course.title,
                course_slug=course.slug,
            )
    except Exception:
        pass

    return SuccessResponse(message="Enrolled successfully", data=enrollment)


@router.get("", response_model=SuccessResponse[list[CourseEnrollmentRead]])
async def list_my_enrollments(
    session: DatabaseDep,
    current_user: CurrentUserDep,
):
    enrollments = await enrollment_service.list_user_enrollments(
        session=session, user_id=current_user.id
    )
    return SuccessResponse(
        message="Enrollments retrieved successfully", data=enrollments["data"]
    )


@router.get("/{course_id}", response_model=SuccessResponse[CourseEnrollmentRead])
async def get_enrollment_status(
    course_id: uuid.UUID,
    session: DatabaseDep,
    current_user: CurrentUserDep,
):
    enrollment = await enrollment_service.get_user_course_enrollment(
        session=session,
        user_id=current_user.id,
        course_id=course_id,
    )
    return SuccessResponse(message="Enrollment status retrieved", data=enrollment)


@router.delete("/{course_id}", response_model=SuccessResponse[None])
async def unenroll_from_course(
    course_id: uuid.UUID,
    session: DatabaseDep,
    current_user: CurrentUserDep,
):
    await enrollment_service.unenroll(
        session=session,
        user_id=current_user.id,
        course_id=course_id,
    )
    return SuccessResponse(message="Unenrolled successfully")
