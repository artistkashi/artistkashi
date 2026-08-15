from decimal import Decimal
from uuid import UUID

from fastcrud import compute_offset
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import build_paginated_response
from app.crud.course import crud_course_enrollment
from app.crud.order import crud_order
from app.crud.user import crud_user
from app.models.course_payment import CoursePayment, CoursePaymentStatus
from app.models.order import Order, PaymentStatus
from app.models.user_auth_provider import ProviderType
from app.schemas.responses import PaginatedResponse
from app.schemas.user import AdminUserDetailRead, AdminUserListRead


class AdminUserService:
    async def list_users(
        self,
        session: AsyncSession,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        is_active: bool | None = None,
        is_deleted: bool | None = None,
        is_verified: bool | None = None,
        provider_type: str | None = None,
        sort_columns: str | None = None,
        sort_orders: str | None = None,
    ) -> PaginatedResponse[AdminUserListRead]:
        filters = {"is_superuser": False}
        if is_active is not None:
            filters["is_active"] = is_active
        if is_deleted is not None:
            filters["is_deleted"] = is_deleted
        if is_verified is not None:
            filters["is_verified"] = is_verified
        if search:
            like = f"%{search}%"
            filters["_or"] = {
                "full_name__ilike": like,
                "email__ilike": like,
            }

        if provider_type == "google":
            filters["auth_providers__provider"] = ProviderType.GOOGLE
        elif provider_type == "password":
            filters["auth_providers__provider"] = ProviderType.PASSWORD

        result = await crud_user.get_multi_joined(
            db=session,
            auto_detect_relationships=["auth_providers"],
            offset=compute_offset(page, page_size),
            limit=page_size,
            sort_columns=sort_columns or "created_at",
            sort_orders=sort_orders or "desc",
            nest_joins=True,
            return_as_model=True,
            schema_to_select=AdminUserListRead,
            **filters,
        )

        return build_paginated_response(
            result=result,
            page=page,
            page_size=page_size,
            message="Users retrieved successfully",
        )

    async def get_user_detail(
        self,
        session: AsyncSession,
        user_id: UUID,
    ) -> AdminUserDetailRead | None:

        user = await crud_user.get_joined(
            db=session,
            id=user_id,
            auto_detect_relationships=["auth_providers", "addresses"],
            nest_joins=True,
            return_as_model=True,
            schema_to_select=AdminUserDetailRead,
        )

        if not user:
            return None

        user.orders_count = await crud_order.count(
            db=session,
            user_id=user_id,
        )

        user.enrollments_count = await crud_course_enrollment.count(
            db=session,
            user_id=user_id,
        )

        products_result = await session.execute(
            select(func.sum(Order.total_amount)).where(
                Order.user_id == user_id,
                Order.payment_status == PaymentStatus.PAID,
            )
        )
        products_spent = products_result.scalar() or Decimal("0.00")

        courses_result = await session.execute(
            select(func.sum(CoursePayment.amount)).where(
                CoursePayment.user_id == user_id,
                CoursePayment.status == CoursePaymentStatus.PAID,
            )
        )
        courses_spent = courses_result.scalar() or Decimal("0.00")

        user.products_spent = f"{products_spent:.2f}"
        user.courses_spent = f"{courses_spent:.2f}"
        user.total_spent = f"{products_spent + courses_spent:.2f}"

        return user

    async def update_user_status(
        self,
        session: AsyncSession,
        user_id: UUID,
        *,
        is_active: bool,
    ) -> None:
        await crud_user.update(
            db=session,
            id=user_id,
            object={"is_active": is_active},
        )


admin_user_service = AdminUserService()
