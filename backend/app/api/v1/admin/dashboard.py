from fastapi import APIRouter

from app.api.dependencies import DatabaseDep
from app.crud.course import crud_course
from app.crud.order import crud_order
from app.crud.product import crud_product
from app.crud.user import crud_user
from app.schemas.responses import SuccessResponse

router = APIRouter(prefix="/dashboard", tags=["admin-dashboard"])


@router.get("/overview", response_model=SuccessResponse[dict[str, int]])
async def overview(db: DatabaseDep):
    users_count = await crud_user.count(db=db)
    courses_count = await crud_course.count(db=db)
    products_count = await crud_product.count(db=db)
    orders_count = await crud_order.count(db=db)

    return SuccessResponse(
        message="Admin overview retrieved successfully",
        data={
            "users": users_count,
            "courses": courses_count,
            "products": products_count,
            "orders": orders_count,
        },
    )
