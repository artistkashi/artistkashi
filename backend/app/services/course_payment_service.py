from __future__ import annotations

import uuid
from datetime import UTC, datetime

import razorpay
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    ConflictException,
    ErrorCode,
    NotFoundException,
    ServiceException,
    ValidationException,
)
from app.crud.course import crud_course, crud_course_enrollment, crud_course_payment
from app.models.course_payment import CoursePaymentStatus
from app.schemas.course import CourseRead
from app.schemas.course_enrollment import CourseEnrollmentRead
from app.schemas.course_payment import (
    CoursePaymentCreate,
    CoursePaymentRead,
    CoursePaymentVerificationRequest,
    CoursePurchaseResponse,
)
from app.services.enrollment_service import enrollment_service


class CoursePaymentService:
    def __init__(self):
        self.razorpay_client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID or "", settings.RAZORPAY_KEY_SECRET or "")
        )

    async def initiate_purchase(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        slug: str,
    ) -> CoursePurchaseResponse:
        course = await crud_course.get(
            db=session,
            slug=slug,
            is_deleted=False,
            is_published=True,
            schema_to_select=CourseRead,
            return_as_model=True,
        )
        if not course:
            raise NotFoundException(
                resource="Course",
                identifier=slug,
                error_code=ErrorCode.COURSE_NOT_FOUND,
            )

        already_enrolled = await crud_course_enrollment.exists(
            db=session, user_id=user_id, course_id=course.id
        )
        if already_enrolled:
            raise ConflictException(
                message="User is already enrolled in this course",
                error_code=ErrorCode.ENROLLMENT_ALREADY_EXISTS,
            )

        if course.price <= 0:
            raise ValidationException(
                message="Course is free. Use the enrollment endpoint instead."
            )

        existing_pending = await crud_course_payment.get(
            db=session,
            user_id=user_id,
            course_id=course.id,
            status=CoursePaymentStatus.PENDING,
        )
        if existing_pending:
            raise ConflictException(
                message="A pending payment already exists for this course",
                error_code=ErrorCode.COURSE_PAYMENT_ALREADY_PAID,
            )

        try:
            payment = await crud_course_payment.create(
                db=session,
                object=CoursePaymentCreate(
                    user_id=user_id,
                    course_id=course.id,
                    amount=course.price,
                    razorpay_order_id="pending",
                    status=CoursePaymentStatus.PENDING,
                ),
                schema_to_select=CoursePaymentRead,
                return_as_model=True,
                commit=False,
            )

            razorpay_order = self.razorpay_client.order.create(
                data={
                    "amount": int(course.price * 100),
                    "currency": "INR",
                    "receipt": str(payment.id),
                }
            )

            await crud_course_payment.update(
                db=session,
                id=payment.id,
                object={
                    "razorpay_order_id": razorpay_order["id"],
                },
                commit=False,
            )

            await session.commit()

            return CoursePurchaseResponse(
                razorpay_order_id=razorpay_order["id"],
                amount=course.price,
                course_id=course.id,
                course_title=course.title,
            )

        except Exception as exc:
            await session.rollback()
            raise ServiceException(
                "Course Payment",
                f"Failed to initiate purchase: {exc}",
            ) from exc

    async def verify_payment(
        self,
        *,
        session: AsyncSession,
        user_id: uuid.UUID,
        slug: str,
        payload: CoursePaymentVerificationRequest,
    ) -> CourseEnrollmentRead:
        course = await crud_course.get(
            db=session,
            slug=slug,
            is_deleted=False,
            schema_to_select=CourseRead,
            return_as_model=True,
        )
        if not course:
            raise NotFoundException(
                resource="Course",
                identifier=slug,
                error_code=ErrorCode.COURSE_NOT_FOUND,
            )

        payment = await crud_course_payment.get(
            db=session,
            razorpay_order_id=payload.razorpay_order_id,
            user_id=user_id,
            course_id=course.id,
            schema_to_select=CoursePaymentRead,
            return_as_model=True,
        )
        if not payment:
            raise NotFoundException(
                resource="Course Payment",
                identifier=payload.razorpay_order_id,
                error_code=ErrorCode.COURSE_PAYMENT_NOT_FOUND,
            )

        if payment.status == CoursePaymentStatus.PAID:
            raise ConflictException(
                message="Payment already verified for this order",
                error_code=ErrorCode.COURSE_PAYMENT_ALREADY_PAID,
            )

        params_dict = {
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        }

        try:
            self.razorpay_client.utility.verify_payment_signature(params_dict)
        except Exception as exc:
            await crud_course_payment.update(
                db=session,
                id=payment.id,
                object={"status": CoursePaymentStatus.FAILED},
            )
            raise ValidationException("Invalid payment signature") from exc

        try:
            await crud_course_payment.update(
                db=session,
                id=payment.id,
                object={
                    "status": CoursePaymentStatus.PAID,
                    "razorpay_payment_id": payload.razorpay_payment_id,
                    "razorpay_signature": payload.razorpay_signature,
                    "paid_at": datetime.now(UTC),
                },
                commit=False,
            )

            enrollment = await enrollment_service.enroll(
                session=session, user_id=user_id, course_id=course.id
            )
            await session.commit()

            return enrollment

        except Exception as exc:
            await session.rollback()
            raise ServiceException(
                "Course Payment",
                f"Failed to verify payment: {exc}",
            ) from exc


course_payment_service = CoursePaymentService()
