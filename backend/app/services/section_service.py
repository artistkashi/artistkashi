from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ErrorCode, NotFoundException, ValidationException
from app.crud.course import crud_course_section
from app.schemas.course_section import (
    CourseSectionCreate,
    CourseSectionCreateDB,
    CourseSectionRead,
    CourseSectionUpdate,
)
from app.services.course_service import course_service


class SectionService:
    async def create_section(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID,
        payload: CourseSectionCreate,
    ) -> CourseSectionRead:
        await course_service.get_course(
            session=session,
            course_id=course_id,
            check=True,
        )
        max_order = await crud_course_section.get_multi(
            db=session,
            course_id=course_id,
            sort_columns=["sort_order"],
            sort_orders=["desc"],
            limit=1,
        )

        next_order = 0
        if max_order["data"]:
            next_order = (max_order["data"][0]["sort_order"] or 0) + 1

        section = await crud_course_section.create(
            db=session,
            object=CourseSectionCreateDB(
                course_id=course_id,
                title=payload.title,
                description=payload.description,
                sort_order=(
                    payload.sort_order if payload.sort_order is not None else next_order
                ),
            ),
            schema_to_select=CourseSectionRead,
            return_as_model=True,
        )

        return section

    async def get_section(
        self, *, session: AsyncSession, section_id: uuid.UUID
    ) -> CourseSectionRead:
        section = await crud_course_section.get(
            db=session,
            id=section_id,
            schema_to_select=CourseSectionRead,
            return_as_model=True,
            # count_configs=[
            #     CountConfig(
            #         model=CourseLesson,
            #         join_on=CourseLesson.section_id == CourseSection.id,
            #         alias="lesson_count",
            #     )
            # ],
        )

        if not section:
            raise NotFoundException(
                resource="Section",
                identifier=str(section_id),
                error_code=ErrorCode.SECTION_NOT_FOUND,
            )

        return section

    async def update_section(
        self,
        *,
        session: AsyncSession,
        section_id: uuid.UUID,
        payload: CourseSectionUpdate,
    ) -> CourseSectionRead:
        await self.get_section(session=session, section_id=section_id)

        section = await crud_course_section.update(
            db=session,
            id=section_id,
            object=payload.model_dump(exclude_unset=True, mode="python"),
            schema_to_select=CourseSectionRead,
            return_as_model=True,
        )

        return section

    async def delete_section(
        self,
        *,
        session: AsyncSession,
        section_id: uuid.UUID,
    ) -> None:
        await self.get_section(
            session=session,
            section_id=section_id,
        )

        await crud_course_section.delete(
            db=session,
            id=section_id,
        )

    async def list_sections(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID,
    ) -> list[CourseSectionRead]:
        await course_service.get_course(
            session=session,
            course_id=course_id,
            check=True,
        )
        sections = await crud_course_section.get_multi(
            db=session,
            course_id=course_id,
            schema_to_select=CourseSectionRead,
            return_as_model=True,
            sort_columns=["sort_order"],
            sort_orders=["asc"],
            # count_configs=[
            #     CountConfig(
            #         model=CourseLesson,
            #         join_on=CourseLesson.section_id == CourseSection.id,
            #         alias="lesson_count",
            #     )
            # ],
        )

        return sections["data"]

    async def reorder_sections(
        self,
        *,
        session: AsyncSession,
        course_id: uuid.UUID,
        ordered_ids: list[uuid.UUID],
    ) -> list[CourseSectionRead]:
        await course_service.get_course(
            session=session,
            course_id=course_id,
            check=True,
        )
        sections = await crud_course_section.get_multi(
            db=session,
            course_id=course_id,
        )

        valid_ids = {s["id"] for s in sections["data"]}

        if set(ordered_ids) != valid_ids:
            raise ValidationException(message="Invalid section order")

        for index, section_id in enumerate(ordered_ids):
            await crud_course_section.update(
                db=session,
                id=section_id,
                object={"sort_order": index},
            )

        return await self.list_sections(session=session, course_id=course_id)

    async def section_exists(
        self,
        *,
        session: AsyncSession,
        section_id: uuid.UUID,
    ) -> bool:
        return await crud_course_section.exists(
            db=session,
            id=section_id,
        )


section_service = SectionService()
