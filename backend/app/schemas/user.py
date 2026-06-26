from datetime import datetime
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    ValidationInfo,
    field_validator,
)

from app.core.schema import PersistentDeletion, TimestampSchemaRead, UUIDSchema
from app.models.user import Role
from app.schemas.address import AddressRead
from app.schemas.auth_provider import ProviderTypeMixin, UserAuthProviderRead


class UserBase(BaseModel):
    full_name: Annotated[str, Field(min_length=2, max_length=30, examples=["John Doe"])]
    email: Annotated[EmailStr, Field(examples=["user@example.com"])]
    phone: str | None = None
    profile_picture: str | None = None


class UserReadDB(UserBase, UUIDSchema, TimestampSchemaRead, PersistentDeletion):
    is_active: bool = True
    is_verified: bool = False
    is_superuser: bool = False
    role: Role = Role.USER

    hashed_password: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserRead(UserBase, UUIDSchema, TimestampSchemaRead, PersistentDeletion):
    is_active: bool
    is_verified: bool
    is_superuser: bool
    role: Role

    model_config = ConfigDict(from_attributes=True)


class UserProfileRead(UserRead):
    addresses: list[AddressRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class PublicUserRead(UUIDSchema, TimestampSchemaRead):
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    profile_picture: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    password: str

    full_name: str
    phone: str | None = None


class UserCreateDB(BaseModel):
    email: EmailStr
    hashed_password: str | None = None

    full_name: str
    phone: str | None = None
    profile_picture: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    profile_picture: str | None = None
    model_config = ConfigDict(extra="forbid")


class UserChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(
        cls,
        value: str,
        info: ValidationInfo,
    ) -> str:
        if value != info.data.get("new_password"):
            raise ValueError("Passwords do not match")

        return value


class UserForgotPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(
        cls,
        value: str,
        info: ValidationInfo,
    ) -> str:
        if value != info.data.get("new_password"):
            raise ValueError("Passwords do not match")

        return value


class DeleteAccountRequest(BaseModel):
    password: str | None = None


class AdminUserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    profile_picture: str | None = None

    role: Role | None = None

    is_active: bool | None = None
    is_verified: bool | None = None
    is_superuser: bool | None = None

    model_config = ConfigDict(extra="forbid")


class AdminUserReadBase(
    UUIDSchema,
    TimestampSchemaRead,
    PersistentDeletion,
):
    email: str
    full_name: str
    phone: str | None = None
    profile_picture: str | None = None
    role: Role
    is_active: bool
    is_verified: bool
    is_superuser: bool
    last_login_at: datetime | None = None


class AdminUserListRead(ProviderTypeMixin, AdminUserReadBase):
    auth_providers: list[UserAuthProviderRead] = Field(
        default_factory=list, exclude=True
    )
    model_config = ConfigDict(from_attributes=True)


class AdminUserDetailRead(AdminUserReadBase, ProviderTypeMixin):
    auth_providers: list[UserAuthProviderRead] = Field(default_factory=list)
    addresses: list[AddressRead] = Field(default_factory=list)
    orders_count: int = 0
    enrollments_count: int = 0
    products_spent: str = "0.00"
    courses_spent: str = "0.00"
    total_spent: str = "0.00"

    model_config = ConfigDict(from_attributes=True)
