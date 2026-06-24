from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.address import crud_address
from app.crud.auth_provider import crud_auth_provider
from app.crud.cart import crud_cart
from app.crud.user import crud_user, crud_user_session
from app.crud.wishlist import crud_wishlist
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

    async def delete_account(
        self,
        session: AsyncSession,
        user_id: UUID,
    ):

        suffix = uuid4().hex[:8]

        # Anonymize user
        await crud_user.update(
            db=session,
            id=user_id,
            commit=False,
            object={
                "email": f"deleted-{user_id}-{suffix}@deleted.local",
                "full_name": "Deleted User",
                "phone": None,
                "profile_picture": None,
                "is_active": False,
                "is_verified": False,
                "is_deleted": True,
                "deleted_at": datetime.now(UTC),
            },
        )

        # Delete cart items
        await crud_cart.delete(
            db=session, allow_multiple=True, commit=False, user_id=user_id
        )

        # Delete wishlist items
        await crud_wishlist.delete(
            db=session, allow_multiple=True, commit=False, user_id=user_id
        )

        # Delete addresses
        await crud_address.delete(
            db=session, allow_multiple=True, commit=False, user_id=user_id
        )

        # Delete OAuth providers (prevents re-link)
        await crud_auth_provider.delete(
            db=session, allow_multiple=True, commit=False, user_id=user_id
        )

        # Revoke all sessions
        await crud_user_session.update(
            db=session,
            allow_multiple=True,
            commit=False,
            object={"revoked": True},
            user_id=user_id,
        )

        await session.commit()


user_service = UserService()
