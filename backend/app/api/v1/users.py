from typing import Annotated

from fastapi import APIRouter, File, Form, Query, UploadFile
from fastcrud import compute_offset

from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.core.auth.security import verify_password
from app.core.exceptions import UnauthorizedException
from app.core.pagination import build_paginated_response
from app.crud.user import crud_user
from app.schemas.address import AddressRead
from app.schemas.responses import PaginatedResponse, SuccessResponse
from app.schemas.user import (
    DeleteAccountRequest,
    PublicUserRead,
    UserProfileRead,
)
from app.services.address_service import address_service
from app.services.user_service import user_service

router = APIRouter(tags=["users"])


@router.get("/profiles/me", response_model=SuccessResponse[UserProfileRead])
async def read_own_profile(user: CurrentUserDep, session: DatabaseDep):
    user = await crud_user.get_with_relations(
        db=session,
        id=user.id,
        relationships=["addresses"],
        schema_to_select=UserProfileRead,
    )
    return SuccessResponse(message="Profile retrieved successfully", data=user)


@router.get("/profiles/me/addresses", response_model=SuccessResponse[list[AddressRead]])
async def read_my_addresses(user: CurrentUserDep, session: DatabaseDep):
    addresses = await address_service.list_user_addresses(
        session=session, user_id=user.id
    )

    return SuccessResponse(message="Addresses retrieved successfully", data=addresses)


@router.get("/profiles", response_model=PaginatedResponse[PublicUserRead])
async def list_profiles(
    session: DatabaseDep,
    q: str | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    filters = {"email": q} if q else {}

    users_data = await crud_user.get_multi(
        db=session,
        offset=compute_offset(page, page_size),
        limit=page_size,
        return_total_count=True,
        **filters,
    )
    return build_paginated_response(
        result=users_data,
        page=page,
        page_size=page_size,
        message="Users retrieved successfully",
    )


@router.patch("/profiles/me", response_model=SuccessResponse[UserProfileRead])
async def update_own_profile(
    user: CurrentUserDep,
    session: DatabaseDep,
    full_name: str | None = Form(None),
    phone: str | None = Form(None),
    profile_picture_file: UploadFile | None = File(None),
):
    update_data: dict[str, str | None] = {}
    if full_name is not None:
        update_data["full_name"] = full_name
    if phone is not None:
        update_data["phone"] = phone

    if not update_data and not profile_picture_file:
        return SuccessResponse(
            message="No fields to update",
            data=await crud_user.get_with_relations(
                db=session,
                id=user.id,
                relationships=["addresses"],
                schema_to_select=UserProfileRead,
            ),
        )

    await user_service.update_profile(
        session=session,
        user_id=user.id,
        update_data=update_data,
        profile_picture_file=profile_picture_file,
    )

    updated = await crud_user.get_with_relations(
        db=session,
        id=user.id,
        relationships=["addresses"],
        schema_to_select=UserProfileRead,
    )

    return SuccessResponse(message="Profile updated successfully", data=updated)


@router.delete("/profiles/me", response_model=SuccessResponse[None])
async def delete_own_account(
    user: CurrentUserDep,
    session: DatabaseDep,
    payload: DeleteAccountRequest,
):

    # Check if user has a password — if so, require password confirmation
    has_password = user.hashed_password is not None

    if has_password:
        if not payload.password:
            raise UnauthorizedException("Password is required to delete your account")

        if not verify_password(payload.password, user.hashed_password):
            raise UnauthorizedException("Incorrect password")

    await user_service.delete_account(session=session, user_id=user.id)

    return SuccessResponse(message="Account deleted successfully")
