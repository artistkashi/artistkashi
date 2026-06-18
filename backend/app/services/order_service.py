from datetime import timedelta
from uuid import UUID

import razorpay
from fastcrud import CountConfig, JoinConfig, compute_offset
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    ErrorCode,
    NotFoundException,
    ServiceException,
    ValidationException,
)
from app.crud.order import crud_order, crud_order_item
from app.crud.product import crud_product_variant
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.user import User
from app.schemas.order import (
    AdminOrderRead,
    OrderCreate,
    OrderCreateDB,
    OrderDashboardRead,
    OrderItemCreate,
    OrderItemRead,
    OrderListParams,
    OrderRead,
    PaymentVerificationRequest,
)
from app.schemas.product import ProductVariantCheckDB
from app.schemas.user import PublicUserRead
from app.services.product_service import product_variant_service


class OrderService:
    def __init__(self):
        self.razorpay_client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID or "", settings.RAZORPAY_KEY_SECRET or "")
        )

    async def create_order(
        self,
        db: AsyncSession,
        user_id: UUID,
        payload: OrderCreate,
    ):
        if not payload.items:
            raise ValidationException(message="Order must contain at least one item")
        calculated_total = 0

        for item in payload.items:
            if item.variant_id:
                variant = await product_variant_service.get_product_variant(
                    session=db,
                    filter=ProductVariantCheckDB(id=item.variant_id),
                )

                if not variant:
                    raise NotFoundException(
                        "Product Variant",
                        item.variant_id,
                    )

                if item.quantity <= 0:
                    raise ValidationException(
                        message="Quantity must be greater than zero"
                    )

                if variant.stock_quantity < item.quantity:
                    raise ValidationException(
                        f"Insufficient stock for variant {variant.sku or variant.id}"
                    )

                calculated_total += variant.price * item.quantity

            elif item.course_id:
                calculated_total += item.price * item.quantity

        try:
            print(user_id, calculated_total, payload, "------------")
            order = await crud_order.create(
                db=db,
                object=OrderCreateDB(
                    user_id=user_id,
                    total_amount=calculated_total,
                    shipping_address_id=payload.shipping_address_id,
                    billing_address_id=payload.billing_address_id,
                    payment_method=payload.payment_method,
                ),
                return_as_model=True,
                schema_to_select=OrderRead,
                commit=False,
            )
            print(order)
            order_items = [
                OrderItemCreate(
                    order_id=order.id,
                    **item.model_dump(),
                )
                for item in payload.items
            ]

            await crud_order_item.create_multi(
                db=db,
                objects=order_items,
                commit=False,
            )

            razorpay_order = self.razorpay_client.order.create(
                data={
                    "amount": int(calculated_total * 100),
                    "currency": "INR",
                    "receipt": str(order.id),
                }
            )

            await crud_order.update(
                db=db,
                id=order.id,
                object={
                    "razorpay_order_id": razorpay_order["id"],
                },
                commit=False,
            )

            await db.commit()

            return await crud_order.get_with_relations(
                db=db,
                id=order.id,
                relationships=["items"],
                schema_to_select=OrderRead,
                return_as_model=True,
            )

        except Exception as exc:
            await db.rollback()

            raise ServiceException(
                "Order",
                f"Failed to create order: {exc}",
            ) from exc

    async def verify_payment(
        self,
        db: AsyncSession,
        user_id: UUID,
        order_id: UUID,
        payload: PaymentVerificationRequest,
    ):
        order = await crud_order.get(
            db=db,
            id=order_id,
            user_id=user_id,
            schema_to_select=OrderRead,
            return_as_model=True,
        )

        if not order:
            raise NotFoundException(
                "Order",
                order_id,
                error_code=ErrorCode.ORDER_NOT_FOUND,
            )
        if order.payment_status == PaymentStatus.PAID:
            return await crud_order.get_with_relations(
                db=db,
                id=order.id,
                relationships=["items"],
                schema_to_select=OrderRead,
                return_as_model=True,
            )
        params_dict = {
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        }

        try:
            self.razorpay_client.utility.verify_payment_signature(params_dict)

        except Exception as exc:
            await crud_order.update(
                db=db,
                id=order.id,
                object={
                    "payment_status": PaymentStatus.FAILED,
                },
            )

            raise ValidationException("Invalid payment signature") from exc

        try:
            await crud_order.update(
                db=db,
                id=order.id,
                object={
                    "payment_status": PaymentStatus.PAID,
                    "status": OrderStatus.CONFIRMED,
                    "razorpay_payment_id": payload.razorpay_payment_id,
                    "razorpay_signature": payload.razorpay_signature,
                },
                commit=False,
            )

            order_with_items = await crud_order.get_with_relations(
                db=db,
                id=order.id,
                relationships=["items"],
                schema_to_select=OrderRead,
                return_as_model=True,
            )

            for item in order_with_items.items:
                if not item.variant_id:
                    continue

                variant = await product_variant_service.get_product_variant(
                    session=db,
                    filter=ProductVariantCheckDB(
                        id=item.variant_id,
                    ),
                )

                if not variant:
                    continue

                if variant.stock_quantity < item.quantity:
                    raise ValidationException(
                        message=(
                            f"Stock changed for variant {variant.sku or variant.id}"
                        )
                    )

                await crud_product_variant.update(
                    db=db,
                    id=variant.id,
                    object={
                        "stock_quantity": (variant.stock_quantity - item.quantity),
                    },
                    commit=False,
                )

            await db.commit()

            return await crud_order.get_with_relations(
                db=db,
                id=order.id,
                relationships=["items"],
                schema_to_select=OrderRead,
                return_as_model=True,
            )

        except Exception as exc:
            await db.rollback()

            raise ServiceException(
                "Payment Verification",
                str(exc),
            ) from exc

    async def get_user_orders(
        self, db: AsyncSession, user_id: UUID, page: int = 1, page_size: int = 20
    ):
        return await crud_order.get_multi_with_relations(
            db=db,
            user_id=user_id,
            relationships=["items"],
            offset=(page - 1) * page_size,
            limit=page_size,
            sort_column="created_at",
            sort_order="desc",
        )

    async def get_orders(
        self, db: AsyncSession, params: OrderListParams
    ) -> AdminOrderRead:
        query_filters = {}

        if params.status:
            query_filters["status"] = params.status

        if params.payment_status:
            query_filters["payment_status"] = params.payment_status

        if params.date_start and params.date_end:
            query_filters["created_at__gte"] = params.date_start
            query_filters["created_at__lt"] = params.date_end + timedelta(days=1)

        if params.min_amount is not None:
            query_filters["total_amount__gte"] = params.min_amount

        if params.max_amount is not None:
            query_filters["total_amount__lte"] = params.max_amount

        if params.search:
            query_filters["_or"] = {
                "user.full_name__ilike": f"%{params.search}%",
                "user.email__ilike": f"%{params.search}%",
                "razorpay_order_id__ilike": f"%{params.search}%",
            }

        orders_data = await crud_order.get_multi_joined(
            db=db,
            schema_to_select=OrderDashboardRead,
            joins_config=[
                JoinConfig(
                    model=User,
                    join_on=Order.user_id == User.id,
                    schema_to_select=PublicUserRead,
                    join_type="left",
                    join_prefix="user",
                )
            ],
            counts_config=[
                CountConfig(
                    model=OrderItem,
                    join_on=Order.id == OrderItem.order_id,
                    alias="item_count",
                )
            ],
            nest_joins=True,
            offset=compute_offset(params.page, params.page_size),
            limit=params.page_size,
            sort_columns=["created_at"],
            sort_orders=["desc"],
            return_total_count=True,
            **query_filters,
        )
        return orders_data

    async def get_order_details(
        self, *, session: AsyncSession, order_id: str
    ) -> AdminOrderRead:
        order = await crud_order.get_joined(
            db=session,
            id=order_id,
            schema_to_select=AdminOrderRead,
            return_as_model=True,
            nest_joins=True,
            joins_config=[
                JoinConfig(
                    model=User,
                    join_on=Order.user_id == User.id,
                    schema_to_select=PublicUserRead,
                    join_type="left",
                    join_prefix="user",
                ),
                JoinConfig(
                    model=OrderItem,
                    join_on=Order.id == OrderItem.order_id,
                    schema_to_select=OrderItemRead,
                    join_type="left",
                    join_prefix="items",
                    # this needs to return a LIST not a single nested object
                    # since one order has many items
                ),
            ],
        )

        if not order:
            raise NotFoundException(
                resource="Order",
                identifier=order_id,
                error_code=ErrorCode.ORDER_NOT_FOUND,
            )

        return order


order_service = OrderService()
