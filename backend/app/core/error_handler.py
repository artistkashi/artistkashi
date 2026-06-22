"""Exception handlers and middleware."""

import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import AppException, ErrorCode
from app.schemas.responses import ErrorResponse, Meta

logger = logging.getLogger(__name__)


HTTP_ERROR_MESSAGES = {
    ErrorCode.INTERNAL_ERROR.value: "An unexpected error occurred",
    ErrorCode.VALIDATION_ERROR.value: "Validation failed",
    ErrorCode.RESOURCE_NOT_FOUND.value: "Resource not found",
    ErrorCode.CONFLICT.value: "Request conflicts with the current state",
    ErrorCode.HTTP_ERROR.value: "Request failed",
    ErrorCode.INVALID_CREDENTIALS.value: "Invalid email or password",
    ErrorCode.EMAIL_NOT_VERIFIED.value: "Please verify your email address",
    ErrorCode.EMAIL_ALREADY_VERIFIED.value: "Email already verified",
    ErrorCode.FORBIDDEN_ACCESS.value: "Access denied",
    ErrorCode.DATABASE_ERROR.value: "Database operation failed",
    ErrorCode.SERVICE_ERROR.value: "External service failed",
    ErrorCode.RATE_LIMIT_EXCEEDED.value: "Rate limit exceeded",
    ErrorCode.REGISTER_INVALID_PASSWORD.value: "Password validation failed",
    ErrorCode.USER_NOT_FOUND.value: "User not found",
    ErrorCode.USER_ALREADY_EXISTS.value: "User already exists",
    ErrorCode.ADDRESS_NOT_FOUND.value: "Address not found",
    ErrorCode.ADDRESS_ALREADY_EXISTS.value: "Address already exists",
    ErrorCode.COURSE_CATEGORY_NOT_FOUND.value: "Course category not found",
    ErrorCode.COURSE_CATEGORY_ALREADY_EXISTS.value: "Course category already exists",
    ErrorCode.COURSE_NOT_FOUND.value: "Course not found",
    ErrorCode.COURSE_ALREADY_EXISTS.value: "Course already exists",
    ErrorCode.COURSE_NOT_PUBLISHED.value: "Course is not published",
    ErrorCode.COURSE_SLUG_CONFLICT.value: "Course slug already in use",
    ErrorCode.SECTION_NOT_FOUND.value: "Section not found",
    ErrorCode.LESSON_NOT_FOUND.value: "Lesson not found",
    ErrorCode.ENROLLMENT_NOT_FOUND.value: "Enrollment not found",
    ErrorCode.ENROLLMENT_ALREADY_EXISTS.value: "Already enrolled in this course",
    ErrorCode.NOT_ENROLLED.value: "Not enrolled in this course",
    ErrorCode.LESSON_PROGRESS_NOT_FOUND.value: "Lesson progress not found",
    ErrorCode.REVIEW_NOT_FOUND.value: "Review not found",
    ErrorCode.REVIEW_ALREADY_EXISTS.value: "Review already exists",
    ErrorCode.PRODUCT_NOT_FOUND.value: "Product not found",
    ErrorCode.PRODUCT_ALREADY_EXISTS.value: "Product already exists",
    ErrorCode.PRODUCT_MEDIUM_NOT_FOUND.value: "Product medium not found",
    ErrorCode.PRODUCT_MEDIUM_ALREADY_EXISTS.value: "Product medium already exists",
    ErrorCode.PRODUCT_MEDIUM_IN_USE.value: "Product medium is used by products",
    ErrorCode.VARIANT_TYPE_NOT_FOUND.value: "Variant type not found",
    ErrorCode.VARIANT_TYPE_ALREADY_EXISTS.value: "Variant type already exists",
    ErrorCode.VARIANT_TYPE_IN_USE.value: "Variant type is used by products",
    ErrorCode.PRODUCT_VARIANT_NOT_FOUND.value: "Product variant not found",
    ErrorCode.PRODUCT_VARIANT_ALREADY_EXISTS.value: "Product variant already exists",
    ErrorCode.PRODUCT_VARIANT_SKU_ALREADY_EXISTS.value: (
        "Product variant SKU already exists"
    ),
    ErrorCode.PRODUCT_IMAGE_NOT_FOUND.value: "Product image not found",
    ErrorCode.PRODUCT_CATEGORY_NOT_FOUND.value: "Product category not found",
    ErrorCode.PRODUCT_CATEGORY_ALREADY_EXISTS.value: "Product category already exists",
    ErrorCode.ORDER_NOT_FOUND.value: "Order not found",
    ErrorCode.GOOGLE_AUTH_ERROR.value: "Google authentication failed",
    ErrorCode.PROVIDER_ALREADY_LINKED.value: "Provider already linked",
    ErrorCode.ACCOUNT_EXISTS_WITH_GOOGLE.value: (
        "Account already exists. Please sign in with Google."
    ),
    ErrorCode.ACCOUNT_EXISTS_WITH_PASSWORD.value: (
        "This email is registered with a password. Please sign in."
    ),
    ErrorCode.PASSWORD_PROVIDER_EXISTS.value: (
        "Password login is already set up for this account"
    ),
}

