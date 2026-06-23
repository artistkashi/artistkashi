
from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.dependencies import DatabaseDep
from app.core.pagination import build_paginated_response
from app.models.course_payment import CoursePayment
from app.schemas.course_payment import AdminCoursePaymentRead
from app.schemas.responses import PaginatedResponse

router = APIRouter(prefix="/course-payments", tags=["admin-course-payments"])


@router.get("", response_model=PaginatedResponse[AdminCoursePaymentRead])
async def list_course_payments(
    db: DatabaseDep,
    page: int = 1,
    page_size: int = 10,
):
    offset = (page - 1) * page_size
    stmt = (
        select(CoursePayment)
        .options(
            joinedload(CoursePayment.user),
            joinedload(CoursePayment.course),
        )
        .order_by(CoursePayment.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    payments = result.unique().scalars().all()

    count_stmt = select(CoursePayment)
    count_result = await db.execute(count_stmt)
    total = len(count_result.scalars().all())

    items = []
    for p in payments:
        item = AdminCoursePaymentRead.model_validate(p)
        item.user_full_name = p.user.full_name if p.user else None
        item.user_email = p.user.email if p.user else None
        item.course_title = p.course.title if p.course else None
        item.course_slug = p.course.slug if p.course else None
        items.append(item)

    return build_paginated_response(
        result={"data": items, "total_count": total},
        page=page,
        page_size=page_size,
        message="Course payments retrieved successfully",
    )
