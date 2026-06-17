import asyncio
import uuid

import boto3
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import (
    ServiceException,
    ValidationException,
)


class StorageService:
    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        )

        self.bucket = settings.S3_BUCKET_NAME

    async def upload_image(
        self,
        file: UploadFile,
        folder: str = "products",
    ) -> str:
        if not file.content_type:
            raise ValidationException("Invalid file")

        allowed_types = {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        }

        if file.content_type not in allowed_types:
            raise ValidationException("Only JPEG, PNG, WEBP and GIF images are allowed")

        try:
            content = await file.read()

            extension = file.filename.split(".")[-1]

            filename = f"{uuid.uuid4()}.{extension}"

            key = f"{folder}/{filename}"

            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=content,
                ContentType=file.content_type,
            )

            return f"{settings.S3_PUBLIC_URL}/{self.bucket}/{key}"

        except Exception as exc:
            raise ServiceException(
                "Storage",
                f"Upload failed: {exc}",
            ) from exc

    async def upload_images(
        self,
        files: list[UploadFile],
        folder: str = "products",
    ) -> list[str]:
        if not files:
            return []

        results = await asyncio.gather(
            *[
                self.upload_image(
                    file=file,
                    folder=folder,
                )
                for file in files
            ]
        )

        return list(results)

    async def delete_file(self, key: str) -> bool:
        try:
            self.client.delete_object(
                Bucket=self.bucket,
                Key=key,
            )

            return True

        except Exception as exc:
            raise ServiceException(
                "Storage",
                f"Delete failed: {exc}",
            ) from exc

    async def delete_files(
        self,
        keys: list[str],
    ) -> bool:
        if not keys:
            return True

        try:
            self.client.delete_objects(
                Bucket=self.bucket,
                Delete={"Objects": [{"Key": key} for key in keys]},
            )

            return True

        except Exception as exc:
            raise ServiceException(
                "Storage",
                f"Bulk delete failed: {exc}",
            ) from exc

    async def file_exists(self, key: str) -> bool:
        try:
            self.client.head_object(
                Bucket=self.bucket,
                Key=key,
            )

            return True

        except Exception:
            return False


storage_service = StorageService()
