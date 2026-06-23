from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.api.dependencies import DatabaseDep
from app.crud.course import crud_course_category
from app.schemas.course_category import CourseCategoryRead
from app.schemas.responses import SuccessResponse

router = APIRouter(tags=["course-categories"])


@router.get(
    "/course-categories",
    response_model=SuccessResponse[list[CourseCategoryRead]],
)
async def list_public_course_categories(
    session: DatabaseDep,
) -> Any:
    result = await crud_course_category.get_multi(
        db=session,
        is_active=True,
        schema_to_select=CourseCategoryRead,
        return_as_model=True,
    )
    data = result.get("data", []) if isinstance(result, dict) else result
    return SuccessResponse(
        message="Course categories retrieved successfully", data=data
    )
