from __future__ import annotations

import asyncio
import logging
import uuid

from fastapi import APIRouter, Body

from app.api.dependencies import DatabaseDep
from app.core.config import settings
from app.core.db import get_async_session_context
from app.core.exceptions import ValidationException
from app.crud.course import crud_course_lesson
from app.models.course_lesson import LessonStatus
from app.schemas.course_lesson import (
    ConfirmVideoUploadRequest,
    CourseLessonCreate,
    CourseLessonRead,
    CourseLessonReadWithVideo,
    CourseLessonUpdate,
    InitVideoUploadRequest,
    InitVideoUploadResponse,
    MoveLessonPayload,
)
from app.schemas.responses import SuccessResponse
from app.services.course_service import course_service
from app.services.lesson_service import lesson_service
from app.services.section_service import section_service
from app.services.storage_service import storage_service
from app.services.transcoding_service import transcode_to_1080p

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/courses/{course_id}", tags=["admin-lessons"])


async def _process_video_background(
    lesson_id: str,
    course_id: str,
    source_key: str,
) -> None:

    try:
        async with get_async_session_context() as session:
            await crud_course_lesson.update(
                db=session,
                id=lesson_id,
                object={"status": LessonStatus.PROCESSING},
            )

        new_key, duration = await transcode_to_1080p(
            source_key=source_key, course_id=course_id, lesson_id=lesson_id
        )

        async with get_async_session_context() as session:
            update = {"status": LessonStatus.READY, "video_duration_seconds": duration}
            if new_key != source_key:
                update["video_key"] = new_key
                await storage_service.delete_file(source_key)
            await crud_course_lesson.update(db=session, id=lesson_id, object=update)
            await lesson_service._recalculate_course_duration(
                session=session, course_id=uuid.UUID(course_id)
            )

        logger.info("Video processing complete for lesson %s", lesson_id)

    except Exception:
        logger.exception("Video processing failed for lesson %s", lesson_id)
        try:
            async with get_async_session_context() as session:
                if await storage_service.file_exists(source_key):
                    await crud_course_lesson.update(
                        db=session,
                        id=lesson_id,
                        object={"status": LessonStatus.READY},
                    )
                else:
                    await crud_course_lesson.update(
                        db=session,
                        id=lesson_id,
                        object={"status": LessonStatus.FAILED},
                    )
        except Exception:
            logger.exception("Failed to update lesson status after processing failure")


@router.post(
    "/sections/{section_id}/lessons",
    response_model=SuccessResponse[CourseLessonRead],
)
async def create_lesson(
    course_id: uuid.UUID,
    section_id: uuid.UUID,
    payload: CourseLessonCreate,
    session: DatabaseDep,
):
    await course_service.get_course(session=session, course_id=course_id)
    await section_service.get_section(session=session, section_id=section_id)
    lesson = await lesson_service.create_lesson(
        session=session, course_id=course_id, section_id=section_id, payload=payload
    )
    return SuccessResponse(message="Lesson created successfully", data=lesson)


@router.put(
    "/sections/{section_id}/lessons/reorder",
    response_model=SuccessResponse[list[CourseLessonRead]],
)
async def reorder_lessons(
    course_id: uuid.UUID,
    section_id: uuid.UUID,
    session: DatabaseDep,
    ordered_ids: list[uuid.UUID] = Body(...),
):
    await course_service.get_course(session=session, course_id=course_id)
    await section_service.get_section(session=session, section_id=section_id)
    lessons = await lesson_service.reorder_lessons(
        session=session, section_id=section_id, ordered_ids=ordered_ids
    )
    return SuccessResponse(message="Lessons reordered successfully", data=lessons)


@router.put(
    "/sections/{section_id}/lessons/{lesson_id}",
    response_model=SuccessResponse[CourseLessonRead],
)
async def update_lesson(
    course_id: uuid.UUID,
    section_id: uuid.UUID,
    lesson_id: uuid.UUID,
    payload: CourseLessonUpdate,
    session: DatabaseDep,
):
    await course_service.get_course(session=session, course_id=course_id)
    await section_service.get_section(session=session, section_id=section_id)
    lesson = await lesson_service.update_lesson(
        session=session, lesson_id=lesson_id, payload=payload
    )
    return SuccessResponse(message="Lesson updated successfully", data=lesson)


@router.delete(
    "/sections/{section_id}/lessons/{lesson_id}",
    response_model=SuccessResponse[None],
)
async def delete_lesson(
    course_id: uuid.UUID,
    section_id: uuid.UUID,
    lesson_id: uuid.UUID,
    session: DatabaseDep,
):
    await course_service.get_course(session=session, course_id=course_id)
    await section_service.get_section(session=session, section_id=section_id)
    await lesson_service.delete_lesson(session=session, lesson_id=lesson_id)
    return SuccessResponse(message="Lesson deleted successfully")


@router.post(
    "/lessons/{lesson_id}/video/init",
    response_model=SuccessResponse[InitVideoUploadResponse],
)
async def init_video_upload(
    course_id: uuid.UUID,
    lesson_id: uuid.UUID,
    payload: InitVideoUploadRequest,
    session: DatabaseDep,
):
    await course_service.get_course(session=session, course_id=course_id)
    await lesson_service.get_lesson(session=session, lesson_id=lesson_id)

    extension = (
        payload.file_name.rsplit(".", 1)[-1] if "." in payload.file_name else "mp4"
    )
    video_key = f"{settings.S3_FOLDER_COURSES}/{course_id}/{uuid.uuid4()}.{extension}"

    upload_url = storage_service.generate_presigned_upload_url(
        key=video_key,
        content_type=payload.content_type,
    )

    return SuccessResponse(
        message="Upload URL generated",
        data=InitVideoUploadResponse(
            upload_url=upload_url,
            video_key=video_key,
            expires_in=3600,
        ),
    )


@router.post(
    "/lessons/{lesson_id}/video/confirm",
    response_model=SuccessResponse[CourseLessonReadWithVideo],
)
async def confirm_video_upload(
    course_id: uuid.UUID,
    lesson_id: uuid.UUID,
    payload: ConfirmVideoUploadRequest,
    session: DatabaseDep,
):
    await course_service.get_course(session=session, course_id=course_id)
    await lesson_service.get_lesson(session=session, lesson_id=lesson_id)

    if not await storage_service.file_exists(payload.video_key):
        raise ValidationException("Video file not found in storage")

    lesson = await lesson_service.update_lesson_video(
        session=session,
        lesson_id=lesson_id,
        video_key=payload.video_key,
        duration_seconds=payload.duration_seconds,
    )

    await crud_course_lesson.update(
        db=session,
        id=lesson_id,
        object={"status": LessonStatus.READY},
    )
    lesson = await lesson_service.get_lesson(session=session, lesson_id=lesson_id)

    asyncio.create_task(
        _process_video_background(
            lesson_id=str(lesson_id),
            course_id=str(course_id),
            source_key=payload.video_key,
        )
    )

    return SuccessResponse(
        message="Video uploaded successfully.",
        data=lesson,
    )


@router.put(
    "/lessons/{lesson_id}/move",
    response_model=SuccessResponse[CourseLessonRead],
)
async def move_lesson(
    course_id: uuid.UUID,
    lesson_id: uuid.UUID,
    payload: MoveLessonPayload,
    session: DatabaseDep,
):
    await course_service.get_course(session=session, course_id=course_id)
    lesson = await lesson_service.move_lesson(
        session=session,
        lesson_id=lesson_id,
        target_section_id=payload.target_section_id,
        sort_order=payload.sort_order,
    )
    return SuccessResponse(message="Lesson moved successfully", data=lesson)
