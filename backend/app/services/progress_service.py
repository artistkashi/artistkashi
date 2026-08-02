from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AppException,
    ErrorCode,
    NotFoundException,
)
from app.crud.course import (
    crud_course_lesson,
    crud_lesson_progress,
)
from app.models.lesson_progress import ProgressStatus
from app.schemas.lesson_progress import (
    CourseProgressRead,
    LessonProgressCreate,
    LessonProgressRead,
    LessonProgressUpdate,
)
from app.services.enrollment_service import enrollment_service
from app.services.lesson_service import lesson_service

COMPLETION_THRESHOLD = 0.9


class ProgressService:
    def _compute_progress_status(
        self,
        watch_seconds: int,
        video_duration_seconds: int,
    ) -> tuple[ProgressStatus, datetime | None]:
        now = datetime.now(UTC)
        if video_duration_seconds > 0:
            if (
                watch_seconds > 0
                and (watch_seconds / video_duration_seconds) >= COMPLETION_THRESHOLD
            ):
                return ProgressStatus.COMPLETED, now
            if watch_seconds > 0:
                return ProgressStatus.IN_PROGRESS, None
            return ProgressStatus.NOT_STARTED, None
        if watch_seconds > 0:
            return ProgressStatus.IN_PROGRESS, None
        return ProgressStatus.NOT_STARTED, None

    async def create_or_update_progress(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        lesson_id: uuid.UUID,
        payload: LessonProgressUpdate,
        is_admin: bool = False,
    ) -> LessonProgressRead:
        lesson = await lesson_service.get_lesson(session=session, lesson_id=lesson_id)

        if (
            not lesson.is_preview
            and not is_admin
            and not await enrollment_service.is_enrolled(
                session=session,
                user_id=user_id,
                course_id=lesson.course_id,
            )
        ):
            raise AppException(
                message="User is not enrolled in this course",
                error_code=ErrorCode.NOT_ENROLLED,
                status_code=403,
            )

        existing = await crud_lesson_progress.get(
            db=session,
            user_id=user_id,
            lesson_id=lesson_id,
        )

        now = datetime.now(UTC)
        resolved_watch = payload.watch_seconds or 0
        if lesson.video_duration_seconds > 0:
            resolved_watch = min(resolved_watch, lesson.video_duration_seconds)

        if existing:
            resolved_watch = max(
                existing["watch_seconds"],
                resolved_watch,
            )
        resolved_status, completed_at = self._compute_progress_status(
            resolved_watch, lesson.video_duration_seconds
        )

        if (
            payload.status == ProgressStatus.COMPLETED
            and resolved_status != ProgressStatus.COMPLETED
        ):
            resolved_status = ProgressStatus.COMPLETED
            completed_at = now

        if existing:
            update_data = payload.model_dump(mode="python", exclude_unset=True)
            update_data["watch_seconds"] = resolved_watch
            update_data["last_watched_at"] = now
            update_data["status"] = resolved_status
            if resolved_status == ProgressStatus.COMPLETED:
                update_data["resume_position_seconds"] = 0
                if not existing.get("completed_at"):
                    update_data["completed_at"] = completed_at

            await crud_lesson_progress.update(
                db=session,
                id=existing["id"],
                object=update_data,
            )
        else:
            resume_position = (
                0
                if resolved_status == ProgressStatus.COMPLETED
                else (payload.resume_position_seconds or 0)
            )
            if lesson.video_duration_seconds > 0:
                resume_position = min(resume_position, lesson.video_duration_seconds)

            await crud_lesson_progress.create(
                db=session,
                object=LessonProgressCreate(
                    user_id=user_id,
                    lesson_id=lesson_id,
                    status=resolved_status,
                    watch_seconds=resolved_watch,
                    resume_position_seconds=resume_position,
                    completed_at=completed_at,
                    last_watched_at=now,
                ),
            )

        progress = await crud_lesson_progress.get(
            db=session, user_id=user_id, lesson_id=lesson_id
        )
        if not progress:
            raise AppException(
                message="Failed to save progress",
                error_code=ErrorCode.INTERNAL_ERROR,
                status_code=500,
            )

        if resolved_status == ProgressStatus.COMPLETED:
            course_progress = await self.get_course_progress(
                session=session,
                user_id=user_id,
                course_id=lesson.course_id,
            )

            if (
                course_progress.completed_lessons >= course_progress.total_lessons
                and course_progress.total_lessons > 0
            ):
                await enrollment_service.complete_course(
                    session=session,
                    user_id=user_id,
                    course_id=lesson.course_id,
                )

        return LessonProgressRead.model_validate(progress)

    async def get_progress(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        lesson_id: uuid.UUID,
    ) -> LessonProgressRead:
        progress = await crud_lesson_progress.get(
            db=session,
            user_id=user_id,
            lesson_id=lesson_id,
        )
        if not progress:
            raise NotFoundException(
                resource="LessonProgress",
                identifier=f"user={user_id},lesson={lesson_id}",
                error_code=ErrorCode.LESSON_PROGRESS_NOT_FOUND,
            )

        return LessonProgressRead.model_validate(progress)

    async def get_progress_or_none(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        lesson_id: uuid.UUID,
    ) -> LessonProgressRead | None:
        progress = await crud_lesson_progress.get(
            db=session,
            user_id=user_id,
            lesson_id=lesson_id,
        )
        if not progress:
            return None

        return LessonProgressRead.model_validate(progress)

    async def mark_lesson_completed(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        lesson_id: uuid.UUID,
        is_admin: bool = False,
    ) -> LessonProgressRead:
        lesson = await lesson_service.get_lesson(session=session, lesson_id=lesson_id)

        if (
            not lesson.is_preview
            and not is_admin
            and not await enrollment_service.is_enrolled(
                session=session,
                user_id=user_id,
                course_id=lesson.course_id,
            )
        ):
            raise AppException(
                message="User is not enrolled in this course",
                error_code=ErrorCode.NOT_ENROLLED,
                status_code=403,
            )

        existing = await crud_lesson_progress.get(
            db=session,
            user_id=user_id,
            lesson_id=lesson_id,
        )

        now = datetime.now(UTC)
        if existing:
            progress = await crud_lesson_progress.update(
                db=session,
                id=existing["id"],
                object={
                    "status": ProgressStatus.COMPLETED,
                    "watch_seconds": lesson.video_duration_seconds,
                    "resume_position_seconds": lesson.video_duration_seconds,
                    "completed_at": now,
                    "last_watched_at": now,
                },
            )
        else:
            progress = await crud_lesson_progress.create(
                db=session,
                object=LessonProgressCreate(
                    user_id=user_id,
                    lesson_id=lesson_id,
                    status=ProgressStatus.COMPLETED,
                    watch_seconds=lesson.video_duration_seconds,
                    resume_position_seconds=lesson.video_duration_seconds,
                    completed_at=now,
                    last_watched_at=now,
                ),
            )

        course_progress = await self.get_course_progress(
            session=session,
            user_id=user_id,
            course_id=lesson.course_id,
        )

        if (
            course_progress.completed_lessons >= course_progress.total_lessons
            and course_progress.total_lessons > 0
        ):
            await enrollment_service.complete_course(
                session=session,
                user_id=user_id,
                course_id=lesson.course_id,
            )

        return LessonProgressRead.model_validate(progress)

    async def get_course_progress(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> CourseProgressRead:
        total_lessons = await crud_course_lesson.get_multi(
            db=session, course_id=course_id, return_total_count=True
        )
        total = total_lessons["total_count"]

        lesson_ids = [lesson["id"] for lesson in total_lessons["data"]]

        completed_count = 0
        if lesson_ids:
            completed_count = await crud_lesson_progress.count(
                db=session,
                user_id=user_id,
                lesson_id__in=lesson_ids,
                status=ProgressStatus.COMPLETED,
            )
            # stmt = (
            #     select(func.count())
            #     .select_from(LessonProgress)
            #     .where(
            #         LessonProgress.user_id == user_id,
            #         LessonProgress.lesson_id.in_(lesson_ids),
            #         LessonProgress.status == ProgressStatus.COMPLETED,
            #     )
            # )
            # result = await session.execute(stmt)
            # completed_count = result.scalar() or 0

        return CourseProgressRead(
            course_id=course_id,
            total_lessons=total,
            completed_lessons=completed_count,
            progress_percentage=round((completed_count / total * 100), 2)
            if total > 0
            else 0,
        )

    async def get_continue_watching(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        limit: int = 5,
    ) -> list[LessonProgressRead]:
        result = await crud_lesson_progress.get_multi(
            db=session,
            user_id=user_id,
            status=ProgressStatus.IN_PROGRESS,
            sort_columns=["last_watched_at"],
            sort_orders=["desc"],
            limit=limit,
            schema=LessonProgressRead,
            return_as_model=True,
        )

        return result["data"]

    async def get_all_lesson_progresses(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> dict[str, str]:
        lessons = await crud_course_lesson.get_multi(db=session, course_id=course_id)
        lesson_ids = [lesson["id"] for lesson in lessons["data"]]
        if not lesson_ids:
            return {}

        progresses = await crud_lesson_progress.get_multi(
            db=session,
            user_id=user_id,
            lesson_id__in=lesson_ids,
            schema_to_select=LessonProgressRead,
            return_as_model=True,
        )

        return {str(p.lesson_id): p.status.value for p in progresses["data"]}

    async def get_lesson_progress_percentage(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        lesson_id: uuid.UUID,
    ) -> float:
        progress = await self.get_progress_or_none(
            session=session, user_id=user_id, lesson_id=lesson_id
        )
        if not progress:
            return 0.0

        lesson = await lesson_service.get_lesson(session=session, lesson_id=lesson_id)
        if lesson.video_duration_seconds == 0:
            return 100.0 if progress.status == ProgressStatus.COMPLETED else 0.0

        return round((progress.watch_seconds / lesson.video_duration_seconds) * 100, 2)


progress_service = ProgressService()
