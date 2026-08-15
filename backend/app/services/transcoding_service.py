from __future__ import annotations

import asyncio
import json
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


async def _run_probe(source_path: Path) -> dict:
    """
    Probe a video with ffprobe and return parsed metadata.

    Raises RuntimeError if ffprobe is unavailable or the file cannot be
    read as a video — callers must treat that as an unplayable file
    instead of silently assuming the source is fine.
    """
    process = await asyncio.create_subprocess_exec(
        settings.FFPROBE_PATH,
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        str(source_path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()
    if process.returncode != 0:
        err = stderr.decode("utf-8", errors="replace") if stderr else "unknown"
        raise RuntimeError(f"ffprobe could not read the video: {err[:300]}")

    try:
        data = json.loads(stdout.decode("utf-8", errors="replace"))
    except json.JSONDecodeError as exc:
        raise RuntimeError("ffprobe returned invalid output") from exc

    streams = data.get("streams", [])
    video_streams = [s for s in streams if s.get("codec_type") == "video"]
    if not video_streams:
        raise RuntimeError("No video stream found in the uploaded file")

    vs = video_streams[0]
    try:
        duration = float((data.get("format") or {}).get("duration") or 0)
    except (TypeError, ValueError):
        duration = 0.0
    height = int(vs.get("height") or 0)
    codec_name = (vs.get("codec_name") or "").lower()
    format_name = ((data.get("format") or {}).get("format_name") or "").lower()

    return {
        "height": height,
        "duration": duration,
        "codec_name": codec_name,
        "format_name": format_name,
    }


def _is_browser_playable_mp4(probe: dict) -> bool:
    """MP4 container with H.264 video is directly playable in browsers."""
    format_name = probe["format_name"]
    codec = probe["codec_name"]
    return (
        "mp4" in format_name
        and codec in ("h264", "avc1")
        and probe["duration"] > 0
    )


async def get_video_duration(source_path: Path) -> int:
    try:
        probe = await _run_probe(source_path)
        return math.ceil(probe["duration"])
    except Exception:
        return 0


async def transcode_to_1080p(
    source_key: str,
    course_id: str,
    lesson_id: str,
) -> tuple[str, int]:
    """
    Produce a browser-playable 1080p MP4 (H.264 + AAC) from the source.

    - If the source is already a playable MP4 <=1080p, it is returned as-is.
    - Any other format (MOV, AVI, MKV, WebM, HEVC, >1080p, unreadable or
      zero-duration file) is transcoded to MP4.
    - Raises RuntimeError when the file cannot be probed or transcoded; the
      caller must mark the lesson FAILED instead of pretending it is ready.
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

        probe = await _run_probe(source_path)
        logger.info(
            "Source video: height=%d duration=%.1fs codec=%s format=%s",
            probe["height"],
            probe["duration"],
            probe["codec_name"],
            probe["format_name"],
        )

        if probe["duration"] <= 0:
            raise RuntimeError("Uploaded file contains no playable video data")

        if probe["height"] <= 1080 and _is_browser_playable_mp4(probe):
            logger.info("Source is a playable mp4 <=1080p, skipping transcode")
            return source_key, math.ceil(probe["duration"])

        logger.info(
            "Transcoding source (height=%d, format=%s) to 1080p MP4",
            probe["height"],
            probe["format_name"],
        )

        cmd = [
            settings.FFMPEG_PATH,
            "-y",
            "-i",
            str(source_path),
            "-vf",
            "scale=w=1920:h=1080:force_original_aspect_ratio=decrease,"
            "pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
            "-pix_fmt",
            "yuv420p",
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
            raise RuntimeError(f"FFmpeg transcoding failed: {error_msg[:500]}")

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError("FFmpeg did not produce output file")

        # probe the transcoded output to confirm it is playable and get duration
        output_probe = await _run_probe(output_path)
        if output_probe["duration"] <= 0:
            raise RuntimeError("Transcoded output is empty or unplayable")

        base_key = source_key.rsplit(".", 1)[0]
        new_key = f"{base_key}_1080p.mp4"

        _upload_to_s3(s3, bucket, output_path, new_key)

        logger.info("Transcoded video uploaded to %s", new_key)
        return new_key, math.ceil(output_probe["duration"])

    except Exception:
        logger.exception("Video processing failed for %s", source_key)
        raise

    finally:
        if work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)
