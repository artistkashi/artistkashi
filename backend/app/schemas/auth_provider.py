import uuid

from pydantic import BaseModel, Field

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
