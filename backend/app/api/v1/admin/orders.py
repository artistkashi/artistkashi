from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.dependencies import DatabaseDep
from app.core.exceptions import ErrorCode, NotFoundException, ValidationException
from app.core.pagination import build_paginated_response
from app.crud.order import crud_order
from app.schemas.order import (
    AdminOrderDetailRead,
    OrderDashboardRead,
    OrderListParams,
    OrderRead,
    OrderUpdate,
)
from app.schemas.responses import PaginatedResponse, SuccessResponse
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
    order = await crud_order.get(db=db, id=order_id)
    if not order:
        raise NotFoundException("Order", order_id, error_code=ErrorCode.ORDER_NOT_FOUND)

    if payload.status is not None:
        VALID_TRANSITIONS: dict[str, set[str]] = {
            "pending": {"confirmed", "cancelled"},
            "confirmed": {"shipped", "cancelled"},
            "shipped": {"delivered", "cancelled"},
            "delivered": set(),
            "cancelled": set(),
        }
        allowed = VALID_TRANSITIONS.get(order.status.value, set())
        if payload.status.value not in allowed:
            raise ValidationException(
                f"Cannot transition from '{order.status.value}' to '{payload.status.value}'"
            )

    updated_order = await crud_order.update(db=db, id=order_id, object=payload)
    return SuccessResponse(message="Order status updated", data=updated_order)
