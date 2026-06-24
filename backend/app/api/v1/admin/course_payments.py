from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Query

from app.api.dependencies import DatabaseDep
from app.core.pagination import build_paginated_response
from app.schemas.course_payment import AdminCoursePaymentRead
from app.schemas.responses import PaginatedResponse
from app.services.course_payment_service import course_payment_service

router = APIRouter(prefix="/course-payments", tags=["admin-course-payments"])


@router.get("", response_model=PaginatedResponse[AdminCoursePaymentRead])
async def list_course_payments(
    db: DatabaseDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1),
    search: str | None = None,
    status: str | None = None,
    date_start: datetime | None = None,
    date_end: datetime | None = None,
    min_amount: Decimal | None = None,
    max_amount: Decimal | None = None,
):
    result = await course_payment_service.list_course_payments(
        session=db,
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        date_start=date_start,
        date_end=date_end,
        min_amount=min_amount,
        max_amount=max_amount,
    )

    return build_paginated_response(
        result=result,
        page=page,
        page_size=page_size,
        message="Course payments retrieved successfully",
    )
