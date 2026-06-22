from __future__ import annotations

import uuid

from app.api.dependencies import (
    CurrentUserDep,
    CurrentUserOptionalDep,
    DatabaseDep,
)
from app.core.exceptions import ErrorCode, ForbiddenException
from app.models.user import Role
from app.services.course_service import course_service
from app.services.enrollment_service import enrollment_service
from app.services.lesson_service import lesson_service


async def verify_course_access(
    course_id: uuid.UUID,
    session: DatabaseDep,
    current_user: CurrentUserOptionalDep,
) -> None:
    course = await course_service.get_course(session=session, course_id=course_id)

    if current_user and current_user.role == Role.ADMIN:
        return

    if current_user and await enrollment_service.is_enrolled(
        session=session,
        user_id=current_user.id,
        course_id=course_id,
    ):
        return

    if course.is_published:
        raise ForbiddenException(
            message="Enrollment required to access this course",
            error_code=ErrorCode.NOT_ENROLLED,
        )

    raise ForbiddenException(
        message="Course not available",
        error_code=ErrorCode.COURSE_NOT_PUBLISHED,
    )


async def verify_lesson_access(
    lesson_id: uuid.UUID,
    session: DatabaseDep,
    current_user: CurrentUserOptionalDep,
) -> None:
    lesson = await lesson_service.get_lesson(session=session, lesson_id=lesson_id)

    if lesson.is_preview:
        return

    if current_user and current_user.role == Role.ADMIN:
        return

    if current_user and await enrollment_service.is_enrolled(
        session=session,
        user_id=current_user.id,
        course_id=lesson.course_id,
    ):
        return

    raise ForbiddenException(
        message="Enrollment required to access this lesson",
        error_code=ErrorCode.NOT_ENROLLED,
    )


async def require_enrollment(
    course_id: uuid.UUID,
    session: DatabaseDep,
    current_user: CurrentUserDep,
) -> None:
    if current_user.role == Role.ADMIN:
        return

    if not await enrollment_service.is_enrolled(
        session=session,
        user_id=current_user.id,
        course_id=course_id,
    ):
        raise ForbiddenException(
            message="Enrollment required",
            error_code=ErrorCode.NOT_ENROLLED,
        )
