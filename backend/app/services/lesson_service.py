from __future__ import annotations

import math
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ErrorCode, NotFoundException, ValidationException
from app.crud.course import crud_course, crud_course_lesson
from app.models.course_lesson import CourseLesson, LessonStatus
from app.schemas.course_lesson import (
    CourseLessonCreate,
    CourseLessonCreateDB,
    CourseLessonRead,
    CourseLessonReadWithVideo,
    CourseLessonUpdate,
)
from app.services.section_service import section_service
from app.services.storage_service import storage_service


class LessonService:
    async def _recalculate_course_duration(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID,
    ) -> None:
        total = await session.scalar(
            select(
                func.coalesce(func.sum(CourseLesson.video_duration_seconds), 0)
            ).where(CourseLesson.course_id == course_id)
        )
        await crud_course.update(
            db=session,
            id=course_id,
            object={"total_duration_seconds": int(total)},
        )

    async def _get_lesson(
        self,
        *,
        session: AsyncSession,
        lesson_id: uuid.UUID,
    ) -> CourseLessonRead:
        lesson = await crud_course_lesson.get(
            db=session,
            id=lesson_id,
            schema_to_select=CourseLessonRead,
            return_as_model=True,
        )

        if not lesson:
            raise NotFoundException(
                resource="Lesson",
                identifier=str(lesson_id),
                error_code=ErrorCode.LESSON_NOT_FOUND,
            )

        return lesson

    async def _get_next_sort_order(
        self,
        *,
        session: AsyncSession,
        section_id: uuid.UUID,
    ) -> int:
        result = await crud_course_lesson.get_multi(
            db=session,
            section_id=section_id,
            sort_columns=["sort_order"],
            sort_orders=["desc"],
            limit=1,
        )

        if not result["data"]:
            return 0

        return (result["data"][0]["sort_order"] or 0) + 1

    async def create_lesson(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID,
        section_id: uuid.UUID,
        payload: CourseLessonCreate,
    ) -> CourseLessonRead:
        section = await section_service.get_section(
            session=session,
            section_id=section_id,
        )

        if section.course_id != course_id:
            raise ValidationException(
                message="Section does not belong to course",
                error_code=ErrorCode.SECTION_NOT_FOUND,
            )

        next_order = await self._get_next_sort_order(
            session=session,
            section_id=section_id,
        )

        lesson = await crud_course_lesson.create(
            db=session,
            object=CourseLessonCreateDB(
                course_id=course_id,
                section_id=section_id,
                title=payload.title,
                description=payload.description,
                video_duration_seconds=payload.video_duration_seconds,
                thumbnail_key=payload.thumbnail_key,
                is_preview=payload.is_preview,
                sort_order=payload.sort_order
                if payload.sort_order is not None
                else next_order,
                status=payload.status,
            ),
            schema_to_select=CourseLessonRead,
            return_as_model=True,
        )

        return lesson

    async def get_lesson(
        self,
        *,
        session: AsyncSession,
        lesson_id: uuid.UUID,
    ) -> CourseLessonRead:
        lesson = await crud_course_lesson.get(
            db=session,
            id=lesson_id,
            schema_to_select=CourseLessonRead,
            return_as_model=True,
        )
        if not lesson:
            raise NotFoundException(
                resource="Lesson",
                identifier=str(lesson_id),
                error_code=ErrorCode.LESSON_NOT_FOUND,
            )

        return lesson

    async def get_lesson_with_video(
        self,
        *,
        session: AsyncSession,
        lesson_id: uuid.UUID,
    ) -> CourseLessonReadWithVideo:
        lesson = await crud_course_lesson.get(
            db=session,
            id=lesson_id,
            schema_to_select=CourseLessonReadWithVideo,
            return_as_model=True,
        )
        if not lesson:
            raise NotFoundException(
                resource="Lesson",
                identifier=str(lesson_id),
                error_code=ErrorCode.LESSON_NOT_FOUND,
            )

        return lesson

    async def update_lesson(
        self,
        *,
        session: AsyncSession,
        lesson_id: uuid.UUID,
        payload: CourseLessonUpdate,
    ) -> CourseLessonRead:
        await self._get_lesson(
            session=session,
            lesson_id=lesson_id,
        )

        update_data = payload.model_dump(
            mode="python",
            exclude_unset=True,
        )

        lesson = await crud_course_lesson.update(
            db=session,
            id=lesson_id,
            object=update_data,
            schema_to_select=CourseLessonRead,
            return_as_model=True,
        )

        await self._recalculate_course_duration(
            session=session,
            course_id=lesson.course_id,
        )

        return lesson

    async def update_lesson_video(
        self,
        *,
        session: AsyncSession,
        lesson_id: uuid.UUID,
        video_key: str,
        duration_seconds: float | None = None,
    ) -> CourseLessonRead:
        lesson = await self._get_lesson(
            session=session,
            lesson_id=lesson_id,
        )

        if lesson.video_key:
            await storage_service.delete_file(lesson.video_key)

        update_data: dict = {
            "video_key": video_key,
            "status": LessonStatus.PROCESSING,
        }
        if duration_seconds is not None:
            update_data["video_duration_seconds"] = math.ceil(duration_seconds)

        lesson = await crud_course_lesson.update(
            db=session,
            id=lesson_id,
            object=update_data,
            schema_to_select=CourseLessonRead,
            return_as_model=True,
        )

        await self._recalculate_course_duration(
            session=session,
            course_id=lesson.course_id,
        )

        return lesson

    async def _cleanup_lesson_files(self, lesson) -> None:
        if lesson.video_key:
            from app.services.storage_service import storage_service

            await storage_service.delete_file(lesson.video_key)

    async def delete_lesson(
        self,
        *,
        session: AsyncSession,
        lesson_id: uuid.UUID,
    ) -> None:
        lesson = await self._get_lesson(
            session=session,
            lesson_id=lesson_id,
        )

        course_id = lesson.course_id

        await self._cleanup_lesson_files(lesson)

        await crud_course_lesson.delete(
            db=session,
            id=lesson_id,
        )

        await self._recalculate_course_duration(
            session=session,
            course_id=course_id,
        )

    async def list_section_lessons(
        self,
        *,
        session: AsyncSession,
        section_id: uuid.UUID,
    ) -> list[CourseLessonRead]:
        result = await crud_course_lesson.get_multi(
            db=session,
            section_id=section_id,
            sort_columns=["sort_order"],
            sort_orders=["asc"],
            schema_to_select=CourseLessonRead,
            return_as_model=True,
        )

        return result["data"]

    async def list_course_lessons(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID,
    ) -> list[CourseLessonRead]:
        result = await crud_course_lesson.get_multi(
            db=session,
            course_id=course_id,
            sort_columns=["sort_order"],
            sort_orders=["asc"],
            schema_to_select=CourseLessonRead,
            return_as_model=True,
        )

        return result["data"]

    async def reorder_lessons(
        self,
        *,
        session: AsyncSession,
        section_id: uuid.UUID,
        ordered_ids: list[uuid.UUID],
    ) -> list[CourseLessonRead]:
        lessons = await crud_course_lesson.get_multi(
            db=session,
            section_id=section_id,
        )

        valid_ids = {lesson["id"] for lesson in lessons["data"]}

        if set(ordered_ids) != valid_ids:
            raise ValidationException(
                message="Invalid lesson order",
            )
        for index, lesson_id in enumerate(ordered_ids):
            await crud_course_lesson.update(
                db=session,
                id=lesson_id,
                object={"sort_order": index},
            )

        return await self.list_section_lessons(session=session, section_id=section_id)

    async def move_lesson(
        self,
        *,
        session: AsyncSession,
        lesson_id: uuid.UUID,
        target_section_id: uuid.UUID,
        sort_order: int | None = None,
    ) -> CourseLessonRead:
        # existing = await self._get_lesson(
        #     session=session,
        #     lesson_id=lesson_id,
        # )

        # from sqlalchemy import select

        # from app.models.course_section import CourseSection

        # stmt = select(CourseSection).where(
        #     CourseSection.id == target_section_id,
        #     CourseSection.course_id == existing["course_id"],
        # )
        # result = await session.execute(stmt)
        # target_section = result.scalar_one_or_none()

        # if not target_section:
        #     raise NotFoundException(
        #         resource="Section",
        #         identifier=str(target_section_id),
        #         error_code=ErrorCode.SECTION_NOT_FOUND,
        #     )

        lesson = await self._get_lesson(
            session=session,
            lesson_id=lesson_id,
        )

        section = await section_service.get_section(
            session=session,
            section_id=target_section_id,
        )

        if section.course_id != lesson.course_id:
            raise ValidationException(
                message="Section does not belong to the lesson course",
                error_code=ErrorCode.SECTION_NOT_FOUND,
            )

        update_data: dict = {"section_id": target_section_id}
        if sort_order is not None:
            update_data["sort_order"] = sort_order
        else:
            update_data["sort_order"] = await self._get_next_sort_order(
                session=session, section_id=target_section_id
            )

        lesson = await crud_course_lesson.update(
            db=session,
            id=lesson_id,
            object=update_data,
            schema_to_select=CourseLessonRead,
            return_as_model=True,
        )

        return lesson

    async def lesson_exists(
        self,
        *,
        session: AsyncSession,
        lesson_id: uuid.UUID,
    ) -> bool:
        return await crud_course_lesson.exists(
            db=session,
            id=lesson_id,
        )


lesson_service = LessonService()
