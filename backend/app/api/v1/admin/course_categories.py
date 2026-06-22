from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies import DatabaseDep
from app.core.pagination import build_paginated_response
from app.schemas.course_category import (
    CourseCategoryCreate,
    CourseCategoryRead,
    CourseCategoryUpdate,
)
from app.schemas.responses import PaginatedResponse, SuccessResponse
from app.services.course_category_service import course_category_service

router = APIRouter(prefix="/course-categories", tags=["admin-course-categories"])


@router.post("", response_model=SuccessResponse[CourseCategoryRead])
async def create_course_category(
    payload: CourseCategoryCreate,
    session: DatabaseDep,
):
    category = await course_category_service.create_category(
        session=session, payload=payload
    )
    return SuccessResponse(
        message="Course category created successfully", data=category
    )


@router.get("/{category_id}", response_model=SuccessResponse[CourseCategoryRead])
async def get_course_category(category_id: uuid.UUID, session: DatabaseDep):
    category = await course_category_service.get_category(
        session=session, category_id=category_id, check=True
    )
    return SuccessResponse(
        message="Course category retrieved successfully", data=category
    )


@router.get("", response_model=PaginatedResponse[CourseCategoryRead])
async def list_course_categories(
    session: DatabaseDep,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1)] = 20,
):
    categories = await course_category_service.list_categories(
        session=session, page=page, page_size=page_size
    )
    return build_paginated_response(
        result=categories,
        page=page,
        page_size=page_size,
        message="Course categories retrieved successfully",
    )


@router.put("/{category_id}", response_model=SuccessResponse[CourseCategoryRead])
async def update_course_category(
    category_id: uuid.UUID,
    payload: CourseCategoryUpdate,
    session: DatabaseDep,
):
    category = await course_category_service.update_category(
        session=session, category_id=category_id, payload=payload
    )
    return SuccessResponse(
        message="Course category updated successfully", data=category
    )


@router.delete("/{category_id}", response_model=SuccessResponse[None])
async def delete_course_category(
    category_id: uuid.UUID,
    session: DatabaseDep,
):
    await course_category_service.delete_category(
        session=session, category_id=category_id
    )
    return SuccessResponse(message="Course category deleted successfully")
