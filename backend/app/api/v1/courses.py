from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies import CurrentUserOptionalDep, DatabaseDep
from app.core.auth.lms_guards import verify_lesson_access
from app.core.exceptions import ErrorCode, NotFoundException
from app.schemas.course import CourseCurriculumRead, CourseListRead, CourseRead
from app.schemas.course_lesson import CourseLessonRead, CourseLessonReadWithVideo
from app.schemas.responses import PaginatedResponse, SuccessResponse
from app.services.course_service import course_service
from app.services.lesson_service import lesson_service

router = APIRouter(tags=["courses"])


async def _validate_lesson_course(
    lesson: CourseLessonRead,
    course_id: uuid.UUID,
) -> None:
    if lesson.course_id != course_id:
        raise NotFoundException(
            resource="Lesson",
            identifier=str(lesson.id),
            error_code=ErrorCode.LESSON_NOT_FOUND,
        )


@router.get("/courses", response_model=PaginatedResponse[CourseListRead])
async def list_courses(
    session: DatabaseDep,
    user: CurrentUserOptionalDep = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1)] = 20,
    category: Annotated[str | None, Query(max_length=120)] = None,
    min_price: Annotated[float | None, Query(ge=0)] = None,
    max_price: Annotated[float | None, Query(ge=0)] = None,
):
    result = await course_service.list_courses(
        session=session,
        page=page,
        page_size=page_size,
        is_published=True,
        category_slug=category,
        min_price=min_price,
        max_price=max_price,
        user_id=user.id if user else None,
    )
    return result


@router.get("/courses/by-ids", response_model=SuccessResponse[list[CourseListRead]])
async def get_courses_by_ids(
    ids: Annotated[list[uuid.UUID], Query()],
    session: DatabaseDep,
    user: CurrentUserOptionalDep = None,
):
    courses = await course_service.get_published_courses_by_ids(
        session=session,
        ids=ids,
        user_id=user.id if user else None,
    )
    return SuccessResponse(message="Courses retrieved", data=courses)


@router.get("/courses/{slug}", response_model=SuccessResponse[CourseRead])
async def get_course(slug: str, session: DatabaseDep):
    course = await course_service.get_course(session=session, slug=slug, check=True)
    return SuccessResponse(message="Course retrieved successfully", data=course)


@router.get(
    "/courses/{course_id}/curriculum",
    response_model=SuccessResponse[CourseCurriculumRead],
)
async def get_course_curriculum(
    course_id: uuid.UUID, session: DatabaseDep
):
    course = await course_service.get_course_with_curriculum(
        session=session, course_id=course_id
    )

    return SuccessResponse(
        message="Curriculum retrieved successfully",
        data=course,
    )


@router.get(
    "/courses/{course_id}/lessons/{lesson_id}",
    response_model=SuccessResponse[CourseLessonRead],
)
async def get_lesson(
    course_id: uuid.UUID,
    lesson_id: uuid.UUID,
    session: DatabaseDep,
    current_user: CurrentUserOptionalDep,
):
    await verify_lesson_access(
        lesson_id=lesson_id, session=session, current_user=current_user
    )

    lesson = await lesson_service.get_lesson(session=session, lesson_id=lesson_id)

    await _validate_lesson_course(lesson=lesson, course_id=course_id)
    return SuccessResponse(message="Lesson retrieved successfully", data=lesson)


@router.get(
    "/courses/{course_id}/lessons/{lesson_id}/video",
    response_model=SuccessResponse[CourseLessonReadWithVideo],
)
async def get_lesson_video(
    course_id: uuid.UUID,
    lesson_id: uuid.UUID,
    session: DatabaseDep,
    current_user: CurrentUserOptionalDep,
):
    await verify_lesson_access(
        lesson_id=lesson_id,
        session=session,
        current_user=current_user,
    )

    lesson = await lesson_service.get_lesson_with_video(
        session=session,
        lesson_id=lesson_id,
    )

    await _validate_lesson_course(lesson=lesson, course_id=course_id)

    return SuccessResponse(
        message="Lesson video retrieved successfully",
        data=lesson,
    )
