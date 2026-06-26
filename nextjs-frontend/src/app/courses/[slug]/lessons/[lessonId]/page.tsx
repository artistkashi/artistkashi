"use client";

import { unwrap } from "@/api/client-service";
import type {
  CourseLessonRead,
  CourseProgressRead,
  CourseRead,
  CourseSectionWithLessonsRead,
} from "@/api/openapi-client";
import {
  coursesGetCourse,
  getCourseCurriculum,
  getAllLessonProgresses,
  getCourseProgress,
  getEnrollmentStatus,
  getLessonProgress,
  getLessonVideo,
  updateLessonProgress,
} from "@/api/openapi-client";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Maximize,
  Menu,
  MessageCircle,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  VideoOff,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

function formatDuration(seconds: number | undefined | null): string {
  if (!seconds || seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function fetchCourseBySlug(slug: string): Promise<CourseRead> {
  return unwrap(coursesGetCourse({ path: { slug } }));
}

function SpeedControl() {
  const [show, setShow] = useState(false);
  const rates = [0.5, 1, 1.5, 2];
  return (
    <div className="relative">
      <button
        onClick={() => setShow((p) => !p)}
        className="text-label font-mono text-text-muted hover:text-text-main transition-colors text-xs"
      >
        {(() => {
          const video = document.querySelector("video");
          return `${video?.playbackRate ?? 1}x`;
        })()}
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShow(false)} />
          <div className="absolute bottom-full left-0 mb-2 z-20 bg-surface border border-border rounded overflow-hidden shadow-lg min-w-16">
            {rates.map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  const video = document.querySelector("video");
                  if (video) video.playbackRate = speed;
                  setShow(false);
                }}
                className="block w-full px-3 py-1.5 text-tiny font-mono text-left hover:bg-muted transition-colors text-text-muted hover:text-text-main"
              >
                {speed}x
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function VideoWatermark({
  userName,
  userEmail,
  show,
}: {
  userName: string;
  userEmail: string;
  show: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const drawWatermark = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const lines = [`${userName}`, `${userEmail}`, `${dateStr} ${timeStr}`];

    const fontSize = Math.max(11, Math.min(14, rect.width / 60));
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = "top";

    const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const textHeight = lines.length * fontSize * 1.4;
    const pad = 20;
    const pos = {
      x: pad + Math.random() * Math.max(0, rect.width - textWidth - pad * 2),
      y: pad + Math.random() * Math.max(0, rect.height - textHeight - pad * 2),
      angle: (Math.random() - 0.5) * 0.12,
    };

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(pos.angle);

    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    const lineHeight = fontSize * 1.4;
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, i * lineHeight);
    });

    ctx.restore();

    ctx.save();
    ctx.translate(pos.x + 2, pos.y + 2);
    ctx.rotate(pos.angle);
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, i * lineHeight);
    });
    ctx.restore();

    const drawDiagonal = (
      text: string,
      cx: number,
      cy: number,
      angle: number
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.font = `${fontSize * 0.7}px monospace`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };

    const diagonalText = `${userName} • ${userEmail}`;
    for (let i = -2; i < 4; i++) {
      for (let j = -2; j < 4; j++) {
        const dx = i * 200 + (j % 2) * 100;
        const dy = j * 80 + (i % 2) * 40;
        if (
          dx > -100 &&
          dx < rect.width + 100 &&
          dy > -50 &&
          dy < rect.height + 50
        ) {
          drawDiagonal(diagonalText, dx, dy, 0.4);
        }
      }
    }
  }, [userName, userEmail]);

  useEffect(() => {
    if (!show) return;
    drawWatermark();
    const interval = setInterval(() => {
      drawWatermark();
      if (
        containerRef.current &&
        !document.body.contains(containerRef.current)
      ) {
        document.body.appendChild(containerRef.current);
      }
    }, 4000);
    const onResize = () => {
      if (
        containerRef.current &&
        document.body.contains(containerRef.current)
      ) {
        drawWatermark();
      }
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", onResize);
    };
  }, [show, drawWatermark]);

  if (!show) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

