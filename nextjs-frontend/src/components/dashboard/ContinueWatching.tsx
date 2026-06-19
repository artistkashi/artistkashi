import { ArrowUpRight, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { COURSES } from "@/data/constants";
import { cn } from "@/lib/utils";

export function ContinueWatching() {
  const course = COURSES[0];
  return (
    <div className="border border-border bg-surface overflow-hidden card-luxury-hover rounded">
      <div className="px-6 md:px-8 py-5 md:py-6 border-b border-border flex items-center justify-between">
        <h2 className="text-text-main font-bold text-lg md:text-xl">
          Continue Watching
        </h2>
        <Link
          href="/lesson-player"
          className="text-gold text-tiny font-mono tracking-widest uppercase hover:text-text-main transition-colors flex items-center gap-1.5"
        >
          View All <ArrowUpRight size={12} />
        </Link>
      </div>
      <Link
        href="/lesson-player"
        className="group block p-4 md:p-6 hover:bg-muted/50 transition-colors"
      >
        <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
          <div className="relative w-full sm:w-52 md:w-64 shrink-0 aspect-video sm:aspect-course overflow-hidden bg-dark">
            <Image
              src={course.image_url || ""}
              alt={course.title}
              fill
              sizes="(max-width: 640px) 100vw, 256px"
              className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-premium"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
              <div className="w-12 h-12 rounded-full border-2 border-white/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Play
                  size={20}
                  fill="white"
                  className="text-white ml-0.5 drop-shadow-md"
                />
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center min-w-0 py-1">
            <div className="text-tiny font-mono text-text-muted uppercase tracking-widest mb-1.5">
              Lesson 3 of {course.lessons_count || 42}
            </div>
            <div className="text-text-main font-semibold text-base md:text-lg mb-3 leading-snug">
              {course.title || "Color theory for oil painters"}
            </div>
            <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all duration-700"
                style={{ width: "34%" }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-label font-mono text-text-muted">
                34% complete
              </span>
              <span className="text-label font-mono text-text-muted">
                14 min remaining
              </span>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center gap-2 text-tiny font-mono tracking-widest uppercase text-gold border border-gold/30 px-4 py-2 hover:bg-gold-bg transition-colors group-hover:border-gold/60">
                Continue <ArrowUpRight size={12} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
