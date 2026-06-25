from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import UploadFile
from fastcrud import CountConfig, JoinConfig, compute_offset
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import (
    ConflictException,
    ErrorCode,
    NotFoundException,
)
from app.core.pagination import build_paginated_response
from app.crud.cart import crud_cart
from app.crud.course import (
    crud_course,
    crud_course_category,
    crud_course_lesson,
    crud_course_section,
)
from app.models.cart import CartItem
from app.models.course import Course
from app.models.course_category import CourseCategory
from app.models.course_lesson import CourseLesson
from app.models.course_payment import CoursePayment, CoursePaymentStatus
from app.models.course_section import CourseSection
from app.models.review import ReviewType
from app.models.wishlist import Wishlist
from app.schemas.course import (
    CourseCreate,
    CourseCurriculumRead,
    CourseListRead,
    CourseRead,
    CourseStatsRead,
    CourseUpdate,
)
from app.schemas.course_category import CourseCategoryRead
from app.schemas.course_section import CourseSectionCreateDB
from app.schemas.responses import PaginatedResponse
from app.services.enrollment_service import enrollment_service
from app.services.review_service import review_service
from app.services.storage_service import storage_service


class CourseService:
    async def get_course_only(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID | None = None,
        slug: str | None = None,
        check: bool = False,
        course_schema: type[CourseRead] = CourseRead,
    ) -> CourseRead | None:
        filters = {}
        if course_id:
            filters["id"] = course_id
        if slug:
            filters["slug"] = slug

        course = await crud_course.get(
            db=session,
            **filters,
            schema_to_select=course_schema,
            return_as_model=True,
        )
        if not course:
            if check:
                raise NotFoundException(
                    resource="Course",
                    identifier=str(course_id or slug),
                    error_code=ErrorCode.COURSE_NOT_FOUND,
                )
            return None
        return course

    async def get_course(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID | None = None,
        slug: str | None = None,
        check=False,
    ) -> CourseRead:
        filters = {"is_deleted": False}
        if course_id:
            filters["id"] = course_id
        if slug:
            filters["slug"] = slug

        course = await crud_course.get_joined(
            db=session,
            **filters,
            schema_to_select=CourseRead,
            joins_config=[
                JoinConfig(
                    model=CourseCategory,
                    join_on=Course.category_id == CourseCategory.id,
                    join_prefix="category",
                    schema_to_select=CourseCategoryRead,
                )
            ],
            # count_config=[
            #     CountConfig(
            #         model=CourseLesson,
            #         join_on=Course.id == CourseLesson.course_id,
            #         alias="lessons_count",
            #     )
            # ],
            return_as_model=True,
            nest_joins=True,
        )
        print(course)
        if not course:
            if check:
                raise NotFoundException(
                    resource="Course",
                    identifier=str(course_id),
                    error_code=ErrorCode.COURSE_NOT_FOUND,
                )
            return None

        count = await crud_course_lesson.count(db=session, course_id=course.id)

        course.lessons_count = count

        avg_rating, review_count = await review_service.get_rating(
            session=session,
            review_type=ReviewType.COURSE,
            entity_id=course.id,
        )

        course.average_rating = avg_rating
        course.review_count = review_count

        enrollment_count = await enrollment_service.count_enrollments(
            session=session, course_id=course.id
        )
        course.enrollment_count = enrollment_count

        return course

    async def create_course(
        self,
        *,
        session: AsyncSession,
        payload: CourseCreate,
        thumbnail: UploadFile | None = None,
        demo_video: UploadFile | None = None,
    ) -> CourseRead:
        existing = await self.get_course_only(session=session, slug=payload.slug)
        if existing:
            raise ConflictException(
                message=f"A course with this title '{payload.title}' already exists",
                error_code=ErrorCode.COURSE_ALREADY_EXISTS,
            )

        course_id = uuid.uuid4()
        course_dict = payload.model_dump()
        course_dict["id"] = course_id

        if thumbnail:
            ext = thumbnail.filename.split(".")[-1] if thumbnail.filename else "png"
            key = f"{settings.S3_FOLDER_COURSES}/{course_id}/thumbnail.{ext}"
            await storage_service.upload_image(file=thumbnail, key=key)
            course_dict["thumbnail_key"] = key

        if demo_video:
            ext = demo_video.filename.split(".")[-1] if demo_video.filename else "mp4"
            key = f"{settings.S3_FOLDER_COURSES}/{course_id}/demo.{ext}"
            await storage_service.upload_video(file=demo_video, key=key)
            course_dict["demo_video_key"] = key

        course = await crud_course.create(
            db=session,
            object=course_dict,
            return_as_model=True,
            schema_to_select=CourseRead,
        )

        await crud_course_section.create(
            db=session,
            object=CourseSectionCreateDB(
                course_id=course.id,
                title=f"Introduction to {payload.title}",
                sort_order=0,
            ),
        )

        return CourseRead.model_validate(course)

    async def update_course(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID | None = None,
        slug: str | None = None,
        payload: CourseUpdate,
        thumbnail: UploadFile | None = None,
        demo_video: UploadFile | None = None,
    ) -> CourseRead:
        filters = {}
        if course_id:
            filters["id"] = course_id
        if slug:
            filters["slug"] = slug

        existing_course = await self.get_course_only(
            session=session,
            course_id=course_id,
            slug=slug,
            check=True,
        )

        if payload.slug:
            slug_exists = await crud_course.get(
                db=session,
                slug=payload.slug,
                is_deleted=False,
            )

            if slug_exists and slug_exists["id"] != existing_course.id:
                raise ConflictException(
                    message=f"A course with slug '{payload.slug}' already exists",
                    error_code=ErrorCode.COURSE_ALREADY_EXISTS,
                )

        update_dict = payload.model_dump(exclude_unset=True)

        course_id = existing_course.id

        if thumbnail:
            if existing_course.thumbnail_key:
                await storage_service.delete_file(existing_course.thumbnail_key)
            ext = thumbnail.filename.split(".")[-1] if thumbnail.filename else "png"
            key = f"{settings.S3_FOLDER_COURSES}/{course_id}/thumbnail.{ext}"
            await storage_service.upload_image(file=thumbnail, key=key)
            update_dict["thumbnail_key"] = key

        if demo_video:
            if existing_course.demo_video_key:
                await storage_service.delete_file(existing_course.demo_video_key)
            ext = demo_video.filename.split(".")[-1] if demo_video.filename else "mp4"
            key = f"{settings.S3_FOLDER_COURSES}/{course_id}/demo.{ext}"
            await storage_service.upload_video(file=demo_video, key=key)
            update_dict["demo_video_key"] = key

        course = await crud_course.update(
            db=session,
            object=update_dict,
            schema_to_select=CourseRead,
            return_as_model=True,
            **filters,
        )

        return course

    async def delete_course(
        self,
        *,
        session: AsyncSession,
        slug: str,
    ) -> None:
        course = await self.get_course_only(
            session=session,
            slug=slug,
            check=True,
        )

        if course.is_published:
            raise ConflictException(
                message="Published courses cannot be deleted",
                error_code=ErrorCode.COURSE_ALREADY_PUBLISHED,
            )

        enrollment_count = await enrollment_service.count_enrollments(
            session=session,
            course_id=course.id,
        )

        if enrollment_count > 0:
            raise ConflictException(
                message="Course has enrolled students and cannot be deleted",
                error_code=ErrorCode.COURSE_HAS_ENROLLMENTS,
            )

        await crud_course.delete(
            db=session,
            id=course.id,
        )

    async def list_courses(
        self,
        *,
        session: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        is_published: bool | None = None,
        is_featured: bool | None = None,
        level: str | None = None,
        language: str | None = None,
        category_slug: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        user_id: uuid.UUID | None = None,
    ) -> PaginatedResponse[CourseListRead]:
        filters: dict = {"is_deleted": False}

        if is_published is not None:
            filters["is_published"] = is_published
        if is_featured is not None:
            filters["is_featured"] = is_featured
        if level is not None:
            filters["level"] = level
        if language is not None:
            filters["language"] = language
        if category_slug is not None:
            category = await crud_course_category.get(db=session, slug=category_slug)
            if category:
                filters["category_id"] = category["id"]
            else:
                return build_paginated_response(
                    result={"data": [], "total_count": 0},
                    page=page,
                    page_size=page_size,
                    message="Courses retrieved successfully",
                )

        if min_price is not None:
            filters["price__gte"] = min_price
        if max_price is not None:
            filters["price__lte"] = max_price

        result = await crud_course.get_multi_joined(
            db=session,
            offset=compute_offset(page, page_size),
            limit=page_size,
            sort_columns=["created_at"],
            sort_orders=["desc"],
            return_as_model=True,
            schema_to_select=CourseListRead,
            joins_config=[
                JoinConfig(
                    model=CourseCategory,
                    join_on=Course.category_id == CourseCategory.id,
                    join_prefix="category",
                    schema_to_select=CourseCategoryRead,
                    relationship_type="one-to-one",
                )
            ],
            counts_config=[
                CountConfig(
                    model=CourseLesson,
                    join_on=Course.id == CourseLesson.course_id,
                    alias="lessons_count",
                )
            ],
            nest_joins=True,
            **filters,
        )
        courses = result["data"]

        ratings = await review_service.get_bulk_ratings(
            session=session,
            review_type=ReviewType.COURSE,
            entity_ids=[course.id for course in courses],
        )

        # Enrich with wishlist status
        wishlisted_course_ids: set[uuid.UUID] = set()
        if user_id and courses:
            course_ids = [course.id for course in courses]
            wishlist_result = await session.execute(
                select(Wishlist.course_id).where(
                    Wishlist.user_id == user_id,
                    Wishlist.course_id.in_(course_ids),
                )
            )
            wishlisted_course_ids = {row[0] for row in wishlist_result if row[0]}

        # Enrich with cart status
        cart_course_ids: set[uuid.UUID] = set()
        if user_id and courses:
            course_ids = [course.id for course in courses]
            cart_result = await session.execute(
                select(CartItem.course_id).where(
                    CartItem.user_id == user_id,
                    CartItem.course_id.in_(course_ids),
                )
            )
            cart_course_ids = {row[0] for row in cart_result if row[0]}

        for course in courses:
            avg_rating, review_count = ratings.get(
                course.id,
                (0.0, 0),
            )
            course.average_rating = avg_rating
            course.review_count = review_count
            course.is_wishlisted = course.id in wishlisted_course_ids
            course.is_in_cart = course.id in cart_course_ids

        return build_paginated_response(
            result={"data": courses, "total_count": result.get("total_count", 0)},
            page=page,
            page_size=page_size,
            message="Courses retrieved successfully",
        )

    async def get_course_with_curriculum(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID,
    ) -> CourseCurriculumRead:
        stmt = (
            select(Course)
            .options(
                selectinload(Course.sections).selectinload(CourseSection.lessons),
                selectinload(Course.category),
            )
            .where(
                Course.id == course_id,
                Course.is_deleted.is_(False),
            )
        )
        result = await session.execute(stmt)
        course = result.scalar_one_or_none()

        if not course:
            raise NotFoundException(
                resource="Course",
                identifier=str(course_id),
                error_code=ErrorCode.COURSE_NOT_FOUND,
            )

        return CourseCurriculumRead.model_validate(course)

    async def publish_course(
        self,
        *,
        session: AsyncSession,
        slug: str,
    ) -> CourseRead:
        course = await self.update_course(
            session=session,
            slug=slug,
            payload=CourseUpdate(is_published=True),
        )
        return course

    async def unpublish_course(
        self,
        *,
        session: AsyncSession,
        slug: str,
    ) -> CourseRead:
        course = await self.update_course(
            session=session,
            slug=slug,
            payload=CourseUpdate(is_published=False),
        )
        return course

    async def feature_course(
        self,
        *,
        session: AsyncSession,
        slug: str,
    ) -> CourseRead:
        course = await self.update_course(
            session=session,
            slug=slug,
            payload=CourseUpdate(is_featured=True),
        )
        return course

    async def unfeature_course(
        self,
        *,
        session: AsyncSession,
        slug: str,
    ) -> CourseRead:
        course = await self.update_course(
            session=session,
            slug=slug,
            payload=CourseUpdate(is_featured=False),
        )
        return course

    async def course_exists(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID | None = None,
        slug: str | None = None,
    ) -> bool:
        return (
            await self.get_course_only(
                session=session,
                course_id=course_id,
                slug=slug,
            )
            is not None
        )

    async def get_course_stats(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID,
    ) -> CourseStatsRead:
        enrollment_count = await enrollment_service.count_enrollments(
            session=session,
            course_id=course_id,
        )

        stmt = select(func.sum(CoursePayment.amount)).where(
            CoursePayment.course_id == course_id,
            CoursePayment.status == CoursePaymentStatus.PAID,
        )
        result = await session.execute(stmt)
        total_revenue = result.scalar() or Decimal("0.00")

        return CourseStatsRead(
            enrollment_count=enrollment_count,
            total_revenue=total_revenue,
        )


course_service = CourseService()
