from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Query

from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.core.auth.lms_guards import require_enrollment
from app.models.lesson_progress import ProgressStatus
from app.models.user import Role
from app.schemas.lesson_progress import (
    CourseProgressRead,
    LessonProgressDetail,
    LessonProgressRead,
    LessonProgressUpdate,
)
from app.schemas.responses import SuccessResponse
from app.services.lesson_service import lesson_service
from app.services.progress_service import progress_service

router = APIRouter(tags=["progress"])


@router.get(
    "/courses/{course_id}/lessons/progress",
    response_model=SuccessResponse[dict[str, str]]
)
async def get_all_lesson_progresses(
    course_id: uuid.UUID, session: DatabaseDep, current_user: CurrentUserDep
):
    await require_enrollment(
        course_id=course_id, session=session, current_user=current_user
    )

    progresses = await progress_service.get_all_lesson_progresses(
        session=session, user_id=current_user.id, course_id=course_id
    )

    return SuccessResponse(
        message="Lesson progresses retrieved successfully", data=progresses
    )


@router.put(
    "/courses/{course_id}/lessons/{lesson_id}/progress",
    response_model=SuccessResponse[LessonProgressDetail],
)
async def update_lesson_progress(
    course_id: uuid.UUID,
    lesson_id: uuid.UUID,
    payload: LessonProgressUpdate,
    session: DatabaseDep,
    current_user: CurrentUserDep,
):
    lesson = await lesson_service.get_lesson(session=session, lesson_id=lesson_id)
    if not lesson.is_preview:
        await require_enrollment(
            course_id=course_id, session=session, current_user=current_user
        )

    progress = await progress_service.create_or_update_progress(
        session=session,
        user_id=current_user.id,
        lesson_id=lesson_id,
        payload=payload,
        is_admin=current_user.role == Role.ADMIN,
    )

    percentage = await progress_service.get_lesson_progress_percentage(
        session=session, user_id=current_user.id, lesson_id=lesson_id
    )

    return SuccessResponse(
        message="Progress updated successfully",
        data=LessonProgressDetail(progress=progress, progress_percentage=percentage),
    )


@router.get(
    "/courses/{course_id}/lessons/{lesson_id}/progress",
    response_model=SuccessResponse[LessonProgressDetail]
)
async def get_lesson_progress(
    course_id: uuid.UUID,
    lesson_id: uuid.UUID,
    session: DatabaseDep,
    current_user: CurrentUserDep,
):
    lesson = await lesson_service.get_lesson(session=session, lesson_id=lesson_id)
    if not lesson.is_preview:
        await require_enrollment(
            course_id=course_id, session=session, current_user=current_user
        )

    progress = await progress_service.get_progress_or_none(
        session=session,
        user_id=current_user.id,
        lesson_id=lesson_id
    )

    percentage = await progress_service.get_lesson_progress_percentage(
        session=session,
        user_id=current_user.id,
        lesson_id=lesson_id
    )

    if not progress:
        progress = LessonProgressRead(
            id=uuid.uuid4(),
            user_id=current_user.id,
            lesson_id=lesson_id,
            status=ProgressStatus.NOT_STARTED,
            watch_seconds=0,
            resume_position_seconds=0,
            created_at=datetime.now(UTC),
        )

    return SuccessResponse(
        message="Progress retrieved successfully",
        data=LessonProgressDetail(
            progress=progress,
            progress_percentage=percentage,
        ),
    )


@router.get(
    "/courses/{course_id}/progress", response_model=SuccessResponse[CourseProgressRead]
)
async def get_course_progress(
    course_id: uuid.UUID,
    session: DatabaseDep,
    current_user: CurrentUserDep,
):
    await require_enrollment(
        course_id=course_id, session=session, current_user=current_user
    )

    progress = await progress_service.get_course_progress(
        session=session,
        user_id=current_user.id,
        course_id=course_id,
    )

    return SuccessResponse(
        message="Course progress retrieved successfully",
        data=progress,
    )


@router.get(
    "/progress/continue-watching",
    response_model=SuccessResponse[list[LessonProgressRead]],
)
async def continue_watching(
    session: DatabaseDep,
    current_user: CurrentUserDep,
    limit: int = Query(5, ge=1, le=20),
):
    items = await progress_service.get_continue_watching(
        session=session,
        user_id=current_user.id,
        limit=limit,
    )

    return SuccessResponse(
        message="Continue watching items retrieved successfully",
        data=items,
    )
