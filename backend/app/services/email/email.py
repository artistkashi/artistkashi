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
        },
        subtype=MessageType.html,
    )

    fm = FastMail(conf)

    await fm.send_message(
        message,
        template_name="welcome.html",
    )
