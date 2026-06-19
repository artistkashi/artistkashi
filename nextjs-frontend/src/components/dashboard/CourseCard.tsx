import { ChevronRight, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CourseRead } from "@/api/openapi-client";

interface CourseCardProps {
  course: CourseRead;
  completedLessons?: number;
  totalLessons?: number;
}

export function CourseCard({
  course,
  completedLessons = 0,
  totalLessons = course.lessons_count,
}: CourseCardProps) {
  const progress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <Link
      href="/lesson-player"
      className="group block border border-border bg-surface card-luxury-hover overflow-hidden rounded"
    >
      <div className="relative w-full aspect-video overflow-hidden bg-dark">
        <Image
          src={course.image_url || ""}
          alt={course.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-premium"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="text-tiny font-mono tracking-widest uppercase bg-dark/80 border border-white/10 px-2.5 py-1 text-text-main">
            {course.category || "Course"}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-text-main font-semibold text-sm md:text-base leading-snug mb-0.5 truncate">
          {course.title}
        </h3>
        <p className="text-text-muted text-xs font-mono mb-2">
          {course.instructor}
        </p>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-tiny font-mono text-text-muted shrink-0">
            {progress}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-tiny font-mono text-text-muted">
            {completedLessons}/{totalLessons} lessons
          </span>
          <span className="inline-flex items-center gap-1 text-tiny font-mono tracking-widest uppercase text-gold group-hover:gap-1.5 transition-all">
            <Play size={10} /> Continue
          </span>
        </div>
      </div>
    </Link>
  );
}
