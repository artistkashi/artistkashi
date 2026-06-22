from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUserDep
from app.core.db import get_async_session
from app.core.pagination import build_paginated_response
from app.schemas.address import AddressCreate, AddressRead, AddressUpdate
from app.schemas.responses import PaginatedResponse, SuccessResponse
from app.services.address_service import AddressService

router = APIRouter(tags=["addresses"])

get_async_session_dep = Depends(get_async_session)

address_service = AddressService()


@router.post(
    "/addresses",
    response_model=SuccessResponse[AddressRead],
)
async def create_address(
    payload: AddressCreate,
    user: CurrentUserDep,
    session: AsyncSession = get_async_session_dep,
):
    address = await address_service.create_address(
        session=session,
        user_id=user.id,
        payload=payload,
    )

    return SuccessResponse(
        message="Address created successfully",
        data=address,
    )


@router.get(
    "/addresses",
    response_model=PaginatedResponse[AddressRead],
)
async def list_addresses(
    user: CurrentUserDep,
    session: AsyncSession = get_async_session_dep,
    page: int = 1,
    page_size: int = 20,
):
    addresses = await address_service.list_addresses(
        session=session,
        user_id=user.id,
        page=page,
        page_size=page_size,
    )

    return build_paginated_response(
        result=addresses,
        page=page,
        page_size=page_size,
        message="Addresses retrieved successfully",
    )


@router.put(
    "/addresses/{address_id}",
    response_model=SuccessResponse[AddressRead],
)
async def update_address(
    address_id: int,
    payload: AddressUpdate,
    user: CurrentUserDep,
    session: AsyncSession = get_async_session_dep,
):
    address = await address_service.update_address(
        session=session,
        user_id=user.id,
        address_id=address_id,
        payload=payload,
    )

    return SuccessResponse(
        message="Address updated successfully",
        data=address,
    )


@router.delete(
    "/addresses/{address_id}",
    response_model=SuccessResponse[None],
)
async def delete_address(
    address_id: int,
    user: CurrentUserDep,
    session: AsyncSession = get_async_session_dep,
):
    await address_service.delete_address(
        session=session,
        user_id=user.id,
        address_id=address_id,
    )

    return SuccessResponse(
        message="Address deleted successfully",
    )
