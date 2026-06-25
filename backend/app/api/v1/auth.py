from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from fastapi.security import OAuth2PasswordRequestForm

from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    RequestVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.auth_provider import (
    AuthProvidersResponse,
    GoogleAuthRequest,
    SetPasswordRequest,
)
from app.schemas.responses import SuccessResponse
from app.schemas.user import UserCreate, UserRead
from app.schemas.user_session import UserSessionRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

auth_service = AuthService()


def _extract_client_info(request: Request) -> tuple[str | None, str | None]:
    ua = request.headers.get("User-Agent")
    ip = request.client.host if request.client else None
    return ua, ip


@router.post("/register", response_model=SuccessResponse[None])
async def register(payload: UserCreate, session: DatabaseDep):
    await auth_service.register(session=session, payload=payload)

    return SuccessResponse(
        message=(
            "Registration successful. Please check your email to verify your account."
        )
    )


@router.post("/login", response_model=SuccessResponse[TokenResponse])
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    request: Request,
    session: DatabaseDep,
    force: bool = Query(False),
):
    payload = LoginRequest(email=form_data.username, password=form_data.password)
    user_agent, ip_address = _extract_client_info(request)
    result = await auth_service.login(
        session=session,
        payload=payload,
        user_agent=user_agent,
        ip_address=ip_address,
        force=force,
    )

    return SuccessResponse(message="Login successful", data=result)


@router.post("/google", response_model=SuccessResponse[TokenResponse])
async def google_auth(
    payload: GoogleAuthRequest, request: Request, session: DatabaseDep
):
    user_agent, ip_address = _extract_client_info(request)
    result = await auth_service.google_auth(
        session=session,
        credential=payload.credential,
        user_agent=user_agent,
        ip_address=ip_address,
        force=payload.force,
    )

    return SuccessResponse(message="Google authentication successful", data=result)


@router.post("/set-password", response_model=SuccessResponse[None])
async def set_password(
    payload: SetPasswordRequest, user: CurrentUserDep, session: DatabaseDep
):
    await auth_service.set_password(session=session, user=user, payload=payload)

    return SuccessResponse(message="Password set successfully")


@router.get("/providers", response_model=SuccessResponse[AuthProvidersResponse])
async def get_auth_providers(user: CurrentUserDep, session: DatabaseDep):
    result = await auth_service.get_auth_providers(session=session, user_id=user.id)

    return SuccessResponse(message="Auth providers retrieved successfully", data=result)


@router.post("/refresh", response_model=SuccessResponse[TokenResponse])
async def refresh_token(
    payload: RefreshTokenRequest, request: Request, session: DatabaseDep
):
    user_agent, ip_address = _extract_client_info(request)
    result = await auth_service.refresh(
        refresh_token=payload.refresh_token,
        session=session,
        user_agent=user_agent,
        ip_address=ip_address,
    )

    return SuccessResponse(message="Token refreshed successfully", data=result)


@router.get("/me", response_model=SuccessResponse[UserRead])
async def me(user: CurrentUserDep):
    return SuccessResponse(message="User retrieved successfully", data=user)


@router.post("/forgot-password", response_model=SuccessResponse[None])
async def forgot_password(payload: ForgotPasswordRequest, session: DatabaseDep):
    await auth_service.forgot_password(session=session, email=payload.email)

    return SuccessResponse(
        message="If the account exists, a password reset email has been sent."
    )


@router.post("/reset-password", response_model=SuccessResponse[None])
async def reset_password(payload: ResetPasswordRequest, session: DatabaseDep):
    await auth_service.reset_password(
        session=session, token=payload.token, password=payload.password
    )

    return SuccessResponse(message="Password reset successfully")


@router.post("/change-password", response_model=SuccessResponse[None])
async def change_password(
    payload: ChangePasswordRequest, user: CurrentUserDep, session: DatabaseDep
):
    await auth_service.change_password(session=session, user=user, payload=payload)

    return SuccessResponse(message="Password changed successfully")


@router.post("/request-verification", response_model=SuccessResponse[None])
async def request_verification(
    payload: RequestVerificationRequest, session: DatabaseDep
):
    await auth_service.request_verification(session=session, email=payload.email)

    return SuccessResponse(message="Verification email sent")


@router.post("/verify", response_model=SuccessResponse[None])
async def verify_email(payload: VerifyEmailRequest, session: DatabaseDep):
    await auth_service.verify_email(session=session, token=payload.token)

    return SuccessResponse(message="Email verified successfully")


@router.post("/logout", response_model=SuccessResponse[None])
async def logout(payload: LogoutRequest, session: DatabaseDep):
    await auth_service.logout(session=session, refresh_token=payload.refresh_token)

    return SuccessResponse(message="Logged out successfully")


@router.post("/logout-all", response_model=SuccessResponse[None])
async def logout_all(user: CurrentUserDep, session: DatabaseDep):
    await auth_service.logout_all(session=session, user_id=user.id)

    return SuccessResponse(message="Logged out from all devices")


@router.get("/sessions", response_model=SuccessResponse[list[UserSessionRead]])
async def list_sessions(user: CurrentUserDep, session: DatabaseDep):
    sessions = await auth_service.list_sessions(session=session, user_id=user.id)

    return SuccessResponse(message="Sessions retrieved successfully", data=sessions)


@router.post("/link/google", response_model=SuccessResponse[AuthProvidersResponse])
async def link_google(
    payload: GoogleAuthRequest, user: CurrentUserDep, session: DatabaseDep
):
    result = await auth_service.link_google(
        session=session, user=user, credential=payload.credential
    )
    return SuccessResponse(message="Google account linked successfully", data=result)


@router.post("/unlink/google", response_model=SuccessResponse[AuthProvidersResponse])
async def unlink_google(user: CurrentUserDep, session: DatabaseDep):
    result = await auth_service.unlink_google(session=session, user=user)
    return SuccessResponse(message="Google account unlinked successfully", data=result)


@router.delete("/sessions/{session_id}", response_model=SuccessResponse[None])
async def revoke_session(session_id: int, user: CurrentUserDep, session: DatabaseDep):
    await auth_service.revoke_session(
        session=session,
        session_id=session_id,
        user_id=user.id,
    )

    return SuccessResponse(message="Session revoked successfully")
