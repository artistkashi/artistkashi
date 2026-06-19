"""Google ID token verification service.

SECURITY: This service verifies Google ID tokens server-side using Google's
official `google-auth` library. We NEVER trust frontend-provided email values.
The token's `email` claim is extracted from the verified token payload only.

Requirements:
    - google-auth>=2.29.0
    - GOOGLE_CLIENT_ID configured in settings
"""

from dataclasses import dataclass

from app.core.config import settings
from app.core.exceptions import ServiceException


@dataclass(frozen=True, slots=True)
class GoogleUserData:
    """Verified data extracted from a Google ID token."""

    sub: str
    email: str
    name: str
    picture: str | None
    email_verified: bool


def verify_google_token(credential: str) -> GoogleUserData:
    """Verify a Google ID token and return the user data.

    The token is verified against the configured GOOGLE_CLIENT_ID.
    Only the `sub` (Google user ID) is used as the provider_user_id.
    The email is extracted from the verified token, NOT from the client.

    Raises:
        ServiceException: If GOOGLE_CLIENT_ID is not configured,
            token verification fails, or the token is invalid.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise ServiceException(
            service="Google",
            message="Google OAuth is not configured",
        )

    try:
        from google.auth.transport import requests
        from google.oauth2 import id_token

        info: dict = id_token.verify_oauth2_token(
            credential,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except ValueError as e:
        raise ServiceException(
            service="Google",
            message=f"Invalid Google token: {e}",
        )
    except Exception as e:
        raise ServiceException(
            service="Google",
            message=f"Google token verification failed: {e}",
        )

    if info.get("iss") not in (
        "accounts.google.com",
        "https://accounts.google.com",
    ):
        raise ServiceException(
            service="Google",
            message="Invalid token issuer",
        )

    return GoogleUserData(
        sub=str(info["sub"]),
        email=str(info.get("email", "")),
        name=str(info.get("name", "")),
        picture=info.get("picture"),
        email_verified=bool(info.get("email_verified", False)),
    )