function VideoPlayer({
  videoUrl,
  lessonStatus,
  resumePosition,
  onProgress,
  onPause,
  onComplete,
  userName,
  userEmail,
  showWatermark,
}: {
  videoUrl: string | null | undefined;
  lessonStatus: string | undefined;
  resumePosition: number | undefined;
  onProgress: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onComplete: () => void;
  userName?: string;
  userEmail?: string;
  showWatermark?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      onProgress(video.currentTime);
    };
    const onPlay = () => setIsPlaying(true);
    const onPauseEvt = () => {
      setIsPlaying(false);
      onPause(video.currentTime);
    };
    const onEnded = () => {
      setIsPlaying(false);
      onComplete();
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPauseEvt);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPauseEvt);
      video.removeEventListener("ended", onEnded);
    };
  }, [onProgress, onPause, onComplete]);

  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    videoRef.current.src = videoUrl;
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (resumePosition && resumePosition > 0 && video.readyState >= 1) {
      video.currentTime = resumePosition;
    }
  }, [resumePosition]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black cursor-pointer flex items-center justify-center"
      onClick={togglePlay}
    >
      {!videoUrl ||
      lessonStatus === "processing" ||
      lessonStatus === "failed" ? (
        <div className="flex flex-col items-center justify-center gap-2">
          {lessonStatus === "processing" ? (
            <>
              <div className="luxury-loader loader-lg" />
              <span className="text-label font-mono text-text-muted mt-3">
                Processing video...
              </span>
            </>
          ) : lessonStatus === "failed" ? (
            <>
              <span className="text-label font-mono text-red-400">
                Transcoding failed
              </span>
              <p className="text-text-muted text-xs">
                The video could not be processed. Please re-upload.
              </p>
            </>
          ) : (
            <>
              <Play size={40} className="text-text-muted mx-auto mb-1" />
              <p className="text-text-muted text-sm">No video available</p>
            </>
          )}
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            preload="metadata"
          />

          {!isPlaying && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-16 h-16 bg-text-main/10 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-gold/20 hover:border-gold/30 transition-all rounded"
              >
                <Play
                  size={28}
                  className="text-text-main fill-text-main ml-1.5"
                />
              </button>
            </div>
          )}

          <VideoWatermark
            userName={userName ?? "User"}
            userEmail={userEmail ?? ""}
            show={showWatermark ?? false}
          />
        </>
      )}
    </div>
  );
}

