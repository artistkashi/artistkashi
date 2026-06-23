"use client";

import { CourseListRead } from "@/api/openapi-client";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { RevealBlock } from "@/components/ui/misc";
import { displayPrice } from "@/lib/utils";
import { Clock, Play, Star } from "lucide-react";
import Link from "next/link";

interface CourseCardProps {
  course: CourseListRead;
  delay?: number;
}

function formatDuration(seconds: number | undefined | null): string {
  if (!seconds) return "Self-paced";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function CourseCard({ course, delay = 0 }: CourseCardProps) {
  return (
    <RevealBlock delay={delay}>
      <Link
        href={`/courses/${course.slug}`}
        className="group bg-surface block w-full text-left transition-all duration-500 card-luxury-hover overflow-hidden rounded-sm"
      >
        <div className="relative overflow-hidden aspect-video">
          <ImageWithFallback
            src={course.computed_thumbnail_url}
            alt={course.title}
            fill
            unoptimized
            className="object-fill reveal-image group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-dark/80 via-transparent to-transparent opacity-60" />
          <div className="absolute top-4 left-4">
            <span className="bg-background/80 backdrop-blur-sm text-primary text-2xs font-mono tracking-widest uppercase px-3 py-1.5 border border-primary/20">
              {course.level || "Masterclass"}
            </span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[2px]">
            <div className="w-16 h-16 bg-primary/10 border border-primary/30 flex items-center justify-center rounded-full gold-glow">
              <Play
                size={24}
                fill="var(--color-primary)"
                className="text-primary ml-1.5"
              />
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-2xs font-mono text-text-muted tracking-[0.2em] uppercase mb-3">
            {course.level ?? "Masterclass"}
          </div>
          <h3 className="text-foreground font-bold text-xl leading-tight mb-3 tracking-wide group-hover:text-primary transition-colors italic">
            {course.title}
          </h3>
          <p className="text-text-muted text-sm mb-6 line-clamp-2 leading-relaxed font-mono">
            {course.short_description}
          </p>
          <div className="flex items-center justify-between pt-6 border-t border-border/10">
            <div className="flex items-center gap-4 text-2xs font-mono text-text-muted uppercase tracking-widest">
              <span className="flex items-center gap-2">
                <Clock size={12} className="text-primary" />
                {formatDuration(course.total_duration_seconds)}
              </span>
            </div>
            <span className="text-primary font-bold text-xl italic">
              {displayPrice(course.price)}
            </span>
          </div>
        </div>
      </Link>
    </RevealBlock>
  );
}

export function CourseCardGrid({ course, delay = 0 }: CourseCardProps) {
  return (
    <RevealBlock delay={delay}>
      <Link
        href={`/courses/${course.slug}`}
        className="group bg-surface block w-full text-left transition-all duration-500 card-luxury-hover overflow-hidden rounded-sm"
      >
        <div className="relative overflow-hidden aspect-video">
          <ImageWithFallback
            src={course.computed_thumbnail_url}
            alt={course.title}
            unoptimized
            className="object-fill reveal-image group-hover:scale-110 w-full h-full"
          />
          {/* <div className="absolute inset-0 bg-linear-to-t from-dark to-transparent opacity-40" /> */}
          <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm text-foreground text-2xs font-mono tracking-widest px-3 py-1.5 border border-border uppercase rounded">
            {course.level ?? "Beginner"}
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
            <div className="w-12 h-12 bg-primary/20 border border-primary/40 flex items-center justify-center rounded-full gold-glow">
              <Play
                size={20}
                fill="var(--color-primary)"
                className="text-primary ml-1"
              />
            </div>
          </div>
        </div>
        <div className="p-6">
          <h3 className="text-foreground font-bold text-lg mb-2 tracking-wide group-hover:text-primary transition-colors italic">
            {course.title}
          </h3>
          <p className="text-text-muted text-xs mb-6 line-clamp-2 leading-relaxed font-mono opacity-80">
            {course.short_description}
          </p>
          <div className="flex items-center gap-4 text-2xs font-mono text-text-muted mb-6 uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <Clock size={11} className="text-primary" />
              {formatDuration(course.total_duration_seconds)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border/10 pt-5 mt-auto">
            <span className="text-primary font-bold text-2xl italic">
              {displayPrice(course.price)}
            </span>
            <span className="text-text-muted text-xs font-mono uppercase tracking-widest flex items-center gap-2 group-hover:text-primary transition-colors border-b border-transparent group-hover:border-primary pb-0.5">
              Enroll <Play size={10} className="fill-current" />
            </span>
          </div>
        </div>
      </Link>
    </RevealBlock>
  );
}

export function CourseCardListItem({ course, delay = 0 }: CourseCardProps) {
  return (
    <RevealBlock delay={delay}>
      <Link
        href={`/courses/${course.slug}`}
        className="group bg-surface flex items-stretch transition-all duration-500 card-luxury-hover overflow-hidden rounded-sm"
      >
        <div className="relative w-40 shrink-0 overflow-hidden self-stretch min-h-24 aspect-video">
          <ImageWithFallback
            src={course.computed_thumbnail_url}
            alt={course.title}
            unoptimized
            className="object-fill reveal-image group-hover:scale-110 w-full h-full"
          />
          <div className="absolute inset-0 bg-dark/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="w-10 h-10 bg-primary/20 border border-primary/40 flex items-center justify-center rounded-full gold-glow">
              <Play
                size={16}
                fill="var(--color-primary)"
                className="text-primary ml-1"
              />
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center px-4 py-3 min-w-0">
          <div className="flex items-center gap-2 text-2xs font-mono text-text-muted mb-1">
            <span className="uppercase tracking-widest">
              {course.level ?? "Masterclass"}
            </span>
            <span className="text-text-muted/30">|</span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatDuration(course.total_duration_seconds)}
            </span>
            {!!course.average_rating && (
              <>
                <span className="text-text-muted/30">|</span>
                <span className="flex items-center gap-1 text-gold">
                  <Star size={10} className="fill-gold" />
                  {course.average_rating.toFixed(1)}
                </span>
              </>
            )}
          </div>
          <h3 className="text-foreground font-bold text-sm leading-tight tracking-wide group-hover:text-primary transition-colors italic truncate">
            {course.title}
          </h3>
          {course.short_description && (
            <p className="text-text-muted text-xs leading-relaxed font-mono opacity-70 truncate mt-0.5">
              {course.short_description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end justify-center gap-1 pr-5 shrink-0">
          <span className="text-primary font-bold text-lg italic whitespace-nowrap leading-none mb-4">
            {displayPrice(course.price)}
          </span>
          <span className="text-text-muted text-xs font-mono uppercase tracking-widest flex items-center gap-1.5 group-hover:text-primary transition-colors border-b border-transparent group-hover:border-primary pb-0.5 leading-none ">
            Enroll <Play size={9} className="fill-current" />
          </span>
        </div>
      </Link>
    </RevealBlock>
  );
}
