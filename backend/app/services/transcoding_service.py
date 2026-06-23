from __future__ import annotations

import asyncio
import logging
import math
import shutil
import tempfile
from pathlib import Path

import boto3

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
    )


def _download_from_s3(client, bucket: str, key: str, dest: Path) -> None:
    logger.info("Downloading %s from S3", key)
    client.download_file(Bucket=bucket, Key=key, Filename=str(dest))


def _upload_to_s3(client, bucket: str, src: Path, key: str) -> None:
    logger.info("Uploading %s to S3", key)
    client.upload_file(
        Filename=str(src),
        Bucket=bucket,
        Key=key,
        ExtraArgs={"ContentType": "video/mp4"},
    )


async def _get_video_height(source_path: Path) -> int:
    try:
        process = await asyncio.create_subprocess_exec(
            settings.FFPROBE_PATH,
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=height",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(source_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await process.communicate()
        if process.returncode == 0 and stdout:
            return int(stdout.decode("utf-8").strip())
    except Exception:
        pass
    return 0


async def get_video_duration(source_path: Path) -> int:
    try:
        process = await asyncio.create_subprocess_exec(
            settings.FFPROBE_PATH,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(source_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await process.communicate()
        if process.returncode == 0 and stdout:
            duration = float(stdout.decode("utf-8").strip())
            return math.ceil(duration)
    except Exception:
        pass
    return 0


async def transcode_to_1080p(
    source_key: str,
    course_id: str,
    lesson_id: str,
) -> tuple[str, int]:
    """
    Transcode a source video to 1080p if it exceeds 1080p resolution.

    Downloads the source from S3, checks resolution via ffprobe,
    and transcodes only if the source is >1080p tall.
    Returns (S3 key of final video, duration_seconds).
    """
    bucket = settings.S3_BUCKET_NAME
    work_dir = Path(tempfile.mkdtemp(prefix="transcode_"))
    source_path = work_dir / "source.mp4"
    output_path = work_dir / "output.mp4"

    try:
        s3 = _get_s3_client()

        _download_from_s3(s3, bucket, source_key, source_path)

        if not source_path.exists() or source_path.stat().st_size == 0:
            raise RuntimeError(f"Downloaded source is empty or missing: {source_key}")

        height = await _get_video_height(source_path)
        logger.info("Source video height: %d", height)

        duration = await get_video_duration(source_path)
        logger.info("Source video duration: %d seconds", duration)

        if height == 0 or height <= 1080:
            logger.info("Source height %d, skipping transcode", height)
            return source_key, duration

        logger.info("Source is %dp, transcoding to 1080p", height)

        cmd = [
            settings.FFMPEG_PATH,
            "-y",
            "-i",
            str(source_path),
            "-vf",
            "scale=w=1920:h=1080:force_original_aspect_ratio=decrease,"
            "pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            str(output_path),
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        _, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = (
                stderr.decode("utf-8", errors="replace") if stderr else "Unknown error"
            )
            raise RuntimeError(f"FFmpeg transcoding failed: {error_msg}")

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError("FFmpeg did not produce output file")

        base_key = source_key.rsplit(".", 1)[0]
        new_key = f"{base_key}_1080p.mp4"

        _upload_to_s3(s3, bucket, output_path, new_key)

        logger.info("Transcoded video uploaded to %s", new_key)
        return new_key, duration

    except Exception:
        logger.exception("Transcoding failed for %s", source_key)
        raise

    finally:
        if work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)
