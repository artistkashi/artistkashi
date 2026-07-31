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
            region_name="auto",
        )

        self.bucket = settings.S3_BUCKET_NAME

    async def _upload(
        self,
        file: UploadFile,
        folder: str = "products",
        key: str | None = None,
    ) -> str:
        try:
            content = await file.read()
            if key is None:
                extension = file.filename.split(".")[-1] if file.filename else "bin"
                filename = f"{uuid.uuid4()}.{extension}"
                key = f"{folder}/{filename}"
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=content,
                ContentType=file.content_type or "application/octet-stream",
            )
            return key

        except Exception as exc:
            raise ServiceException(
                "Storage",
                f"Upload failed: {exc}",
            ) from exc

    async def upload_image(
        self,
        file: UploadFile,
        folder: str = "products",
        key: str | None = None,
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

        s3_key = await self._upload(file, folder, key=key)
        return f"{settings.S3_PUBLIC_URL}/{s3_key}"

    async def upload_video(
        self,
        file: UploadFile,
        folder: str = "videos",
        key: str | None = None,
    ) -> str:
        if not file.content_type:
            raise ValidationException("Invalid file")

        allowed_types = {
            "video/mp4",
            "video/webm",
            "video/ogg",
            "video/quicktime",
            "video/x-msvideo",
        }

        if file.content_type not in allowed_types:
            raise ValidationException(
                "Only MP4, WEBM, OGG, MOV and AVI videos are allowed"
            )

        s3_key = await self._upload(file, folder, key=key)
        return f"{settings.S3_PUBLIC_URL}/{s3_key}"

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

    def configure_cors(self, allowed_origin: str = "*") -> None:
        try:
            self.client.put_bucket_cors(
                Bucket=self.bucket,
                CORSConfiguration={
                    "CORSRules": [
                        {
                            "AllowedOrigins": [allowed_origin],
                            "AllowedMethods": ["GET", "PUT", "HEAD"],
                            "AllowedHeaders": ["*"],
                            "ExposeHeaders": ["ETag"],
                            "MaxAgeSeconds": 3600,
                        }
                    ]
                },
            )
        except Exception:
            pass

    def generate_presigned_read_url(
        self,
        key: str,
        expires_in: int = 3600,
    ) -> str:
        url = self.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket,
                "Key": key,
            },
            ExpiresIn=expires_in,
        )
        return url

    def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600,
    ) -> str:
        url = self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in,
        )
        return url

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
