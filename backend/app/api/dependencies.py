from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth.dependencies import (
    get_current_admin,
    get_current_user,
    get_current_user_optional,
)
from app.core.db import get_async_session
from app.schemas.user import UserReadDB

type DatabaseDep = Annotated[
    AsyncSession,
    Depends(get_async_session),
]

type CurrentUserDep = Annotated[
    UserReadDB,
    Depends(get_current_user),
]


type CurrentAdminDep = Annotated[
    UserReadDB,
    Depends(get_current_admin),
]

type CurrentUserOptionalDep = Annotated[
    UserReadDB | None,
    Depends(get_current_user_optional),
]
