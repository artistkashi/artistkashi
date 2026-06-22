from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, Query, UploadFile
from pydantic import Json

from app.api.dependencies import DatabaseDep
from app.models.course import CourseLevel
from app.schemas.course import (
    CourseCreate,
    CourseListRead,
    CourseRead,
    CourseStatsRead,
    CourseUpdate,
)
from app.schemas.responses import PaginatedResponse, SuccessResponse
from app.services.course_service import course_service

router = APIRouter(prefix="/courses", tags=["admin-courses"])


@router.post("", response_model=SuccessResponse[CourseRead])
async def create_course(
    session: DatabaseDep,
    payload: Annotated[Json[CourseCreate], Form()],
    thumbnail: UploadFile | None = File(None),
    demo_video: UploadFile | None = File(None),
):
    course = await course_service.create_course(
        session=session, payload=payload, thumbnail=thumbnail, demo_video=demo_video
    )
    return SuccessResponse(message="Course created successfully", data=course)


@router.get("/{slug}", response_model=SuccessResponse[CourseRead])
async def get_course(
    slug: str,
    session: DatabaseDep,
):
    print(slug)
    course = await course_service.get_course(session=session, course_id=slug)
    return SuccessResponse(message="Course retrieved successfully", data=course)


@router.put("/{slug}", response_model=SuccessResponse[CourseRead])
async def update_course(
    slug: str,
    session: DatabaseDep,
    payload: Annotated[Json[CourseUpdate], Form()],
    thumbnail: UploadFile | None = File(None),
    demo_video: UploadFile | None = File(None),
):
    course = await course_service.update_course(
        session=session,
        slug=slug,
        payload=payload,
        thumbnail=thumbnail,
        demo_video=demo_video,
    )
    return SuccessResponse(message="Course updated successfully", data=course)


@router.delete("/{slug}", response_model=SuccessResponse[None])
async def delete_course(
    slug: str,
    session: DatabaseDep,
):
    await course_service.delete_course(session=session, slug=slug)
    return SuccessResponse(message="Course deleted successfully")


@router.post("/{slug}/publish", response_model=SuccessResponse[CourseRead])
async def publish_course(
    slug: str,
    session: DatabaseDep,
):
    course = await course_service.publish_course(session=session, slug=slug)
    return SuccessResponse(message="Course published successfully", data=course)


@router.post("/{slug}/unpublish", response_model=SuccessResponse[CourseRead])
async def unpublish_course(
    slug: str,
    session: DatabaseDep,
):
    course = await course_service.unpublish_course(session=session, slug=slug)
    return SuccessResponse(message="Course unpublished successfully", data=course)


@router.post("/{slug}/feature", response_model=SuccessResponse[CourseRead])
async def feature_course(
    slug: str,
    session: DatabaseDep,
):
    course = await course_service.feature_course(session=session, slug=slug)
    return SuccessResponse(message="Course featured successfully", data=course)


@router.post("/{slug}/unfeature", response_model=SuccessResponse[CourseRead])
async def unfeature_course(
    slug: str,
    session: DatabaseDep,
):
    course = await course_service.unfeature_course(session=session, slug=slug)
    return SuccessResponse(message="Course unfeatured successfully", data=course)


@router.get("/{course_id}/stats", response_model=SuccessResponse[CourseStatsRead])
async def get_course_stats(
    course_id: str,
    session: DatabaseDep,
):
    # course = await course_service.get_course_only(
    #     session=session, slug=slug, check=True
    # )
    stats = await course_service.get_course_stats(
        session=session,
        course_id=course_id,
    )
    return SuccessResponse(message="Course stats retrieved successfully", data=stats)


@router.get("", response_model=PaginatedResponse[CourseListRead])
async def list_courses(
    session: DatabaseDep,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1)] = 20,
    is_published: bool | None = None,
    is_featured: bool | None = None,
    level: CourseLevel | None = None,
    language: str | None = None,
    category: str | None = Query(None, max_length=120),
):
    result = await course_service.list_courses(
        session=session,
        page=page,
        page_size=page_size,
        is_published=is_published,
        is_featured=is_featured,
        level=level,
        language=language,
        category_slug=category,
    )
    return result
