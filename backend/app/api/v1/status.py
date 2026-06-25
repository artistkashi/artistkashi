from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.crud.cart import crud_cart
from app.crud.wishlist import crud_wishlist
from app.schemas.responses import SuccessResponse

router = APIRouter(tags=["status"], prefix="/status")


class StatusCounts(BaseModel):
    wishlist_count: int
    cart_count: int
    cart_total: Decimal = Decimal("0.00")


@router.get("/counts", response_model=SuccessResponse[StatusCounts])
async def get_counts(user: CurrentUserDep, db: DatabaseDep):
    cart = await crud_cart.get_multi(db=db, user_id=user.id)
    cart_items = cart["data"] if isinstance(cart, dict) and "data" in cart else cart
    cart_count = sum(
        item["quantity"] if isinstance(item, dict) else item.quantity
        for item in cart_items
    )

    total = Decimal("0.00")
    for item in cart_items:
        qty = item["quantity"] if isinstance(item, dict) else item.quantity
        if isinstance(item, dict):
            product = item.get("product")
            if product:
                total += Decimal(str(product.get("price", 0))) * qty
        else:
            if (
                hasattr(item, "product")
                and item.product
                and hasattr(item.product, "price")
            ):
                total += item.product.price * qty

    wishlist = await crud_wishlist.get_multi(db=db, user_id=user.id)
    wishlist_items = (
        wishlist["data"]
        if isinstance(wishlist, dict) and "data" in wishlist
        else wishlist
    )
    wishlist_count = len(wishlist_items)

    return SuccessResponse(
        message="Status counts retrieved",
        data=StatusCounts(
            wishlist_count=wishlist_count,
            cart_count=cart_count,
            cart_total=total,
        ),
    )
