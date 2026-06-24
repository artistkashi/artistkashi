"""Custom exception classes for the application."""

from enum import StrEnum
from http import HTTPStatus

from fastapi import status

type ErrorDetails = dict[str, object] | str


class ErrorCode(StrEnum):
    """Application error codes."""

    # Generic
    INTERNAL_ERROR = "INTERNAL_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    CONFLICT = "CONFLICT"
    HTTP_ERROR = "HTTP_ERROR"

    # Auth
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED"
    EMAIL_ALREADY_VERIFIED = "EMAIL_ALREADY_VERIFIED"
    FORBIDDEN_ACCESS = "FORBIDDEN_ACCESS"

    # Infrastructure
    DATABASE_ERROR = "DATABASE_ERROR"
    SERVICE_ERROR = "SERVICE_ERROR"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    REGISTER_INVALID_PASSWORD = "REGISTER_INVALID_PASSWORD"

    # User
    USER_NOT_FOUND = "USER_NOT_FOUND"
    USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS"

    # Address
    ADDRESS_NOT_FOUND = "ADDRESS_NOT_FOUND"
    ADDRESS_ALREADY_EXISTS = "ADDRESS_ALREADY_EXISTS"

    # Course
    COURSE_NOT_FOUND = "COURSE_NOT_FOUND"
    COURSE_ALREADY_EXISTS = "COURSE_ALREADY_EXISTS"
    COURSE_NOT_PUBLISHED = "COURSE_NOT_PUBLISHED"
    COURSE_SLUG_CONFLICT = "COURSE_SLUG_CONFLICT"

    # Section
    SECTION_NOT_FOUND = "SECTION_NOT_FOUND"

    # Lesson
    LESSON_NOT_FOUND = "LESSON_NOT_FOUND"

    # Enrollment
    ENROLLMENT_NOT_FOUND = "ENROLLMENT_NOT_FOUND"
    ENROLLMENT_ALREADY_EXISTS = "ENROLLMENT_ALREADY_EXISTS"
    NOT_ENROLLED = "NOT_ENROLLED"

    # Lesson Progress
    LESSON_PROGRESS_NOT_FOUND = "LESSON_PROGRESS_NOT_FOUND"

    # Course Category
    COURSE_CATEGORY_NOT_FOUND = "COURSE_CATEGORY_NOT_FOUND"
    COURSE_CATEGORY_ALREADY_EXISTS = "COURSE_CATEGORY_ALREADY_EXISTS"

    # Review
    REVIEW_NOT_FOUND = "REVIEW_NOT_FOUND"
    REVIEW_ALREADY_EXISTS = "REVIEW_ALREADY_EXISTS"

    # Product
    PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND"
    PRODUCT_ALREADY_EXISTS = "PRODUCT_ALREADY_EXISTS"

    # Medium
    PRODUCT_MEDIUM_NOT_FOUND = "PRODUCT_MEDIUM_NOT_FOUND"
    PRODUCT_MEDIUM_ALREADY_EXISTS = "PRODUCT_MEDIUM_ALREADY_EXISTS"
    PRODUCT_MEDIUM_IN_USE = "PRODUCT_MEDIUM_IN_USE"

    # Variant Type
    VARIANT_TYPE_NOT_FOUND = "VARIANT_TYPE_NOT_FOUND"
    VARIANT_TYPE_ALREADY_EXISTS = "VARIANT_TYPE_ALREADY_EXISTS"
    VARIANT_TYPE_IN_USE = "VARIANT_TYPE_IN_USE"

    # Product Variant
    PRODUCT_VARIANT_NOT_FOUND = "PRODUCT_VARIANT_NOT_FOUND"
    PRODUCT_VARIANT_ALREADY_EXISTS = "PRODUCT_VARIANT_ALREADY_EXISTS"
    PRODUCT_VARIANT_SKU_ALREADY_EXISTS = "PRODUCT_VARIANT_SKU_ALREADY_EXISTS"

    # Product Image
    PRODUCT_IMAGE_NOT_FOUND = "PRODUCT_IMAGE_NOT_FOUND"

    # Category
    PRODUCT_CATEGORY_NOT_FOUND = "PRODUCT_CATEGORY_NOT_FOUND"
    PRODUCT_CATEGORY_ALREADY_EXISTS = "PRODUCT_CATEGORY_ALREADY_EXISTS"

    # Order
    ORDER_NOT_FOUND = "ORDER_NOT_FOUND"

    # Course Payment
    COURSE_PAYMENT_NOT_FOUND = "COURSE_PAYMENT_NOT_FOUND"
    COURSE_PAYMENT_ALREADY_PAID = "COURSE_PAYMENT_ALREADY_PAID"
    COURSE_PAYMENT_FAILED = "COURSE_PAYMENT_FAILED"

    # Auth Provider
    GOOGLE_AUTH_ERROR = "GOOGLE_AUTH_ERROR"
    PROVIDER_ALREADY_LINKED = "PROVIDER_ALREADY_LINKED"
    ACCOUNT_EXISTS_WITH_GOOGLE = "ACCOUNT_EXISTS_WITH_GOOGLE"
    ACCOUNT_EXISTS_WITH_PASSWORD = "ACCOUNT_EXISTS_WITH_PASSWORD"
    PASSWORD_PROVIDER_EXISTS = "PASSWORD_PROVIDER_EXISTS"
    ACCOUNT_DELETED = "ACCOUNT_DELETED"
    MAX_SESSIONS_REACHED = "MAX_SESSIONS_REACHED"


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str | None = None,
        status_code: int = 400,
        error_code: ErrorCode | str | None = None,
        details: ErrorDetails | None = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or ErrorCode.INTERNAL_ERROR
        self.details = details or HTTPStatus(status_code).description

        super().__init__(message or "")


