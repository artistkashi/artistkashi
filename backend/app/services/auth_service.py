from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth.password_policy import validate_password_rules
from app.core.auth.security import (
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    create_refresh_token,
    decode_password_reset_token,
    decode_refresh_token,
    decode_verification_token,
    get_token_expiry,
    get_token_jti,
    get_user_id_from_token,
    hash_password,
    verify_password,
)
from app.core.exceptions import (
    ConflictException,
    ErrorCode,
    UnauthorizedException,
    ValidationException,
)
from app.crud.user import crud_user, crud_user_session
from app.schemas.auth import ChangePasswordRequest, LoginRequest, TokenResponse
from app.schemas.user import (
    User,
    UserCreate,
    UserCreateDB,
    UserRead,
)
from app.schemas.user_session import UserSessionCreate
from app.services.email.email import (
    send_reset_password_email,
    send_verification_email,
    send_welcome_email,
)
from app.services.user_service import user_service


class AuthService:
    async def register(
        self,
        session: AsyncSession,
        payload: UserCreate,
    ) -> TokenResponse:

        errors = validate_password_rules(
            payload.email,
            payload.password,
        )

        if errors:
            raise ValidationException(
                message="Password validation failed",
                details={
                    "password": errors,
                },
            )

        existing = await user_service.get_by_email(
            session=session,
            email=payload.email,
        )

        if existing:
            if not existing.is_verified:
                verification_token = create_email_verification_token(
                    user_id=existing.id
                )

                await send_verification_email(
                    user=existing,
                    token=verification_token,
                )

                return None
            raise ConflictException(
                message="User already exists",
                error_code=ErrorCode.USER_ALREADY_EXISTS,
            )

        user = await crud_user.create(
            db=session,
            object=UserCreateDB(
                email=payload.email,
                full_name=payload.full_name,
                phone=payload.phone,
                hashed_password=hash_password(payload.password),
            ),
            schema_to_select=UserRead,
            return_as_model=True,
        )

        verification_token = create_email_verification_token(
            user_id=user.id,
        )

        await send_verification_email(
            user=user,
            token=verification_token,
        )
        return None

    async def login(
        self,
        *,
        session: AsyncSession,
        payload: LoginRequest,
    ) -> TokenResponse:

        user = await user_service.get_by_email(
            session=session,
            email=payload.email,
            user_schema=User,
        )

        if not user:
            raise UnauthorizedException("Invalid email or password")

        if not verify_password(
            payload.password,
            user.hashed_password,
        ):
            raise UnauthorizedException("Invalid email or password")

        if not user.is_verified:
            raise UnauthorizedException("Please verify your email address first")

        if not user.is_active:
            raise UnauthorizedException("User account is Blocked")

        access_token = create_access_token(
            user_id=user.id,
        )

        refresh_token = create_refresh_token(
            user_id=user.id,
        )
        refresh_payload = decode_refresh_token(
            refresh_token,
        )

        if refresh_payload is None:
            raise UnauthorizedException("Failed to create refresh token")

        await crud_user_session.create(
            db=session,
            object=UserSessionCreate(
                user_id=user.id,
                refresh_token_jti=get_token_jti(refresh_payload),
                expires_at=get_token_expiry(refresh_payload),
            ),
        )
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        )

    async def refresh(self, refresh_token: str, session: AsyncSession) -> TokenResponse:

        payload = decode_refresh_token(refresh_token)

        if payload is None:
            raise UnauthorizedException("Invalid refresh token")

        jti = get_token_jti(payload)
        session_record = await crud_user_session.get(
            db=session,
            refresh_token_jti=jti,
        )
        if not session_record:
            raise UnauthorizedException("Session not found")

        if session_record.revoked:
            raise UnauthorizedException("Session revoked")

        await crud_user_session.update(
            db=session,
            id=session_record.id,
            object={
                "revoked": True,
            },
        )
        user_id: UUID = get_user_id_from_token(
            payload,
        )
        new_refresh_token = create_refresh_token(
            user_id=user_id,
        )

        new_payload = decode_refresh_token(
            new_refresh_token,
        )

        if new_payload is None:
            raise UnauthorizedException("Failed to create refresh token")

        await crud_user_session.create(
            db=session,
            object={
                "user_id": user_id,
                "refresh_token_jti": get_token_jti(
                    new_payload,
                ),
                "expires_at": get_token_expiry(
                    new_payload,
                ),
            },
        )
        return TokenResponse(
            access_token=create_access_token(
                user_id=user_id,
            ),
            refresh_token=new_refresh_token,
            token_type="bearer",
        )

    async def request_verification(
        self,
        *,
        session: AsyncSession,
        email: str,
    ) -> None:

        user = await user_service.get_by_email(
            session=session,
            email=email,
        )

        if not user:
            return

        if user.is_verified:
            raise ConflictException(
                message="Email already verified",
                error_code=ErrorCode.EMAIL_ALREADY_VERIFIED,
            )

        token = create_email_verification_token(
            user_id=user.id,
        )

        await send_verification_email(
            user=user,
            token=token,
        )

    async def verify_email(
        self,
        *,
        session: AsyncSession,
        token: str,
    ) -> None:

        payload = decode_verification_token(
            token,
        )

        if payload is None:
            raise UnauthorizedException("Invalid or expired verification token")

        user_id = get_user_id_from_token(
            payload,
        )

        user = await user_service.get_by_id(
            session=session,
            user_id=user_id,
        )

        if not user:
            raise UnauthorizedException("Invalid verification token")

        if user.is_verified:
            raise ConflictException(
                message="Email already verified",
                error_code=ErrorCode.EMAIL_ALREADY_VERIFIED,
            )

        await user_service.verify_user(
            session=session,
            user_id=user.id,
        )

        await send_welcome_email(
            user,
        )

    async def forgot_password(
        self,
        *,
        session: AsyncSession,
        email: str,
    ) -> None:

        user = await user_service.get_by_email(
            session=session,
            email=email,
        )

        if not user:
            return

        token = create_password_reset_token(
            user_id=user.id,
        )

        await send_reset_password_email(
            user=user,
            token=token,
        )

    async def reset_password(
        self,
        *,
        session: AsyncSession,
        token: str,
        password: str,
    ) -> None:

        payload = decode_password_reset_token(
            token,
        )

        if payload is None:
            raise UnauthorizedException("Invalid or expired reset token")

        user_id = get_user_id_from_token(
            payload,
        )

        user = await user_service.get_by_id(
            session=session,
            user_id=user_id,
        )

        if not user:
            raise UnauthorizedException("Invalid reset token")

        errors = validate_password_rules(
            user.email,
            password,
        )

        if errors:
            raise ValidationException(
                message="Password validation failed",
                details={
                    "password": errors,
                },
            )

        await user_service.update_password(
            session=session,
            user_id=user.id,
            hashed_password=hash_password(password),
        )

    async def change_password(
        self, *, session: AsyncSession, user: User, payload: ChangePasswordRequest
    ) -> None:
        if not verify_password(
            payload.current_password,
            user.hashed_password,
        ):
            raise UnauthorizedException("Current password is incorrect")

        errors = validate_password_rules(
            user.email,
            payload.new_password,
        )

        if errors:
            raise ValidationException(
                message="Password validation failed",
                details={
                    "new_password": errors,
                },
            )

        await user_service.update_password(
            session=session,
            user_id=user.id,
            hashed_password=hash_password(payload.new_password),
        )

    async def logout(
        self,
        *,
        session: AsyncSession,
        refresh_token: str,
    ) -> None:
        payload = decode_refresh_token(refresh_token)

        if payload is None:
            raise UnauthorizedException("Invalid refresh token")

        jti = get_token_jti(
            payload,
        )

        session_record = await crud_user_session.get(
            db=session,
            refresh_token_jti=jti,
        )

        if session_record:
            await crud_user_session.update(
                db=session,
                refresh_token_jti=jti,
                object={
                    "revoked": True,
                },
            )

    async def logout_all(
        self,
        *,
        session: AsyncSession,
        user_id: UUID,
    ) -> None:
        await crud_user_session.update(
            db=session,
            allow_multiple=True,
            user_id=user_id,
            object={
                "revoked": True,
            },
        )
