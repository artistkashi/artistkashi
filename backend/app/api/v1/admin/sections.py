from __future__ import annotations

import uuid

from fastapi import APIRouter, Body

from app.api.dependencies import DatabaseDep
from app.schemas.course_section import (
    CourseSectionCreate,
    CourseSectionRead,
    CourseSectionUpdate,
)
from app.schemas.responses import SuccessResponse
from app.services.course_service import course_service
from app.services.section_service import section_service

router = APIRouter(prefix="/courses/{course_id}/sections", tags=["admin-sections"])


@router.post("", response_model=SuccessResponse[CourseSectionRead])
async def create_section(
    course_id: uuid.UUID,
    payload: CourseSectionCreate,
    session: DatabaseDep,
):
    await course_service.get_course(session=session, course_id=course_id)
    section = await section_service.create_section(
        session=session, course_id=course_id, payload=payload
    )
    return SuccessResponse(message="Section created successfully", data=section)


@router.put("/reorder", response_model=SuccessResponse[list[CourseSectionRead]])
async def reorder_sections(
    course_id: uuid.UUID,
    session: DatabaseDep,
    ordered_ids: list[uuid.UUID] = Body(...),
):
    await course_service.get_course(session=session, course_id=course_id)
    sections = await section_service.reorder_sections(
        session=session, course_id=course_id, ordered_ids=ordered_ids
    )
    return SuccessResponse(message="Sections reordered successfully", data=sections)


@router.put("/{section_id}", response_model=SuccessResponse[CourseSectionRead])
async def update_section(
    course_id: uuid.UUID,
    section_id: uuid.UUID,
    payload: CourseSectionUpdate,
    session: DatabaseDep,
):
    await course_service.get_course(session=session, course_id=course_id)
    section = await section_service.update_section(
        session=session, section_id=section_id, payload=payload
    )
    return SuccessResponse(message="Section updated successfully", data=section)


@router.delete("/{section_id}", response_model=SuccessResponse[None])
async def delete_section(
    course_id: uuid.UUID,
    section_id: uuid.UUID,
    session: DatabaseDep,
):
    await course_service.get_course(session=session, course_id=course_id)
    await section_service.delete_section(session=session, section_id=section_id)
    return SuccessResponse(message="Section deleted successfully")
