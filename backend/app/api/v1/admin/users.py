from uuid import UUID

from fastapi import APIRouter, Query
from fastapi import Depends as depends
from pydantic import BaseModel

from app.api.dependencies import DatabaseDep
from app.schemas.responses import PaginatedResponse, SuccessResponse
from app.schemas.user import AdminUserDetailRead, AdminUserListRead
from app.services.admin_user_service import admin_user_service

router = APIRouter(prefix="/users", tags=["ADMIN-USERS"])


class UpdateUserStatusRequest(BaseModel):
    is_active: bool


@router.get("", response_model=PaginatedResponse[AdminUserListRead])
async def list_admin_users(
    session: DatabaseDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    is_deleted: bool | None = Query(None),
    is_verified: bool | None = Query(None),
    provider_type: str | None = Query(None, pattern="^(password|google|both)$"),
    sort_columns: str | None = Query(None, pattern="^(full_name|created_at)$"),
    sort_orders: str | None = Query(None, pattern="^(asc|desc)$"),
):
    return await admin_user_service.list_users(
        session=session,
        page=page,
        page_size=page_size,
        search=search,
        is_active=is_active,
        is_deleted=is_deleted,
        is_verified=is_verified,
        provider_type=provider_type,
        sort_columns=sort_columns,
        sort_orders=sort_orders,
    )

    # return PaginatedResponse(
    #     message="Users retrieved successfully",
    #     data=users,
    #     pagination=pagination,
    # )


@router.get("/{user_id}", response_model=SuccessResponse[AdminUserDetailRead])
async def get_admin_user_detail(
    session: DatabaseDep,
    user_id: UUID,
):
    user = await admin_user_service.get_user_detail(
        session=session,
        user_id=user_id,
    )

    if not user:
        from app.core.exceptions import NotFoundException

        raise NotFoundException(resource="User", identifier=str(user_id))

    return SuccessResponse(
        message="User retrieved successfully",
        data=user,
    )


@router.patch("/{user_id}/status", response_model=SuccessResponse[None])
async def update_user_status(
    session: DatabaseDep,
    user_id: UUID,
    body: UpdateUserStatusRequest,
):
    user = await admin_user_service.get_user_detail(
        session=session,
        user_id=user_id,
    )

    if not user:
        from app.core.exceptions import NotFoundException

        raise NotFoundException(resource="User", identifier=str(user_id))

    if user.is_deleted:
        from app.core.exceptions import AppException

        raise AppException(
            message="Cannot change status of a deleted account", status_code=400
        )

    action = "activated" if body.is_active else "blocked"
    await admin_user_service.update_user_status(
        session=session,
        user_id=user_id,
        is_active=body.is_active,
    )

    return SuccessResponse(
        message=f"User {action} successfully",
        data=None,
    )
