from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    ValidationInfo,
    field_validator,
)

from app.core.schema import TimestampSchema, UUIDSchema
from app.models.user import Role
from app.schemas.address import AddressRead


class UserBase(BaseModel):
    full_name: Annotated[str, Field(min_length=2, max_length=30, examples=["User"])]
    email: Annotated[EmailStr, Field(examples=["user@example.com"])]
    phone: str | None = None
    profile_picture: str | None = None


class User(UserBase, UUIDSchema, TimestampSchema):
    is_active: bool = True
    is_verified: bool = False
    is_superuser: bool = False
    role: Role = Role.USER

    hashed_password: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserRead(UserBase, UUIDSchema, TimestampSchema):
    is_active: bool
    is_verified: bool
    is_superuser: bool
    role: Role

    model_config = ConfigDict(from_attributes=True)


class UserProfileRead(UserRead):
    addresses: list[AddressRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class PublicUserRead(UUIDSchema, TimestampSchema):
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
    profile_picture: Annotated[
        str | None,
        Field(
            pattern=r"^(https?|ftp)://[^\s/$.?#].[^\s]*$",
            default=None,
        ),
    ]
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
    password: str


class AdminUserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    profile_picture: str | None = None

    role: Role | None = None

    is_active: bool | None = None
    is_verified: bool | None = None
    is_superuser: bool | None = None

    model_config = ConfigDict(extra="forbid")
