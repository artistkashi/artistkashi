"use client";

import { GhostBtn, PrimaryBtn } from "@/components/ui/buttons";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { RevealBlock } from "@/components/ui/misc";
import { COURSES, CURRICULUM } from "@/data/constants";
import { useAuth } from "@/lib/auth-store";
import { getSafeReturnTo } from "@/lib/auth-utils";
import {
  ArrowRight,
  BookOpen,
  Check,
  Minus,
  Play,
  Plus,
  Star,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { notFound, usePathname, useRouter } from "next/navigation";
import { use, useState } from "react";

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = parseInt(resolvedParams.id);
  const course = COURSES.find((c) => c.id === courseId) || COURSES[0]; // Fallback for demo

  const [openSection, setOpenSection] = useState<number | null>(0);
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const returnTo = getSafeReturnTo(pathname) ?? "/";
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const goToLesson = () => {
    if (!user) {
      router.push(loginHref);
      return;
    }

    router.push("/lesson-player");
  };

  if (!course) notFound();

  return (
    <main className="pt-24 min-h-screen">
      {/* Banner */}
      <div className="relative h-[55vh] min-h-100 overflow-hidden">
        <ImageWithFallback
          src={course.image_url || ""}
          alt={course.title}
          className="w-full h-full object-cover grayscale opacity-50"
        />
        <div className="absolute inset-0 bg-linear-to-r from-dark via-dark/80 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end px-8 lg:px-16 pb-14 max-w-360 mx-auto">
          <div className="text-label font-mono text-gold tracking-[0.2em] uppercase mb-4">
            Masterclass
          </div>
          <h1 className="text-h2 font-extrabold tracking-[-0.02em] text-text-main leading-tight max-w-2xl mb-4">
            {course.title}
          </h1>
          <p className="text-text-muted max-w-md mb-6">
            {course.subtitle ?? ""}
          </p>
          <div className="flex items-center gap-6 text-sm font-mono text-text-muted">
            <span className="flex items-center gap-1.5">
              <Star size={12} fill="var(--color-gold)" className="text-gold" />
              {course.rating}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={12} />
              {course.students_count.toLocaleString()} students
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen size={12} />
              {course.lessons_count} lessons · {course.duration}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-360 mx-auto px-8 lg:px-16 pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Content */}
          <div className="lg:col-span-8">
            <RevealBlock>
              <div className="mb-16">
                <h2 className="text-text-main font-bold text-3xl mb-6">
                  About This Course
                </h2>
                <p className="text-text-muted leading-relaxed mb-4">
                  {course.title} is a comprehensive entry into the classical
                  tradition of art. Over {course.lessons_count} lessons spanning
                  studio practice, technique, and compositional thinking, you
                  will build a solid technical foundation alongside an
                  expressive personal voice.
                </p>
                <p className="text-text-muted leading-relaxed">
                  Each module moves from concept to creation. You will work
                  through foundational exercises and advanced techniques —
                  building fluency with the medium while developing your
                  artistic eye.
                </p>
              </div>
            </RevealBlock>

            <RevealBlock>
              <div className="mb-16">
                <h2 className="text-text-main font-bold text-3xl mb-8">
                  Curriculum
                </h2>
                <div className="border border-border">
                  {CURRICULUM.map((s, i) => (
                    <div
                      key={i}
                      className="border-b border-border last:border-b-0"
                    >
                      <button
                        onClick={() =>
                          setOpenSection(openSection === i ? null : i)
                        }
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-muted-light transition-colors"
                      >
                        <div>
                          <div className="text-label font-mono text-gold tracking-widest mb-1">
                            Section {i + 1}
                          </div>
                          <span className="text-text-main font-semibold">
                            {s.section}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-label font-mono text-text-muted">
                            {s.lessons.length} lessons
                          </span>
                          {openSection === i ? (
                            <Minus size={14} className="text-text-muted" />
                          ) : (
                            <Plus size={14} className="text-text-muted" />
                          )}
                        </div>
                      </button>
                      <AnimatePresence>
                        {openSection === i && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.35 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-dark-soft border-t border-border">
                              {s.lessons.map((l, j) => (
                                <Link
                                  key={j}
                                  href={user ? "/lesson-player" : loginHref}
                                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-muted-light transition-colors border-b border-border last:border-b-0"
                                >
                                  <div className="w-8 h-8 bg-muted border border-border flex items-center justify-center shrink-0">
                                    <Play
                                      size={11}
                                      className="text-text-muted ml-0.5"
                                    />
                                  </div>
                                  <span className="text-text-muted text-sm hover:text-text-main transition-colors">
                                    {l}
                                  </span>
                                  <span className="ml-auto text-label font-mono text-text-muted">
                                    12:30
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            </RevealBlock>

            {/* Instructor */}
            <RevealBlock>
              <div className="p-8 border border-border bg-muted-light flex gap-6 mb-16">
                <div className="w-20 h-20 bg-border shrink-0 overflow-hidden">
                  <ImageWithFallback
                    src={course.image_url || ""}
                    alt={course.instructor}
                    className="w-full h-full object-cover grayscale"
                  />
                </div>
                <div>
                  <div className="text-tiny font-mono text-gold tracking-widest uppercase mb-1">
                    Instructor
                  </div>
                  <div className="text-text-main font-bold text-xl mb-2">
                    {course.instructor}
                  </div>
                  <p className="text-text-muted text-sm leading-relaxed">
                    A master in the field with decades of experience in the arts
                    and education.
                  </p>
                </div>
              </div>
            </RevealBlock>
          </div>

          {/* Purchase Card */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 border border-border bg-muted-light">
              <div className="relative aspect-video overflow-hidden">
                <ImageWithFallback
                  src={course.image_url || ""}
                  alt={course.title}
                  className="w-full h-full object-cover grayscale"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Link href="/lesson-player">
                    <button className="w-16 h-16 bg-text-main/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-gold/20 hover:border-gold/40 transition-all">
                      <Play
                        size={22}
                        fill="white"
                        className="text-white ml-1"
                      />
                    </button>
                  </Link>
                </div>
              </div>
              <div className="p-8">
                <div className="text-text-main font-extrabold text-4xl mb-1">
                  ₹{course.price}
                </div>
                <div className="text-label font-mono text-text-muted tracking-widest mb-8">
                  Lifetime access · All devices
                </div>

                <PrimaryBtn
                  type="button"
                  onClick={goToLesson}
                  className="w-full justify-center mb-4"
                >
                  Enroll Now <ArrowRight size={16} />
                </PrimaryBtn>
                <GhostBtn
                  type="button"
                  onClick={goToLesson}
                  className="w-full justify-center"
                >
                  Preview Free Lesson
                </GhostBtn>
                <div className="mt-8 space-y-3">
                  {[
                    `${course.lessons_count} video lessons`,
                    (course.duration || "Self-paced") + " of content",
                    "Downloadable reference PDFs",
                    "Private critique forum",
                    "Certificate of completion",
                    "Lifetime updates",
                  ].map((f) => (
                    <div
                      key={f}
                      className="flex items-center gap-3 text-sm text-text-muted"
                    >
                      <Check size={14} className="text-gold shrink-0" /> {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