missing_error_messages = set(ErrorCode) - {
    ErrorCode(code) for code in HTTP_ERROR_MESSAGES
}

if missing_error_messages:
    missing = ", ".join(sorted(code.value for code in missing_error_messages))
    raise RuntimeError(f"Missing HTTP error messages for: {missing}")


def _format_validation_message(error: dict) -> str:
    """Convert Pydantic validation errors into user-friendly messages."""

    error_type = error["type"]
    field = str(error["loc"][-1])
    context = error.get("ctx") or {}

    if error_type == "value_error" and field == "email":
        return "Invalid email address"

    if error_type == "string_too_short":
        minimum = context.get("min_length")
        if minimum is not None:
            return (
                f"{field.replace('_', ' ').title()} "
                f"must be at least {minimum} characters"
            )

    message = error["msg"]

    if message.startswith("Value error, "):
        return message.removeprefix("Value error, ")

    return message


def _format_http_error(
    detail: object,
) -> tuple[str, ErrorCode, dict[str, object] | None]:

    if isinstance(detail, dict):
        try:
            error_code = ErrorCode(detail.get("code"))
        except Exception:
            error_code = ErrorCode.HTTP_ERROR

        errors = None

        if isinstance(detail.get("reason"), list):
            errors = {"password": detail["reason"]}

        return (str(detail.get("detail", detail)), error_code, errors)

    if isinstance(detail, str):
        try:
            error_code = ErrorCode(detail)

            message = HTTP_ERROR_MESSAGES.get(
                error_code.value, error_code.value.replace("_", " ").title()
            )

            return (message, error_code, None)
        except ValueError:
            return (detail, ErrorCode.HTTP_ERROR, None)

    return (str(detail), ErrorCode.HTTP_ERROR, None)


def build_error_response(
    *,
    status_code: int,
    message: str,
    error_code: ErrorCode,
    errors: dict[str, object] | None = None,
) -> ErrorResponse:
    """Create a consistent error response."""

    return ErrorResponse(
        success=False,
        status=status_code,
        message=message,
        error_code=error_code,
        errors=errors,
        meta=Meta(),
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers."""

    @app.exception_handler(AppException)
    async def app_exception_handler(
        request: Request,
        exc: AppException,
    ):
        message = exc.message

        if not message:
            message = HTTP_ERROR_MESSAGES.get(
                exc.error_code.value,
                exc.error_code.value.replace("_", " ").title(),
            )

        logger.warning(
            "%s - %s",
            exc.error_code,
            message,
            extra={
                "path": request.url.path,
                "method": request.method,
                "status_code": exc.status_code,
            },
        )

        response = build_error_response(
            status_code=exc.status_code,
            message=message,
            error_code=exc.error_code,
            errors=exc.details if isinstance(exc.details, dict) else None,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=response.model_dump(mode="json"),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ):
        validation_errors: dict[str, list[str]] = {}

        for error in exc.errors():
            field = (
                ".".join(str(i) for i in error["loc"][1:])
                if len(error["loc"]) > 1
                else str(error["loc"][0])
            )

            validation_errors.setdefault(field, []).append(
                _format_validation_message(error)
            )

        response = build_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Validation failed",
            error_code=ErrorCode.VALIDATION_ERROR,
            errors=validation_errors,
        )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=response.model_dump(mode="json"),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request,
        exc: HTTPException,
    ):
        message, error_code, errors = _format_http_error(exc.detail)

        response = build_error_response(
            status_code=exc.status_code,
            message=message,
            error_code=error_code,
            errors=errors,
        )

        return JSONResponse(
            status_code=exc.status_code,
            content=response.model_dump(mode="json"),
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request,
        exc: Exception,
    ):
        logger.exception(
            "Unhandled exception",
            extra={
                "path": request.url.path,
                "method": request.method,
                "error_type": type(exc).__name__,
            },
        )

        response = build_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="An unexpected error occurred",
            error_code=ErrorCode.INTERNAL_ERROR,
        )

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=response.model_dump(mode="json"),
        )
