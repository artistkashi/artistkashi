import uuid

from pydantic import BaseModel, Field, computed_field

from app.core.schema import TimestampSchema
from app.models.user_auth_provider import ProviderType


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., description="Google ID token from the client")


class SetPasswordRequest(BaseModel):
    password: str = Field(
        ...,
        min_length=8,
        description="New password for the user account",
    )


class UserAuthProviderRead(TimestampSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    provider: ProviderType
    provider_user_id: str | None = None

    model_config = {"from_attributes": True}


class UserAuthProviderCreate(BaseModel):
    user_id: uuid.UUID
    provider: ProviderType
    provider_user_id: str | None = None


class AuthProvidersResponse(BaseModel):
    providers: list[UserAuthProviderRead]
    has_password: bool


class ProviderTypeMixin:
    @computed_field
    @property
    def provider_type(self) -> str | None:

        providers = getattr(self, "auth_providers", [])

        provider_types = {provider.provider for provider in providers}

        if (
            ProviderType.PASSWORD in provider_types
            and ProviderType.GOOGLE in provider_types
        ):
            return "both"

        if ProviderType.PASSWORD in provider_types:
            return "password"

        if ProviderType.GOOGLE in provider_types:
            return "google"

        return None
