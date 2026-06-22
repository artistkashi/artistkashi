from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastcrud import JoinConfig
from fastcrud.types import GetMultiResponseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictException,
    ErrorCode,
    NotFoundException,
)
from app.crud.course import crud_course, crud_course_enrollment
from app.models.course import Course
from app.models.course_category import CourseCategory
from app.schemas.course import CourseListRead
from app.schemas.course_category import CourseCategoryRead
from app.schemas.course_enrollment import (
    CourseEnrollmentCreate,
    CourseEnrollmentRead,
)


class EnrollmentService:
    async def _get_enrollment(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> CourseEnrollmentRead:
        enrollment = await crud_course_enrollment.get(
            db=session,
            user_id=user_id,
            course_id=course_id,
            schema_to_select=CourseEnrollmentRead,
            return_as_model=True,
        )

        if not enrollment:
            raise NotFoundException(
                resource="Enrollment",
                identifier=f"user={user_id},course={course_id}",
                error_code=ErrorCode.ENROLLMENT_NOT_FOUND,
            )

        return enrollment

    async def enroll(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> CourseEnrollmentRead:
        # if not await course_service.course_exists(
        # session=session, course_id=course_id):
        if not await crud_course.exists(db=session, id=course_id, is_deleted=False):
            raise NotFoundException(
                resource="Course",
                identifier=str(course_id),
                error_code=ErrorCode.COURSE_NOT_FOUND,
            )

        existing = await crud_course_enrollment.get(
            db=session,
            user_id=user_id,
            course_id=course_id,
        )
        if existing:
            raise ConflictException(
                message="User is already enrolled in this course",
                error_code=ErrorCode.ENROLLMENT_ALREADY_EXISTS,
            )

        enrollment = await crud_course_enrollment.create(
            db=session,
            object=CourseEnrollmentCreate(
                user_id=user_id,
                course_id=course_id,
            ),
            schema_to_select=CourseEnrollmentRead,
            return_as_model=True,
        )

        return enrollment

    async def unenroll(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> None:
        enrollment = await self._get_enrollment(
            session=session,
            user_id=user_id,
            course_id=course_id,
        )

        await crud_course_enrollment.delete(
            db=session,
            id=enrollment.id,
        )

    async def count_enrollments(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID,
    ) -> int:
        return await crud_course_enrollment.count(
            db=session,
            course_id=course_id,
        )

    async def count_user_enrollments(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
    ) -> int:
        return await crud_course_enrollment.count(
            db=session,
            user_id=user_id,
        )

    async def get_enrollment(
        self,
        *,
        session: AsyncSession,
        enrollment_id: uuid.UUID,
    ) -> CourseEnrollmentRead:
        enrollment = await crud_course_enrollment.get(
            db=session,
            id=enrollment_id,
            schema_to_select=CourseEnrollmentRead,
            return_as_model=True,
        )
        if not enrollment:
            raise NotFoundException(
                resource="Enrollment",
                identifier=str(enrollment_id),
                error_code=ErrorCode.ENROLLMENT_NOT_FOUND,
            )

        return enrollment

    async def get_user_course_enrollment(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> CourseEnrollmentRead | None:
        enrollment = await crud_course_enrollment.get(
            db=session,
            user_id=user_id,
            course_id=course_id,
            schema_to_select=CourseEnrollmentRead,
            return_as_model=True,
        )
        return enrollment

    async def is_enrolled(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> bool:
        return await crud_course_enrollment.exists(
            db=session,
            user_id=user_id,
            course_id=course_id,
        )

    async def list_user_enrollments(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
    ) -> GetMultiResponseModel[CourseEnrollmentRead]:
        result = await crud_course_enrollment.get_multi(
            db=session,
            user_id=user_id,
            sort_columns=["created_at"],
            sort_orders=["desc"],
            schema_to_select=CourseEnrollmentRead,
            return_as_model=True,
        )

        return result

    async def list_course_enrollments(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID,
    ) -> list[CourseEnrollmentRead]:
        result = await crud_course_enrollment.get_multi(
            db=session,
            course_id=course_id,
            sort_columns=["created_at"],
            sort_orders=["desc"],
            schema_to_select=CourseEnrollmentRead,
            return_as_model=True,
        )

        return result["data"]

    async def complete_course(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> CourseEnrollmentRead:
        enrollment = await self._get_enrollment(
            session=session,
            user_id=user_id,
            course_id=course_id,
        )

        return await crud_course_enrollment.update(
            db=session,
            id=enrollment.id,
            object={"completed_at": datetime.now(UTC)},
            schema_to_select=CourseEnrollmentRead,
            return_as_model=True,
        )

    async def get_enrolled_courses(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
    ) -> list[CourseListRead]:
        enrollments = await crud_course_enrollment.get_multi(
            db=session,
            user_id=user_id,
            schema_to_select=CourseEnrollmentRead,
            return_as_model=True,
            sort_columns=["created_at"],
            sort_orders=["desc"],
        )

        course_ids = [enrollment.course_id for enrollment in enrollments["data"]]

        if not course_ids:
            return []

        result = await crud_course.get_multi_joined(
            db=session,
            id__in=course_ids,
            is_deleted=False,
            schema_to_select=CourseListRead,
            joins_config=[
                JoinConfig(
                    model=CourseCategory,
                    join_on=Course.category_id == CourseCategory.id,
                    join_prefix="category",
                    schema_to_select=CourseCategoryRead,
                )
            ],
            nest_joins=True,
        )

        return result["data"]

    # async def get_enrolled_courses(
    #     self,
    #     *,
    #     session: AsyncSession,
    #     user_id: uuid.UUID,
    # ) -> list[Course]:
    #     stmt = (
    #         select(Course)
    #         .join(
    #             CourseEnrollment,
    #             CourseEnrollment.course_id == Course.id,
    #         )
    #         .where(
    #             CourseEnrollment.user_id == user_id,
    #             Course.is_deleted == False,
    #         )
    #         .options(selectinload(Course.enrollments))
    #     )
    #     result = await session.execute(stmt)
    #     courses = result.scalars().all()

    #     return list(courses)

    async def get_dashboard_stats(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
    ) -> dict:
        enrollment_count = await self.count_user_enrollments(
            session=session,
            user_id=user_id,
        )

        completed_count = await crud_course_enrollment.count(
            db=session,
            user_id=user_id,
            completed_at__is_not=None,
        )

        return {
            "enrolled_courses": enrollment_count,
            "completed_courses": completed_count,
        }


enrollment_service = EnrollmentService()
