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
from app.crud.auth_provider import crud_auth_provider
from app.crud.user import crud_user, crud_user_session
from app.models.user_auth_provider import ProviderType
from app.schemas.auth import ChangePasswordRequest, LoginRequest, TokenResponse
from app.schemas.auth_provider import (
    AuthProvidersResponse,
    SetPasswordRequest,
    UserAuthProviderCreate,
    UserAuthProviderRead,
)
from app.schemas.user import (
    User as UserSchema,
)
from app.schemas.user import (
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
from app.services.google_auth_service import verify_google_token
from app.services.user_service import user_service


class AuthService:
    async def register(
        self,
        session: AsyncSession,
        payload: UserCreate,
    ) -> TokenResponse | None:

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
            session=session, email=payload.email, user_schema=UserSchema
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
                message="",
                error_code=ErrorCode.ACCOUNT_EXISTS_WITH_GOOGLE
                if not existing.hashed_password
                else ErrorCode.USER_ALREADY_EXISTS,
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

        # Create password auth provider for the new user
        await crud_auth_provider.create(
            db=session,
            object=UserAuthProviderCreate(
                user_id=user.id,
                provider=ProviderType.PASSWORD,
                provider_user_id=None,
            ),
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
            user_schema=UserSchema,
        )

        if not user:
            raise UnauthorizedException("Invalid email or password")

        if not user.hashed_password:
            raise UnauthorizedException(
                "This account uses Google Sign-In. Please sign in with Google."
            )

        if not verify_password(
            payload.password,
            user.hashed_password,
        ):
            raise UnauthorizedException("Invalid email or password")

        if not user.is_verified:
            raise UnauthorizedException("Please verify your email address first")

        if not user.is_active:
            raise UnauthorizedException("User account is blocked")

        if getattr(user, "is_deleted", False):
            raise UnauthorizedException("This account has been deleted")

        return await self._issue_tokens(session=session, user=user)

    async def _issue_tokens(
        self,
        *,
        session: AsyncSession,
        user: UserSchema,
    ) -> TokenResponse:
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

    async def google_auth(
        self,
        *,
        session: AsyncSession,
        credential: str,
    ) -> TokenResponse:
        # SECURITY: Verify the Google ID token server-side.
        # The email is extracted from the verified token, NOT from the client.
        google_user = verify_google_token(credential)

        # CASE 2: Check if Google provider already exists
        existing_provider = await crud_auth_provider.get(
            db=session,
            provider=ProviderType.GOOGLE,
            provider_user_id=google_user.sub,
            return_as_model=True,
            schema_to_select=UserAuthProviderRead,
        )

        if existing_provider:
            user = await user_service.get_by_id(
                session=session,
                user_id=existing_provider.user_id,
                user_schema=UserSchema,
            )
            if not user:
                raise UnauthorizedException("User not found")
            return await self._issue_tokens(session=session, user=user)

        # CASE 3: User exists by email but no Google provider linked
        existing_user = await user_service.get_by_email(
            session=session,
            email=google_user.email,
            user_schema=UserSchema,
        )

        if existing_user:
            # Link Google provider to existing account
            await crud_auth_provider.create(
                db=session,
                object=UserAuthProviderCreate(
                    user_id=existing_user.id,
                    provider=ProviderType.GOOGLE,
                    provider_user_id=google_user.sub,
                ),
            )

            if not existing_user.is_verified and google_user.email_verified:
                await user_service.verify_user(
                    session=session,
                    user_id=existing_user.id,
                )

            # Update profile info from Google if missing
            update_data = {}
            if not existing_user.full_name and google_user.name:
                update_data["full_name"] = google_user.name
            if not existing_user.profile_picture and google_user.picture:
                update_data["profile_picture"] = google_user.picture
            if update_data:
                await crud_user.update(
                    db=session,
                    id=existing_user.id,
                    object=update_data,
                )

            return await self._issue_tokens(session=session, user=existing_user)

        # CASE 1: New user - create account with Google provider
        user = await crud_user.create(
            db=session,
            object=UserCreateDB(
                email=google_user.email,
                full_name=google_user.name,
                hashed_password=None,
                profile_picture=google_user.picture,
            ),
            schema_to_select=UserRead,
            return_as_model=True,
        )

        await crud_auth_provider.create(
            db=session,
            object=UserAuthProviderCreate(
                user_id=user.id,
                provider=ProviderType.GOOGLE,
                provider_user_id=google_user.sub,
            ),
        )

        if google_user.email_verified:
            await user_service.verify_user(
                session=session,
                user_id=user.id,
            )

        user_model = await user_service.get_by_id(
            session=session,
            user_id=user.id,
            user_schema=UserSchema,
        )
        if not user_model:
            raise UnauthorizedException("Failed to create user")

        return await self._issue_tokens(session=session, user=user_model)

    async def set_password(
        self,
        *,
        session: AsyncSession,
        user: UserSchema,
        payload: SetPasswordRequest,
    ) -> None:
        # Check that user doesn't already have a password provider
        existing_password_provider = await crud_auth_provider.get(
            db=session,
            user_id=user.id,
            provider=ProviderType.PASSWORD,
        )

        if existing_password_provider:
            raise ConflictException(
                message="Password login is already set up for this account",
                error_code=ErrorCode.PASSWORD_PROVIDER_EXISTS,
            )

        errors = validate_password_rules(
            user.email,
            payload.password,
        )

        if errors:
            raise ValidationException(
                message="Password validation failed",
                details={
                    "password": errors,
                },
            )

        hashed = hash_password(payload.password)
        await crud_user.update(
            db=session,
            id=user.id,
            object={"hashed_password": hashed},
        )

        await crud_auth_provider.create(
            db=session,
            object=UserAuthProviderCreate(
                user_id=user.id,
                provider=ProviderType.PASSWORD,
                provider_user_id=None,
            ),
        )

    async def get_auth_providers(
        self, *, session: AsyncSession, user_id: UUID
    ) -> AuthProvidersResponse:

        result = await crud_auth_provider.get_multi(
            db=session,
            user_id=user_id,
            schema_to_select=UserAuthProviderRead,
            return_as_model=True,
            return_total_count=False,
        )
        print(result)

        providers = result["data"]

        has_password = any(
            provider.provider == ProviderType.PASSWORD for provider in providers
        )

        return AuthProvidersResponse(
            providers=providers,
            has_password=has_password,
        )

    async def refresh(
        self,
        refresh_token: str,
        session: AsyncSession,
    ) -> TokenResponse:

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
            object=UserSessionCreate(
                user_id=user_id,
                refresh_token_jti=get_token_jti(new_payload),
                expires_at=get_token_expiry(new_payload),
            ),
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
        self,
        *,
        session: AsyncSession,
        user: UserSchema,
        payload: ChangePasswordRequest,
    ) -> None:
        if not user.hashed_password:
            raise UnauthorizedException(
                "This account uses Google Sign-In. Set a password first."
            )

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
