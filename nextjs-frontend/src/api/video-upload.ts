import { unwrap } from "@/api/client-service";
import {
  initVideoUpload as initVideoUploadApi,
  confirmVideoUpload as confirmVideoUploadApi,
} from "@/api/openapi-client";

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      resolve(video.duration);
      URL.revokeObjectURL(url);
      video.remove();
    };
    video.onerror = () => {
      reject(new Error("Failed to read video metadata"));
      URL.revokeObjectURL(url);
      video.remove();
    };
    video.src = url;
  });
}

export async function uploadToPresignedUrl(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed network error"));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort());
    }

    xhr.send(file);
  });
}

export async function uploadLessonVideoViaPresigned(
  courseId: string,
  lessonId: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  const { upload_url, video_key } = await unwrap(
    initVideoUploadApi({
      path: { course_id: courseId, lesson_id: lessonId },
      body: { file_name: file.name, content_type: file.type, file_size: file.size },
    }),
  );

  const [duration] = await Promise.all([
    getVideoDuration(file),
    uploadToPresignedUrl(upload_url, file, onProgress, signal),
  ]);

  const lesson = await unwrap(
    confirmVideoUploadApi({
      path: { course_id: courseId, lesson_id: lessonId },
      body: { video_key, duration_seconds: Math.ceil(duration) },
    }),
  );

  return lesson;
}
