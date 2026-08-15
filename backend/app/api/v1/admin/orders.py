from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.dependencies import DatabaseDep
from app.core.exceptions import ErrorCode, NotFoundException, ValidationException
from app.core.pagination import build_paginated_response
from app.crud.order import crud_order
from app.crud.user import crud_user as crud_user_admin_order
from app.schemas.order import (
    AdminOrderDetailRead,
    OrderDashboardRead,
    OrderListParams,
    OrderRead,
    OrderShipRequest,
    OrderUpdate,
)
from app.schemas.responses import PaginatedResponse, SuccessResponse
from app.schemas.user import UserRead
from app.services.email.email import (
    send_order_cancelled_email,
    send_order_delivered_email,
)
from app.services.order_service import order_service

router = APIRouter(prefix="/orders", tags=["admin-orders"])


@router.get("", response_model=PaginatedResponse[OrderDashboardRead])
async def list_orders(
    db: DatabaseDep,
    params: Annotated[OrderListParams, Query()],
) -> PaginatedResponse:
    orders_data = await order_service.get_orders(db, params)
    return build_paginated_response(
        result=orders_data,
        page=params.page,
        page_size=params.page_size,
        message="Orders retrieved successfully",
    )


@router.get("/{order_id}", response_model=SuccessResponse[AdminOrderDetailRead])
async def get_order_details(order_id: UUID, db: DatabaseDep) -> SuccessResponse:
    order = await order_service.get_order_detail_with_items(db=db, order_id=order_id)
    if not order:
        raise NotFoundException("Order", order_id, error_code=ErrorCode.ORDER_NOT_FOUND)
    return SuccessResponse(message="Order details retrieved", data=order)


@router.patch("/{order_id}", response_model=SuccessResponse[OrderRead])
async def update_order_status(
    order_id: UUID, payload: OrderUpdate, db: DatabaseDep
) -> SuccessResponse:
    # Row lock so concurrent status updates serialize and cannot both pass
    # the transition guard (prevents e.g. duplicate delivered emails).
    from sqlalchemy import select

    from app.models.order import Order

    stmt = select(Order).where(Order.id == order_id).with_for_update()
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException("Order", order_id, error_code=ErrorCode.ORDER_NOT_FOUND)

    if payload.status is not None:
        VALID_TRANSITIONS: dict[str, set[str]] = {
            "pending": {"confirmed", "cancelled"},
            "confirmed": {"cancelled"},
            "shipped": {"delivered", "cancelled"},
            "delivered": set(),
            "cancelled": set(),
        }
        allowed = VALID_TRANSITIONS.get(order.status.value, set())
        if payload.status.value not in allowed:
            raise ValidationException(
                "Cannot transition from "
                f"'{order.status.value}' to '{payload.status.value}'"
            )

    updated_order = await crud_order.update(db=db, id=order_id, object=payload)

    if payload.status is not None:
        try:
            user = await crud_user_admin_order.get(
                db=db, id=order.user_id, schema_to_select=UserRead, return_as_model=True
            )
            if user:
                order_id_str = str(order_id)
                if payload.status.value == "delivered":
                    await send_order_delivered_email(user=user, order_id=order_id_str)
                elif payload.status.value == "cancelled":
                    await send_order_cancelled_email(user=user, order_id=order_id_str)
        except Exception:
            pass

    return SuccessResponse(message="Order status updated", data=updated_order)


@router.post("/{order_id}/ship", response_model=SuccessResponse[OrderRead])
async def ship_order(
    order_id: UUID, payload: OrderShipRequest, db: DatabaseDep
) -> SuccessResponse:
    order = await order_service.mark_as_shipped(
        db=db, order_id=order_id, payload=payload
    )
    return SuccessResponse(message="Order shipped successfully", data=order)
