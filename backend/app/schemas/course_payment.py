from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.core.schema import TimestampSchemaRead


class CoursePaymentCreate(BaseModel):
    user_id: uuid.UUID
    course_id: uuid.UUID
    amount: Decimal
    razorpay_order_id: str
    status: str


class CoursePurchaseRequest(BaseModel):
    pass


class CoursePurchaseResponse(BaseModel):
    razorpay_order_id: str
    amount: Decimal
    course_id: uuid.UUID
    course_title: str


class CoursePaymentVerificationRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

    model_config = {"extra": "forbid"}


class CoursePaymentRead(TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    razorpay_order_id: str
    razorpay_payment_id: str | None = None
    razorpay_signature: str | None = None
    amount: Decimal
    status: str
    paid_at: datetime | None = None
