from typing import Annotated
from uuid import UUID

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth.security import (
    decode_access_token,
    get_user_id_from_token,
)
from app.core.db import get_async_session
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.models.user import Role
from app.schemas.user import UserReadDB
from app.services.user_service import user_service

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
)
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    auto_error=False,
)

type TokenDep = Annotated[
    str,
    Depends(oauth2_scheme),
]
type TokenOptionalDep = Annotated[
    str | None,
    Depends(oauth2_scheme_optional),
]
type DatabaseDep = Annotated[
    AsyncSession,
    Depends(get_async_session),
]


async def get_current_user(
    token: TokenDep,
    session: DatabaseDep,
) -> UserReadDB:
    payload = decode_access_token(token)

    if payload is None:
        raise UnauthorizedException("Invalid or expired token")

    user_id: UUID = get_user_id_from_token(payload)

    user = await user_service.get_by_id(
        session=session,
        user_id=user_id,
        user_schema=UserReadDB,
    )

    if not user:
        raise UnauthorizedException("User not found")

    if user.deleted_at is not None or not user.is_active:
        raise UnauthorizedException("Account has been deleted")

    if not user.is_verified:
        raise UnauthorizedException("Email address not verified")
    return user


type CurrentUserDep = Annotated[
    UserReadDB,
    Depends(get_current_user),
]


async def get_current_admin(
    current_user: CurrentUserDep,
) -> UserReadDB:
    if current_user.role != Role.ADMIN and not getattr(
        current_user, "is_superuser", False
    ):
        raise ForbiddenException("Admin privileges required")

    return current_user


async def get_current_user_optional(
    token: TokenOptionalDep,
    session: DatabaseDep,
) -> UserReadDB | None:
    if token is None:
        return None

    payload = decode_access_token(token)

    if payload is None:
        return None

    user_id: UUID = get_user_id_from_token(payload)

    user = await user_service.get_by_id(
        session=session,
        user_id=user_id,
        user_schema=UserReadDB,
    )

    if not user or user.deleted_at is not None or not user.is_active or not user.is_verified:
        return None

    return user