class ValidationException(AppException):
    """Raised when validation fails."""

    def __init__(self, message: str, details: ErrorDetails | None = None) -> None:
        super().__init__(
            message=message,
            status_code=422,
            error_code=ErrorCode.VALIDATION_ERROR,
            details=details,
        )


class NotFoundException(AppException):
    """Raised when a resource is not found."""

    def __init__(
        self,
        resource: str,
        message: str | None = None,
        identifier: str | int | None = None,
        error_code: ErrorCode | str = ErrorCode.RESOURCE_NOT_FOUND,
    ) -> None:
        if message is None:
            message = f"{resource} not found"

            if identifier is not None:
                message += f" (ID: {identifier})"

        super().__init__(message=message, status_code=404, error_code=error_code)


class UnauthorizedException(AppException):
    """Raised when authentication fails."""

    def __init__(
        self,
        message: str | None = None,
        error_code: ErrorCode = ErrorCode.INVALID_CREDENTIALS,
    ) -> None:
        super().__init__(message=message, status_code=401, error_code=error_code)


class ForbiddenException(AppException):
    """Raised when the user lacks permission."""

    def __init__(
        self,
        message: str | None = None,
        error_code: ErrorCode = ErrorCode.FORBIDDEN_ACCESS,
    ) -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=error_code,
        )


class ConflictException(AppException):
    """Raised when a resource already exists."""

    def __init__(
        self,
        message: str | None = None,
        error_code: ErrorCode | str = ErrorCode.CONFLICT,
        details: ErrorDetails | None = None,
    ) -> None:
        super().__init__(
            message=message, status_code=409, error_code=error_code, details=details
        )


class RateLimitException(AppException):
    """Raised when rate limits are exceeded."""

    def __init__(self, message: str | None = None) -> None:
        super().__init__(
            message=message, status_code=429, error_code=ErrorCode.RATE_LIMIT_EXCEEDED
        )


class DatabaseException(AppException):
    """Raised when database operations fail."""

    def __init__(
        self, message: str | None = None, details: ErrorDetails | None = None
    ) -> None:
        super().__init__(
            message=message,
            status_code=500,
            error_code=ErrorCode.DATABASE_ERROR,
            details=details,
        )


class ServiceException(AppException):
    """Raised when an external service fails."""

    def __init__(self, service: str, message: str) -> None:
        super().__init__(
            message=f"{service} service error: {message}",
            status_code=502,
            error_code=ErrorCode.SERVICE_ERROR,
        )
