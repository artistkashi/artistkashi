import urllib.parse
from pathlib import Path

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.core.config import settings
from app.schemas.user import UserRead


def get_email_config():
    conf = ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
        MAIL_STARTTLS=settings.MAIL_STARTTLS,
        MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
        USE_CREDENTIALS=settings.USE_CREDENTIALS,
        VALIDATE_CERTS=settings.VALIDATE_CERTS,
        TEMPLATE_FOLDER=Path(__file__).parent / settings.TEMPLATE_DIR,
    )
    return conf


async def send_reset_password_email(user: UserRead, token: str):
    conf = get_email_config()
    email = user.email
    base_url = f"{settings.FRONTEND_URL}/password-recovery/confirm?"
    params = {"token": token}
    encoded_params = urllib.parse.urlencode(params)
    link = f"{base_url}{encoded_params}"
    message = MessageSchema(
        subject="Password recovery",
        recipients=[email],
        template_body={"username": email, "link": link},
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message, template_name="password_reset.html")


async def send_verification_email(user: UserRead, token: str):
    conf = get_email_config()

    link = f"{settings.FRONTEND_URL}/verify?token={token}"

    message = MessageSchema(
        subject="Verify your email",
        recipients=[user.email],
        template_body={
            "username": user.full_name or user.email,
            "link": link,
        },
        subtype=MessageType.html,
    )

    fm = FastMail(conf)

    await fm.send_message(
        message,
        template_name="verify_email.html",
    )


async def send_welcome_email(user: UserRead):
    conf = get_email_config()

    message = MessageSchema(
        subject="Welcome to ArtistKashi",
        recipients=[user.email],
        template_body={
            "username": user.full_name or user.email,
            "dashboard_link": f"{settings.FRONTEND_URL}/dashboard",
        },
        subtype=MessageType.html,
    )

    fm = FastMail(conf)

    await fm.send_message(
        message,
        template_name="welcome.html",
    )


async def send_course_purchase_email(
    user: UserRead,
    course_title: str,
    course_slug: str,
):
    conf = get_email_config()
    course_link = f"{settings.FRONTEND_URL}/courses/{course_slug}"
    dashboard_link = f"{settings.FRONTEND_URL}/dashboard"

    message = MessageSchema(
        subject="Course Enrollment Confirmed – ArtistKashi",
        recipients=[user.email],
        template_body={
            "username": user.full_name or user.email,
            "course_title": course_title,
            "course_link": course_link,
            "dashboard_link": dashboard_link,
        },
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message, template_name="course_purchase.html")


async def send_course_completion_email(
    user: UserRead,
    course_title: str,
    course_slug: str,
):
    conf = get_email_config()
    course_link = f"{settings.FRONTEND_URL}/courses/{course_slug}"
    dashboard_link = f"{settings.FRONTEND_URL}/dashboard"

    message = MessageSchema(
        subject="Congratulations on Completing Your Course! – ArtistKashi",
        recipients=[user.email],
        template_body={
            "username": user.full_name or user.email,
            "course_title": course_title,
            "course_link": course_link,
            "dashboard_link": dashboard_link,
        },
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message, template_name="course_completion.html")


async def send_order_confirmation_email(
    user: UserRead,
    order_id: str,
):
    conf = get_email_config()
    order_link = f"{settings.FRONTEND_URL}/orders/{order_id}"
    dashboard_link = f"{settings.FRONTEND_URL}/dashboard"

    message = MessageSchema(
        subject="Order Confirmed – ArtistKashi",
        recipients=[user.email],
        template_body={
            "username": user.full_name or user.email,
            "order_id": order_id,
            "order_link": order_link,
            "dashboard_link": dashboard_link,
        },
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message, template_name="order_confirmation.html")


async def send_order_shipped_email(
    user: UserRead,
    order_id: str,
    courier_name: str,
    tracking_number: str,
    tracking_url: str | None = None,
):
    conf = get_email_config()
    order_link = f"{settings.FRONTEND_URL}/orders/{order_id}"
    dashboard_link = f"{settings.FRONTEND_URL}/dashboard"

    message = MessageSchema(
        subject="Your Order Has Been Shipped! – ArtistKashi",
        recipients=[user.email],
        template_body={
            "username": user.full_name or user.email,
            "order_id": order_id,
            "order_link": order_link,
            "dashboard_link": dashboard_link,
            "courier_name": courier_name,
            "tracking_number": tracking_number,
            "tracking_url": tracking_url,
        },
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message, template_name="order_shipped.html")


async def send_order_delivered_email(
    user: UserRead,
    order_id: str,
):
    conf = get_email_config()
    order_link = f"{settings.FRONTEND_URL}/orders/{order_id}"
    dashboard_link = f"{settings.FRONTEND_URL}/dashboard"

    message = MessageSchema(
        subject="Your Order Has Been Delivered! – ArtistKashi",
        recipients=[user.email],
        template_body={
            "username": user.full_name or user.email,
            "order_id": order_id,
            "order_link": order_link,
            "dashboard_link": dashboard_link,
        },
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message, template_name="order_delivered.html")


async def send_order_cancelled_email(
    user: UserRead,
    order_id: str,
):
    conf = get_email_config()
    dashboard_link = f"{settings.FRONTEND_URL}/dashboard"

    message = MessageSchema(
        subject="Order Cancelled – ArtistKashi",
        recipients=[user.email],
        template_body={
            "username": user.full_name or user.email,
            "order_id": order_id,
            "dashboard_link": dashboard_link,
        },
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message, template_name="order_cancelled.html")


async def send_password_changed_email(user: UserRead):
    conf = get_email_config()
    dashboard_link = f"{settings.FRONTEND_URL}/dashboard"

    message = MessageSchema(
        subject="Your Password Has Been Changed – ArtistKashi",
        recipients=[user.email],
        template_body={
            "username": user.full_name or user.email,
            "dashboard_link": dashboard_link,
        },
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message, template_name="password_changed.html")


async def send_account_deleted_email(user: UserRead):
    conf = get_email_config()
    dashboard_link = f"{settings.FRONTEND_URL}/dashboard"

    message = MessageSchema(
        subject="Account Deleted – ArtistKashi",
        recipients=[user.email],
        template_body={
            "username": user.full_name or user.email,
            "dashboard_link": dashboard_link,
        },
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message, template_name="account_deleted.html")
