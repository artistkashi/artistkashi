from uuid import UUID

from fastapi import APIRouter

from app.api.dependencies import DatabaseDep
from app.schemas.product import (
    ProductVariantRead,
)
from app.schemas.responses import SuccessResponse
from app.services.product_service import product_variant_service

router = APIRouter(
    tags=["Product Variants"],
)


# @router.post(
#     "/product/{product_id}",
#     response_model=SuccessResponse[ProductVariantRead],
# )
# async def create_variant(
#     product_id: int, payload: ProductVariantCreate, session: DatabaseDep
# ):
#     variant = await product_variant_service.create_variant(
#         session=session,
#         product_id=product_id,
#         payload=payload,
#     )

#     return SuccessResponse(
#         message="Variant created successfully",
#         data=variant,
#     )


@router.get(
    "/{variant_id}",
    response_model=SuccessResponse[ProductVariantRead],
)
async def get_variant(variant_id: UUID, session: DatabaseDep):
    variant = await product_variant_service.get_product_variant(
        session=session,
        id=variant_id,
        check=True,
        variant_schema=ProductVariantRead,
    )

    return SuccessResponse(message="Variant retrieved successfully", data=variant)


@router.get(
    "/product/{product_id}",
    response_model=SuccessResponse[list[ProductVariantRead]],
)
async def list_variants(product_id: UUID, session: DatabaseDep):
    variants = await product_variant_service.get_variants(
        session=session,
        product_id=product_id,
    )

    return SuccessResponse(message="Variants retrieved successfully", data=variants)


# @router.put(
#     "/{variant_id}",
#     response_model=SuccessResponse[ProductVariantRead],
# )
# async def update_variant(
#     variant_id: int, payload: ProductVariantUpdate, session: DatabaseDep
# ):
#     variant = await product_variant_service.update_variant(
#         session=session,
#         variant_id=variant_id,
#         payload=payload,
#     )

#     return SuccessResponse(
#         message="Variant updated successfully",
#         data=variant,
#     )


# @router.delete(
#     "/{variant_id}",
#     response_model=SuccessResponse[None],
# )
# async def delete_variant(variant_id: int, session: DatabaseDep):
#     await product_variant_service.delete_variant(
#         session=session,
#         variant_id=variant_id,
#     )

#     return SuccessResponse(
#         message="Variant deleted successfully",
#     )
