from uuid import UUID

from fastapi import APIRouter

from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.core.exceptions import ErrorCode, NotFoundException
from app.core.pagination import build_paginated_response
from app.schemas.order import (
    OrderCreate,
    OrderRead,
    PaymentVerificationRequest,
)
from app.schemas.responses import PaginatedResponse, SuccessResponse
from app.services.order_service import order_service

router = APIRouter(tags=["orders"], prefix="/orders")


@router.post("", response_model=SuccessResponse[OrderRead])
async def create_order(
    payload: OrderCreate, user: CurrentUserDep, db: DatabaseDep
) -> SuccessResponse:
    order = await order_service.create_order(db=db, user_id=user.id, payload=payload)
    return SuccessResponse(message="Order created successfully", data=order)


@router.get("", response_model=PaginatedResponse[OrderRead])
async def list_my_orders(
    user: CurrentUserDep,
    db: DatabaseDep,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse:
    orders = await order_service.get_user_orders(
        db=db, user_id=user.id, page=page, page_size=page_size
    )
    return build_paginated_response(
        result=orders,
        page=page,
        page_size=page_size,
        message="Orders retrieved successfully",
    )


@router.get("/{order_id}", response_model=SuccessResponse[OrderRead])
async def get_order_details(
    order_id: UUID, user: CurrentUserDep, db: DatabaseDep
) -> SuccessResponse:
    from app.crud.order import crud_order

    order = await crud_order.get_with_relations(
        db=db, id=order_id, user_id=user.id, relationships=["items"]
    )
    if not order:
        raise NotFoundException("Order", order_id, error_code=ErrorCode.ORDER_NOT_FOUND)

    return SuccessResponse(message="Order details retrieved", data=order)


@router.post("/{order_id}/verify-payment", response_model=SuccessResponse[OrderRead])
async def verify_payment(
    order_id: UUID,
    payload: PaymentVerificationRequest,
    user: CurrentUserDep,
    db: DatabaseDep,
) -> SuccessResponse:
    order = await order_service.verify_payment(
        db=db, user_id=user.id, order_id=order_id, payload=payload
    )
    return SuccessResponse(message="Payment verified successfully", data=order)
