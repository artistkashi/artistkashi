"use client";

import { CourseRead } from "@/api/openapi-client";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { RevealBlock } from "@/components/ui/misc";
import { displayPrice } from "@/lib/utils";
import { Clock, Play, Star } from "lucide-react";
import Link from "next/link";

interface CourseCardProps {
  course: CourseRead;
  delay?: number;
}

export function CourseCard({ course, delay = 0 }: CourseCardProps) {
  return (
    <RevealBlock delay={delay}>
      <Link
        href={`/courses/${course.id}`}
        className="group bg-surface block w-full text-left transition-all duration-500 card-luxury-hover overflow-hidden rounded-sm"
      >
        <div className="relative overflow-hidden aspect-video">
          <ImageWithFallback
            src={course.image_url || ""}
            alt={course.title}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-dark/80 via-transparent to-transparent opacity-60" />
          <div className="absolute top-4 left-4">
            <span className="bg-background/80 backdrop-blur-sm text-primary text-2xs font-mono tracking-widest uppercase px-3 py-1.5 border border-primary/20">
              {course.category || "Masterclass"}
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
            Curated by {course.instructor}
          </div>
          <h3 className="text-foreground font-bold text-xl leading-tight mb-3 tracking-wide group-hover:text-primary transition-colors italic">
            {course.title}
          </h3>
          <p className="text-text-muted text-sm mb-6 line-clamp-2 leading-relaxed font-mono">
            {course.description}
          </p>
          <div className="flex items-center justify-between pt-6 border-t border-border/10">
            <div className="flex items-center gap-4 text-2xs font-mono text-text-muted uppercase tracking-widest">
              <span className="flex items-center gap-2">
                <Clock size={12} className="text-primary" />
                {course.duration || "Self-paced"}
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
        href={`/courses/${course.id}`}
        className="group bg-surface block w-full text-left transition-all duration-500 card-luxury-hover overflow-hidden rounded-sm"
      >
        <div className="relative overflow-hidden aspect-video">
          <ImageWithFallback
            src={course.image_url || ""}
            alt={course.title}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-dark to-transparent opacity-40" />
          <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm text-foreground text-2xs font-mono tracking-widest px-3 py-1.5 border border-border uppercase">
            {course.category || "Masterclass"}
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
          <div className="flex items-center gap-3 mb-3">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star
                  key={`course-star-${course.id}-${j}`}
                  size={12}
                  fill={
                    j < Math.floor(course.rating)
                      ? "var(--color-primary)"
                      : "none"
                  }
                  className={
                    j < Math.floor(course.rating)
                      ? "text-primary gold-glow"
                      : "text-border"
                  }
                />
              ))}
            </div>
            <span className="text-text-muted text-2xs font-mono tracking-tighter uppercase">
              {course.rating} / 5.0
            </span>
          </div>
          <h3 className="text-foreground font-bold text-lg mb-2 tracking-wide group-hover:text-primary transition-colors italic">
            {course.title}
          </h3>
          <p className="text-text-muted text-xs mb-6 line-clamp-2 leading-relaxed font-mono opacity-80">
            {course.description}
          </p>
          <div className="flex items-center gap-4 text-2xs font-mono text-text-muted mb-6 uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <Clock size={11} className="text-primary" />
              {course.duration || "Self-paced"}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border/10 pt-5 mt-auto">
            <span className="text-primary font-bold text-2xl italic">
              {displayPrice(course.price)}
            </span>
            <span className="text-text-muted text-2xs font-mono uppercase tracking-widest flex items-center gap-2 group-hover:text-primary transition-colors border-b border-transparent hover:border-primary/40 pb-0.5">
              Enroll <Play size={10} className="fill-current" />
            </span>
          </div>
        </div>
      </Link>
    </RevealBlock>
  );
}
