from __future__ import annotations

import uuid

from fastcrud import compute_offset
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, ErrorCode, NotFoundException
from app.crud.course import crud_course_category
from app.schemas.course_category import (
    CourseCategoryCreate,
    CourseCategoryRead,
    CourseCategoryUpdate,
)


class CourseCategoryService:
    async def get_category(
        self,
        *,
        session: AsyncSession,
        category_id: uuid.UUID | None = None,
        slug: str | None = None,
        check: bool = False,
    ) -> CourseCategoryRead | None:
        filters: dict = {}
        if category_id is not None:
            filters["id"] = category_id
        elif slug is not None:
            filters["slug"] = slug
        else:
            raise ValueError("Either category_id or slug must be provided")

        category = await crud_course_category.get(
            db=session,
            schema_to_select=CourseCategoryRead,
            return_as_model=True,
            **filters,
        )

        if check and not category:
            raise NotFoundException(
                resource="Course Category",
                identifier=category_id or slug,
                error_code=ErrorCode.COURSE_CATEGORY_NOT_FOUND,
            )

        return category

    async def create_category(
        self, *, session: AsyncSession, payload: CourseCategoryCreate
    ) -> CourseCategoryRead:
        existing = await self.get_category(session=session, slug=payload.slug)

        if existing:
            raise ConflictException(
                message="Course category with this slug already exists",
                error_code=ErrorCode.COURSE_CATEGORY_ALREADY_EXISTS,
            )

        category = await crud_course_category.create(
            db=session,
            object=payload,
            schema_to_select=CourseCategoryRead,
            return_as_model=True,
        )

        if category is None:
            raise RuntimeError("Failed to create course category")

        return category

    async def update_category(
        self,
        *,
        session: AsyncSession,
        category_id: uuid.UUID,
        payload: CourseCategoryUpdate,
    ) -> CourseCategoryRead:
        await self.get_category(session=session, category_id=category_id, check=True)

        if payload.slug:
            existing = await self.get_category(session=session, slug=payload.slug)
            if existing and existing.id != category_id:
                raise ConflictException(
                    message="Course category slug already exists",
                    error_code=ErrorCode.COURSE_CATEGORY_ALREADY_EXISTS,
                )

        updated = await crud_course_category.update(
            db=session,
            id=category_id,
            object=payload.model_dump(exclude_unset=True),
            schema_to_select=CourseCategoryRead,
            return_as_model=True,
        )

        if updated is None:
            raise RuntimeError("Failed to update course category")

        return updated

    async def delete_category(
        self, *, session: AsyncSession, category_id: uuid.UUID
    ) -> None:
        await self.get_category(session=session, category_id=category_id, check=True)

        from app.crud.course import crud_course

        course_exists = await crud_course.get(db=session, category_id=category_id)
        if course_exists:
            raise ConflictException(
                message="Category is used by courses",
                error_code=ErrorCode.CONFLICT,
            )

        await crud_course_category.delete(db=session, id=category_id)

    async def list_categories(
        self, *, session: AsyncSession, page: int = 1, page_size: int = 20
    ) -> dict:
        return await crud_course_category.get_multi(
            db=session,
            offset=compute_offset(page, page_size),
            limit=page_size,
            schema_to_select=CourseCategoryRead,
            return_as_model=True,
            return_total_count=True,
            sort_columns=["name"],
            sort_orders=["asc"],
        )


course_category_service = CourseCategoryService()
