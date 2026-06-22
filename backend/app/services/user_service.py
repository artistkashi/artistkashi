from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.user import crud_user
from app.schemas.user import UserRead, UserReadDB


class UserService:
    async def get_by_id(
        self,
        session: AsyncSession,
        user_id: UUID,
        user_schema: type[UserRead | UserReadDB] = UserRead,
    ):
        return await crud_user.get(
            db=session, id=user_id, return_as_model=True, schema_to_select=user_schema
        )

    async def get_by_email(
        self,
        session: AsyncSession,
        email: str,
        user_schema: type[UserRead | UserReadDB] = UserRead,
    ):
        return await crud_user.get(
            db=session, email=email, return_as_model=True, schema_to_select=user_schema
        )

    async def verify_user(self, session: AsyncSession, user_id: UUID):
        return await crud_user.update(
            db=session, id=user_id, object={"is_verified": True}
        )

    async def update_password(
        self, session: AsyncSession, user_id: UUID, hashed_password: str
    ):
        return await crud_user.update(
            db=session, id=user_id, object={"hashed_password": hashed_password}
        )

    async def deactivate_user(self, session: AsyncSession, user_id: UUID):
        return await crud_user.update(
            db=session, id=user_id, object={"is_active": False}
        )

    async def soft_delete_user(self, session: AsyncSession, user_id: UUID):
        from datetime import UTC, datetime

        return await crud_user.update(
            db=session,
            id=user_id,
            object={
                "is_deleted": True,
                "deleted_at": datetime.now(UTC),
                "is_active": False,
            },
        )

    async def update_profile(
        self,
        session: AsyncSession,
        user_id: UUID,
        update_data: dict,
    ):
        return await crud_user.update(
            db=session,
            id=user_id,
            object=update_data,
        )


user_service = UserService()
