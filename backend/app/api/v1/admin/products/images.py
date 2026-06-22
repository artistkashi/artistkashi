from uuid import UUID

from fastapi import APIRouter

from app.api.dependencies import DatabaseDep
from app.schemas.product import ProductImageRead
from app.schemas.responses import SuccessResponse
from app.services.product_service import product_image_service

router = APIRouter(tags=["Product Images"])


# @router.post("/product/{product_id}",
# response_model=SuccessResponse[ProductImageRead])
# async def add_image(product_id: int, payload:
# ProductImageInput, session: DatabaseDep):
#     image = await product_image_service.add_image(
#         session=session, product_id=product_id, payload=payload
#     )

#     return SuccessResponse(message="Image added successfully", data=image)


@router.get(
    "/product/{product_id}", response_model=SuccessResponse[list[ProductImageRead]]
)
async def get_product_images(product_id: UUID, session: DatabaseDep):
    images = await product_image_service.get_images(
        session=session, product_id=product_id
    )

    return SuccessResponse(message="Images retrieved successfully", data=images)


@router.get("/{image_id}", response_model=SuccessResponse[ProductImageRead])
async def get_image(image_id: int, session: DatabaseDep):
    image = await product_image_service.get_image(
        session=session, image_id=image_id, check=True
    )

    return SuccessResponse(message="Image retrieved successfully", data=image)


# @router.put("/{image_id}", response_model=SuccessResponse[ProductImageRead])
# async def update_image(
#     image_id: int, payload: ProductImageUpdate, session: DatabaseDep
# ):
#     image = await product_image_service.update_image(
#         session=session, image_id=image_id, payload=payload
#     )

#     return SuccessResponse(message="Image updated successfully", data=image)


# @router.delete("/{image_id}", response_model=SuccessResponse[None])
# async def delete_image(image_id: int, session: DatabaseDep):
#     await product_image_service.delete_image(session=session, image_id=image_id)

#     return SuccessResponse(message="Image deleted successfully")
