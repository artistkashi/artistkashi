from datetime import timedelta
from uuid import UUID

import razorpay
from fastcrud import CountConfig, JoinConfig, compute_offset
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, load_only, selectinload

from app.core.config import settings
from app.core.exceptions import (
    ErrorCode,
    NotFoundException,
    ServiceException,
    ValidationException,
)
from app.crud.order import crud_order, crud_order_item
from app.crud.product import crud_product_variant
from app.crud.user import crud_user as crud_user_order
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.product import Product
from app.models.user import User
from app.schemas.order import (
    AdminOrderDetailRead,
    AdminOrderRead,
    OrderCreate,
    OrderCreateDB,
    OrderDashboardRead,
    OrderItemCreate,
    OrderItemDetailRead,
    OrderListParams,
    OrderRead,
    PaymentVerificationRequest,
)
from app.schemas.product import (
    ProductVariantCheckDB,
    ProductVariantRead,
)
from app.schemas.user import PublicUserRead, UserRead
from app.services.email.email import send_order_confirmation_email
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

            elif item.product_id:
                variant = await crud_product_variant.get(
                    db=db,
                    product_id=item.product_id,
                    is_default=True,
                    schema_to_select=ProductVariantRead,
                    return_as_model=True,
                )
                if not variant:
                    raise NotFoundException(
                        "Default Product Variant for product", item.product_id
                    )
                calculated_total += variant.price * item.quantity

            elif item.course_id:
                calculated_total += item.price * item.quantity

        PACKAGING_FEE = 99
        calculated_total += PACKAGING_FEE

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

            try:
                user = await crud_user_order.get(
                    db=db, id=user_id, schema_to_select=UserRead, return_as_model=True
                )
                if user:
                    await send_order_confirmation_email(
                        user=user,
                        order_id=str(order.id),
                    )
            except Exception:
                pass

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
            nest_joins=True,
            offset=compute_offset(params.page, params.page_size),
            limit=params.page_size,
            sort_columns=["created_at"],
            sort_orders=["desc"],
            return_as_model=True,
            **query_filters,
        )

        # Patch item_count to sum quantities instead of counting rows
        if orders_data["data"]:
            order_ids = [
                o["id"] if isinstance(o, dict) else o.id for o in orders_data["data"]
            ]
            sum_qty = await db.execute(
                select(
                    OrderItem.order_id, func.sum(OrderItem.quantity).label("qty_sum")
                )
                .where(OrderItem.order_id.in_(order_ids))
                .group_by(OrderItem.order_id)
            )
            qty_map = {row.order_id: row.qty_sum for row in sum_qty.all()}
            for order in orders_data["data"]:
                oid = order["id"] if isinstance(order, dict) else order.id
                if isinstance(order, dict):
                    order["item_count"] = qty_map.get(oid, 0)
                else:
                    order.item_count = qty_map.get(oid, 0)

        return orders_data

    async def get_order_detail_with_items(
        self, db: AsyncSession, order_id: UUID
    ) -> AdminOrderDetailRead | None:
        stmt = (
            select(Order)
            .options(
                joinedload(Order.user),
                joinedload(Order.items).joinedload(OrderItem.course),
                joinedload(Order.items).joinedload(OrderItem.product).selectinload(Product.images),
                joinedload(Order.items).joinedload(OrderItem.variant),
                joinedload(Order.shipping_address),
            )
            .where(Order.id == order_id)
        )
        result = await db.execute(stmt)
        order = result.unique().scalar_one_or_none()
        if not order:
            return None

        order_data = AdminOrderDetailRead.model_validate(order)
        detail_items: list[OrderItemDetailRead] = []
        for item in order.items:
            base = OrderItemDetailRead.model_validate(item)
            if item.course:
                base.course_title = item.course.title
                base.course_slug = item.course.slug
            if item.product:
                base.product_title = item.product.title
                primary_img = next(
                    (img for img in item.product.images if img.is_primary),
                    item.product.images[0] if item.product.images else None,
                )
                if primary_img:
                    base.product_image = primary_img.image_url
            if item.variant:
                dims = []
                if item.variant.width:
                    dims.append(f"{item.variant.width}{item.variant.dimension_unit}")
                if item.variant.height:
                    dims.append(f"{item.variant.height}{item.variant.dimension_unit}")
                base.variant_dimensions = " × ".join(dims) if dims else None
                base.variant_name = (
                    item.variant.sku
                    or (
                        f"{item.variant.width}×{item.variant.height}{item.variant.dimension_unit}"
                        if item.variant.width and item.variant.height
                        else None
                    )
                    or str(item.variant.id)
                )
            detail_items.append(base)

        order_data.items = detail_items
        return order_data


order_service = OrderService()
