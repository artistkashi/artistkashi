import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.address import Address
    from app.models.cart import CartItem
    from app.models.course_enrollment import CourseEnrollment
    from app.models.lesson_progress import LessonProgress
    from app.models.order import Order
    from app.models.review import Review
    from app.models.user_auth_provider import UserAuthProvider
    from app.models.user_session import UserSession
    from app.models.wishlist import Wishlist


class Role(enum.StrEnum):
    USER = "user"
    ADMIN = "admin"


class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)

    email: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    hashed_password: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    full_name: Mapped[str] = mapped_column(String(255))

    phone: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
    )

    profile_picture: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    role: Mapped[Role] = mapped_column(
        Enum(Role, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        default=Role.USER,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    is_superuser: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    auth_providers: Mapped[list["UserAuthProvider"]] = relationship(
        "UserAuthProvider",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    addresses: Mapped[list["Address"]] = relationship(
        "Address",
        back_populates="user",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    sessions: Mapped[list["UserSession"]] = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    reviews: Mapped[list["Review"]] = relationship(
        "Review",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    cart_items: Mapped[list["CartItem"]] = relationship(
        "CartItem",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    wishlist_items: Mapped[list["Wishlist"]] = relationship(
        "Wishlist",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    orders: Mapped[list["Order"]] = relationship(
        "Order",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    enrollments: Mapped[list["CourseEnrollment"]] = relationship(
        "CourseEnrollment",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    lesson_progress: Mapped[list["LessonProgress"]] = relationship(
        "LessonProgress",
        back_populates="user",
        cascade="all, delete-orphan",
    )