export default function CourseLessonPlayerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = use(params);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const progressRef = useRef(0);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  const {
    data: course,
    isError: courseError,
    error: courseErrorObj,
  } = useQuery<CourseRead>({
    queryKey: ["course", slug],
    queryFn: () => fetchCourseBySlug(slug),
  });

  const courseId = course?.id;

  const { data: enrollmentData } = useQuery({
    queryKey: ["enrollment", courseId],
    queryFn: async () => {
      if (!courseId) return null;
      try {
        return await unwrap(
          getEnrollmentStatus({
            path: { course_id: courseId },
          })
        );
      } catch {
        return null;
      }
    },
    enabled: !!courseId && !!user,
  });

  const isEnrolled = user?.role === "admin" || !!enrollmentData?.is_active;

  const { data: curriculumData } = useQuery({
    queryKey: ["course-curriculum", courseId],
    queryFn: () =>
      unwrap(getCourseCurriculum({ path: { course_id: courseId! } })),
    enabled: !!courseId,
  });

  const {
    data: lessonVideo,
    isPending: lessonVideoLoading,
    isError: lessonError,
    error: lessonErrorObj,
  } = useQuery({
    queryKey: ["lesson-video", courseId, lessonId],
    queryFn: () =>
      unwrap(
        getLessonVideo({ path: { course_id: courseId!, lesson_id: lessonId } })
      ),
    enabled: !!courseId,
  });

  const { data: lessonProgress } = useQuery({
    queryKey: ["lesson-progress", courseId, lessonId],
    queryFn: () =>
      unwrap(
        getLessonProgress({
          path: { course_id: courseId!, lesson_id: lessonId },
        })
      ),
    enabled: !!courseId,
  });

  const { data: courseProgress } = useQuery<CourseProgressRead>({
    queryKey: ["course-progress", courseId],
    queryFn: () =>
      unwrap<CourseProgressRead>(getCourseProgress({ path: { course_id: courseId! } })),
    enabled: !!courseId,
  });

  const { data: allProgresses } = useQuery<Record<string, string>>({
    queryKey: ["all-lesson-progresses", courseId],
    queryFn: async () => {
      const data = await unwrap(
        getAllLessonProgresses({ path: { course_id: courseId! } })
      );
      return data ?? {};
    },
    enabled: !!courseId && isEnrolled,
  });

  const saveProgressMutation = useMutation({
    mutationFn: async (body: {
      status?: string;
      watch_seconds?: number;
      resume_position_seconds?: number;
    }) => {
      await updateLessonProgress({
        path: { course_id: courseId!, lesson_id: lessonId },
        body: {
          status: body.status as "in_progress" | "completed" | undefined,
          watch_seconds: body.watch_seconds,
          resume_position_seconds: body.resume_position_seconds,
          last_watched_at: new Date().toISOString(),
        },
      });
    },
    onError: (err) => {
      console.error("Failed to save progress:", err);
    },
  });

  const sections: CourseSectionWithLessonsRead[] =
    curriculumData?.sections ?? [];

  const lessonsList = useMemo(() => {
    const list: Array<{
      lesson: CourseLessonRead;
      section: CourseSectionWithLessonsRead;
    }> = [];
    for (const section of sections) {
      for (const lesson of section.lessons ?? []) {
        if (!isEnrolled && !lesson.is_preview) continue;
        list.push({ lesson, section });
      }
    }
    return list;
  }, [sections, isEnrolled]);

  const sortedSections = useMemo(() => {
    return [...sections].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
  }, [sections]);

  useEffect(() => {
    if (sortedSections.length > 0 && expandedSections.size === 0) {
      const first = new Set<string>();
      for (const s of sortedSections) {
        if (s.lessons?.some((l) => l.id === lessonId)) {
          first.add(s.id);
          break;
        }
      }
      if (first.size === 0) first.add(sortedSections[0].id);
      setExpandedSections(first);
    }
  }, [sortedSections, lessonId, expandedSections.size]);

  const currentLesson = lessonVideo;
  const currentIndex = lessonsList.findIndex((l) => l.lesson.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessonsList[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < lessonsList.length - 1
      ? lessonsList[currentIndex + 1]
      : null;

  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [videoMuted, setVideoMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastLessonCompleted, setLastLessonCompleted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const video = document.querySelector("video");
      if (video) {
        setVideoTime(video.currentTime);
        setVideoDuration(video.duration || 0);
        setIsPaused(video.paused);
        setVideoVolume(video.volume);
        setVideoMuted(video.muted);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (course?.title) {
      document.title = course.title;
    }
  }, [course?.title]);

  useEffect(() => {
    const err = courseErrorObj as
      | { response?: { status?: number } }
      | null
      | undefined;
    if (courseError && err?.response?.status === 404) {
      notFound();
    }
  }, [courseError, courseErrorObj]);

  useEffect(() => {
    const err = lessonErrorObj as
      | { response?: { status?: number } }
      | null
      | undefined;
    if (lessonError && err?.response?.status === 404) {
      notFound();
    }
  }, [lessonError, lessonErrorObj]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const video = document.querySelector("video");
      if (!video) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (video.paused) video.play().catch(() => {});
          else video.pause();
          break;
        case "KeyF":
          e.preventDefault();
          if (!fullscreenRef.current) return;
          if (!document.fullscreenElement) {
            fullscreenRef.current.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - 10, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(
            video.currentTime + 10,
            video.duration || 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(video.volume + 0.1, 1);
          video.muted = false;
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(video.volume - 0.1, 0);
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    if (!fullscreenRef.current) return;
    if (!document.fullscreenElement) {
      fullscreenRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const handleProgress = useCallback((currentTime: number) => {
    progressRef.current = currentTime;
  }, []);

  const handlePause = useCallback(
    (currentTime: number) => {
      if (!courseId || !lessonId) return;
      if (currentTime <= 0) return;
      if (completedRef.current) {
        completedRef.current = false;
        return;
      }
      saveProgressMutation.mutate({
        status: "in_progress",
        watch_seconds: Math.floor(currentTime),
        resume_position_seconds: Math.floor(currentTime),
      });
    },
    [courseId, lessonId, saveProgressMutation]
  );

  const handleComplete = useCallback(() => {
    if (!courseId || !lessonId) return;
    completedRef.current = true;
    if (!nextLesson) {
      setLastLessonCompleted(true);
    }
    saveProgressMutation.mutate({
      status: "completed",
      watch_seconds: Math.floor(progressRef.current),
      resume_position_seconds: 0,
    });
    queryClient.invalidateQueries({ queryKey: ["course-progress", courseId] });
    queryClient.invalidateQueries({
      queryKey: ["lesson-progress", courseId, lessonId],
    });
    queryClient.invalidateQueries({ queryKey: ["all-lesson-progresses", courseId] });
  }, [courseId, lessonId, saveProgressMutation, queryClient, nextLesson]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const current = progressRef.current;
      if (current <= 0) return;
      saveProgressMutation.mutate({
        status: "in_progress",
        watch_seconds: Math.floor(current),
        resume_position_seconds: Math.floor(current),
      });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [courseId, lessonId, saveProgressMutation]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        const current = progressRef.current;
        if (current > 0) {
          saveProgressMutation.mutate({
            status: "in_progress",
            watch_seconds: Math.floor(current),
            resume_position_seconds: Math.floor(current),
          });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [saveProgressMutation]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  if (!user) return null;

  const totalLessons = lessonsList.length;
  const completedCount = courseProgress?.completed_lessons;
  const progressPercent =
    completedCount != null && totalLessons > 0
      ? Math.round((completedCount / totalLessons) * 100)
      : 0;

  if (!course) {
    return (
      <AuthGuard allowedRoles={["user", "admin"]}>
        <main className="h-screen flex flex-col bg-dark items-center justify-center">
          <LuxuryLoader size="lg" />
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={["user", "admin"]}>
      <main className="h-screen flex flex-col bg-dark">
        {/* Top header */}
        <div className="bg-dark border-b border-border px-4 sm:px-8 py-3 flex items-center gap-3 shrink-0">
          <Link
            href={`/courses/${slug}`}
            className="text-text-muted hover:text-text-main transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <span className="text-sm font-mono text-text-main truncate">
            {course?.title ?? "Course"}
          </span>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Video Area with integrated controls */}
          <div
            ref={fullscreenRef}
            className={cn(
              "flex-1 flex flex-col bg-dark min-w-0 min-h-0",
              isFullscreen && "relative"
            )}
          >
            <div className="relative flex-1 flex items-center justify-center bg-dark min-h-0 overflow-hidden">
              {currentLesson?.is_preview === false && !isEnrolled ? (
                <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                    <Lock size={32} className="text-gold" />
                  </div>
                  <h3 className="text-text-main text-lg font-semibold">
                    This lesson is locked
                  </h3>
                  <p className="text-text-muted text-sm max-w-md">
                    Enroll in this course to access all lessons including this
                    one.
                  </p>
                  <Link
                    href={`/courses/${slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-dark font-semibold text-sm hover:bg-gold/90 transition-colors"
                  >
                    Enroll Now
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : lessonVideoLoading ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="luxury-loader loader-lg" />
                  <span className="text-label font-mono text-text-muted mt-3">
                    Loading lesson...
                  </span>
                </div>
              ) : currentLesson && !currentLesson.computed_video_url ? (
                <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                    <VideoOff size={32} className="text-text-muted" />
                  </div>
                  <h3 className="text-text-main text-lg font-semibold">
                    Video Not Available
                  </h3>
                  <p className="text-text-muted text-sm max-w-md">
                    This lesson does not have a video yet. Check back later.
                  </p>
                </div>
              ) : (
                <VideoPlayer
                  videoUrl={currentLesson?.computed_video_url}
                  lessonStatus={currentLesson?.status}
                  resumePosition={
                    lessonProgress?.progress.resume_position_seconds
                  }
                  onProgress={handleProgress}
                  onPause={handlePause}
                  onComplete={handleComplete}
                  userName={user?.full_name}
                  userEmail={user?.email}
                  showWatermark={
                    user?.role === "admin" ||
                    isEnrolled ||
                    currentLesson?.is_preview === false
                  }
                />
              )}
            </div>

            {/* Controls Bar */}
            <div
              className={cn(
                "px-4 sm:px-8 py-4 transition-opacity duration-300",
                isFullscreen
                  ? "absolute bottom-0 left-0 right-0 z-10 bg-muted-light"
                  : "bg-muted-light border-t border-border",
                isFullscreen && !isPaused && "opacity-0 pointer-events-none"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-label font-mono text-text-muted shrink-0 w-14 text-right text-xs">
                  {formatDuration(videoTime)}
                </span>
                <div
                  className="flex-1 h-1 bg-border relative cursor-pointer group"
                  onClick={(e) => {
                    const video = document.querySelector("video");
                    if (!video || !video.duration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    video.currentTime = pos * video.duration;
                  }}
                >
                  <div
                    className="h-full bg-gold transition-all duration-300"
                    style={{
                      width: `${videoDuration > 0 ? (videoTime / videoDuration) * 100 : 0}%`,
                    }}
                  />
                  <button
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-text-main border-2 border-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      left: `${videoDuration > 0 ? (videoTime / videoDuration) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-label font-mono text-text-muted shrink-0 w-14 text-xs">
                  {formatDuration(videoDuration)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => {
                      const video = document.querySelector("video");
                      if (!video) return;
                      if (video.paused) video.play().catch(() => {});
                      else video.pause();
                    }}
                    className="text-text-muted hover:text-text-main transition-colors shrink-0"
                  >
                    {isPaused ? (
                      <Play size={18} className="fill-current" />
                    ) : (
                      <Pause size={18} />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const video = document.querySelector("video");
                      if (!video) return;
                      video.currentTime = Math.max(video.currentTime - 10, 0);
                    }}
                    className="text-text-muted hover:text-text-main transition-colors shrink-0"
                    title="Rewind 10s"
                  >
                    <RotateCcw size={16} />
                  </button>

                  <button
                    onClick={() => {
                      const video = document.querySelector("video");
                      if (!video || !video.duration) return;
                      video.currentTime = Math.min(
                        video.currentTime + 10,
                        video.duration
                      );
                    }}
                    className="text-text-muted hover:text-text-main transition-colors shrink-0"
                    title="Forward 10s"
                  >
                    <RotateCw size={16} />
                  </button>

                  <div className="hidden sm:flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const video = document.querySelector("video");
                        if (!video) return;
                        video.muted = !video.muted;
                      }}
                      className="text-text-muted hover:text-text-main transition-colors"
                    >
                      {videoMuted || videoVolume === 0 ? (
                        <VolumeX size={16} />
                      ) : videoVolume < 0.5 ? (
                        <Volume1 size={16} />
                      ) : (
                        <Volume2 size={16} />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={videoVolume}
                      onChange={(e) => {
                        const video = document.querySelector("video");
                        if (!video) return;
                        const v = parseFloat(e.target.value);
                        video.volume = v;
                        if (v === 0) video.muted = true;
                        else video.muted = false;
                      }}
                      className="w-20 h-1 accent-gold cursor-pointer"
                    />
                  </div>

                  <SpeedControl />

                  <div className="text-sm font-mono text-text-main truncate ml-2">
                    Lesson {currentIndex + 1}:{" "}
                    {currentLesson?.title ?? "Loading..."}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-text-muted shrink-0">
                  <button
                    onClick={handleFullscreenToggle}
                    className="text-text-muted hover:text-text-main transition-colors"
                    title="Fullscreen"
                  >
                    {isFullscreen ? (
                      <Minimize size={16} />
                    ) : (
                      <Maximize size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 text-text-muted">
                <div>
                  {prevLesson ? (
                    <Link
                      href={`/courses/${slug}/lessons/${prevLesson.lesson.id}`}
                      className="inline-flex items-center gap-1 text-label font-mono text-xs hover:text-gold transition-colors max-w-48 truncate"
                    >
                      <ChevronLeft size={12} />
                      {prevLesson.lesson.title}
                    </Link>
                  ) : (
                    <span className="text-text-muted/40 text-label font-mono text-xs flex items-center gap-1">
                      <ChevronLeft size={12} />
                      Previous
                    </span>
                  )}
                </div>
                <span className="text-text-muted/30">|</span>
                <div>
                  {nextLesson ? (
                    <Link
                      href={`/courses/${slug}/lessons/${nextLesson.lesson.id}`}
                      className="inline-flex items-center gap-1 text-label font-mono text-xs hover:text-gold transition-colors max-w-48 truncate"
                    >
                      {nextLesson.lesson.title}
                      <ChevronRight size={12} />
                    </Link>
                  ) : completedCount === totalLessons || lastLessonCompleted ? (
                    <Link
                      href={`/courses/${slug}`}
                      className="inline-flex items-center gap-1.5 text-label font-mono text-xs text-gold hover:text-gold/80 transition-colors"
                    >
                      <span>Course Complete</span>
                      <ArrowRight size={12} />
                    </Link>
                  ) : (
                    <span className="text-text-muted/40 text-label font-mono text-xs flex items-center gap-1">
                      Next
                      <ChevronRight size={12} />
                    </span>
                  )}
                </div>
              </div>

              {course?.whatsapp_channel_url && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <a
                    href={course.whatsapp_channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-label font-mono text-gold tracking-widest uppercase text-xs hover:underline"
                  >
                    <MessageCircle size={12} />
                    Join WhatsApp Community
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <Sidebar
            course={course}
            sections={sortedSections}
            currentLessonId={lessonId}
            courseSlug={slug}
            progressPercent={progressPercent}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            isEnrolled={isEnrolled}
            allProgresses={allProgresses}
          />

          <MobileSidebarToggle
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      </main>
    </AuthGuard>
  );
}

function Sidebar({
  course,
  sections,
  currentLessonId,
  courseSlug,
  progressPercent,
  expandedSections,
  toggleSection,
  isOpen,
  onClose,
  isEnrolled,
  allProgresses,
}: {
  course: CourseRead | undefined;
  sections: CourseSectionWithLessonsRead[];
  currentLessonId: string;
  courseSlug: string;
  progressPercent: number;
  expandedSections: Set<string>;
  toggleSection: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isEnrolled: boolean;
  allProgresses: Record<string, string> | undefined;
}) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity duration-300",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed lg:sticky top-0 lg:top-20 bottom-0 z-40 lg:z-0 w-80 lg:w-72 xl:w-80 shrink-0 bg-dark border-r border-border flex flex-col transition-transform duration-300 ease-premium",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="hidden lg:flex items-center justify-between p-4 lg:p-5 ">
          <Link
            href={`/courses/${courseSlug}`}
            className="text-text-main font-semibold text-sm hover:text-gold transition-colors truncate"
          >
            {course?.title ?? "Course"}
          </Link>
        </div>

        <div className="flex lg:hidden items-center justify-between p-4 border-b border-border">
          <span className="text-text-main font-semibold text-sm truncate">
            {course?.title ?? "Course"}
          </span>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-main transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {isEnrolled && (
          <div className="px-4 lg:px-5 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-label font-mono text-text-muted">
                Course progress
              </span>
              <span className="text-label font-mono text-gold">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all duration-700 ease-premium"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {sections.length === 0 && (
            <div className="p-5 text-text-muted text-sm">
              No curriculum available.
            </div>
          )}
          {sections.map((section, si) => {
            const sectionLessons = (section.lessons ?? []).filter(
              (l) => isEnrolled || l.is_preview
            );
            const isExpanded = expandedSections.has(section.id);
            return (
              <div
                key={section.id}
                className="border-b border-border last:border-b-0"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 lg:px-5 py-3 text-left hover:bg-muted-light transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-label font-mono text-gold tracking-widest uppercase mb-0.5">
                      Section{" "}
                      {section.sort_order != null
                        ? section.sort_order + 1
                        : "-"}
                    </div>
                    <div className="text-text-main text-sm font-medium truncate">
                      {section.title}
                    </div>
                  </div>
                  <span className="text-label font-mono text-text-muted shrink-0 ml-3">
                    {sectionLessons.length}
                  </span>
                </button>
                {isExpanded && (
                  <div className="bg-dark-soft">
                    {sectionLessons.map((lesson, idx) => {
                      const prevCount = sections
                        .slice(0, si)
                        .reduce(
                          (sum, s) =>
                            sum +
                            (s.lessons ?? []).filter(
                              (l) => isEnrolled || l.is_preview
                            ).length,
                          0
                        );
                      const globalIdx = prevCount + idx + 1;
                      const isActive = lesson.id === currentLessonId;
                      const hasVideo = !!lesson.computed_video_url;
                      const isCompleted =
                        allProgresses?.[lesson.id] === "completed";
                      const linkHref = `/courses/${courseSlug}/lessons/${lesson.id}`;
                      const content = (
                        <>
                          <div
                            className={cn(
                              "w-6 h-6 shrink-0 border flex items-center justify-center rounded",
                              isActive
                                ? "border-gold bg-gold/10"
                                : "border-border"
                            )}
                          >
                            <span
                              className={cn(
                                "text-tiny font-mono",
                                isActive ? "text-gold" : "text-text-muted"
                              )}
                            >
                              {isActive ? (
                                <Play
                                  size={9}
                                  className="ml-0.5"
                                  fill="currentColor"
                                />
                              ) : isCompleted ? (
                                <Check size={9} className="text-green-400" />
                              ) : hasVideo ? (
                                ""
                              ) : (
                                <X size={9} className="text-text-muted" />
                              )}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                "text-sm truncate",
                                isActive
                                  ? "text-text-main font-medium"
                                  : "text-text-muted"
                              )}
                            >
                              {globalIdx}. {lesson.title}
                            </div>
                            {lesson.video_duration_seconds != null &&
                              lesson.video_duration_seconds > 0 && (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-label font-mono text-text-muted">
                                    {formatDuration(
                                      lesson.video_duration_seconds
                                    )}
                                  </span>
                                  {!isEnrolled && lesson.is_preview && (
                                    <span className="text-label font-mono text-gold text-tiny uppercase tracking-wider">
                                      Free
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        </>
                      );
                      return hasVideo ? (
                        <Link
                          key={lesson.id}
                          href={linkHref}
                          onClick={() => {
                            if (window.innerWidth < 1024) {
                              const toggle = document.querySelector(
                                "[data-sidebar-toggle]"
                              ) as HTMLButtonElement;
                              toggle?.click();
                            }
                          }}
                          className={cn(
                            "flex items-center gap-3 px-4 lg:px-5 py-3 text-left border-b border-border last:border-b-0 transition-colors",
                            isActive ? "bg-muted" : "hover:bg-muted-light"
                          )}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div
                          key={lesson.id}
                          className={cn(
                            "flex items-center gap-3 px-4 lg:px-5 py-3 text-left border-b border-border last:border-b-0 opacity-60 cursor-default",
                            isActive && "bg-muted"
                          )}
                        >
                          {content}
                        </div>
                      );
                    })}
                    {sectionLessons.length === 0 && (
                      <div className="px-4 lg:px-5 py-3 text-text-muted text-xs">
                        No lessons yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}

function MobileSidebarToggle({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      data-sidebar-toggle
      onClick={onToggle}
      className={cn(
        "lg:hidden fixed top-3 right-3 z-50 w-8 h-8 flex items-center justify-center bg-surface border border-border shadow-lg transition-all duration-300",
        isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
      aria-label="Toggle sidebar"
    >
      <Menu size={16} className="text-text-main" />
    </button>
  );
}
