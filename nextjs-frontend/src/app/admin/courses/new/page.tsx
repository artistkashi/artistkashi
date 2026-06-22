"use client";

import { unwrap } from "@/api/client-service";
import { createCourse } from "@/api/openapi-client";
import {
  CourseForm,
  type CourseFormValues,
} from "@/components/admin/courses/CourseForm";
import { PrimaryBtn } from "@/components/ui/buttons";
import { getErrorMessage } from "@/lib/error-handler";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function NewCoursePage() {
  const [createdCourse, setCreatedCourse] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const mutation = useMutation({
    mutationFn: (data: CourseFormValues) => {
      const payload = JSON.stringify({
        title: data.title,
        slug: data.slug || null,
        short_description: data.short_description || null,
        description: data.description || null,
        level: data.level,
        language: data.language,
        price: data.price,
        whatsapp_channel_url: data.whatsapp_channel_url || null,
        welcome_message: data.welcome_message || null,
        category_id: data.category_id || null,
        what_you_will_learn:
          data.what_you_will_learn.filter(Boolean).length > 0
            ? data.what_you_will_learn.filter(Boolean)
            : null,
        requirements:
          data.requirements.filter(Boolean).length > 0
            ? data.requirements.filter(Boolean)
            : null,
        is_featured: data.is_featured,
        is_published: data.is_published,
        thumbnail_url: data.thumbnail_url ?? null,
        demo_video_url: data.demo_video_url ?? null,
      });
      return unwrap(
        createCourse({
          body: { payload, thumbnail: data.thumbnail ?? null, demo_video: data.demo_video ?? null },
        })
      );
    },
    onSuccess: (course) => {
      setCreatedCourse({ id: course.id, title: course.title });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <>
      <div className="lg:h-[calc(100vh-164px)] flex flex-col space-y-6 lg:overflow-hidden pb-10 lg:pb-0">
        <div className="shrink-0 px-1 pt-4 lg:pt-0">
          <Link
            href="/admin/courses"
            className="flex items-center gap-2 text-2xs font-mono uppercase tracking-[0.2em] text-text-muted hover:text-gold transition-colors"
          >
            <ChevronLeft size={14} /> Back to Courses
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 shrink-0 px-1">
          <div>
            <h1 className="text-4xl font-black text-text-main tracking-tighter uppercase leading-none">
              New <span className="text-gold italic">Course</span>
            </h1>
            <p className="text-text-muted text-xs mt-3 uppercase font-mono tracking-[0.3em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
              Create a new masterclass
            </p>
          </div>
        </div>

        <div className="flex-1 lg:overflow-y-auto lg:custom-scrollbar px-1">
          <div className="border border-border/60 bg-surface/30 backdrop-blur-md rounded-sm p-6 md:p-8">
            <CourseForm
              onSubmit={(data) => mutation.mutate(data)}
              isSubmitting={mutation.isPending}
            />
          </div>
        </div>
      </div>

      <SuccessModal
        course={createdCourse}
        onClose={() => setCreatedCourse(null)}
      />
    </>
  );
}

function SuccessModal({
  course,
  onClose,
}: {
  course: { id: string; title: string } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (course) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(() => router.push("/admin/courses"), 300);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [course, router]);

  return (
    <AnimatePresence>
      {course && show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 260 }}
            className="relative w-full max-w-sm bg-surface border border-border/60 rounded-sm shadow-2xl overflow-hidden"
          >
            {/* Accent bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 2.5, ease: "linear" }}
              style={{ transformOrigin: "left" }}
              className="absolute top-0 left-0 right-0 h-0.5 bg-gold"
            />

            <div className="p-10 flex flex-col items-center text-center gap-6">
              {/* Animated checkmark */}
              <div className="relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.15,
                  }}
                  className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/40 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.3 }}
                  >
                    <Check size={36} className="text-gold" strokeWidth={2.5} />
                  </motion.div>
                </motion.div>

                {/* Ring ripple */}
                <motion.div
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 1, delay: 0.5, repeat: Infinity }}
                  className="absolute inset-0 w-20 h-20 rounded-full border border-gold/30"
                />
              </div>

              {/* Text */}
              <div className="space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg font-black text-foreground uppercase tracking-tight"
                >
                  Course Created
                  <br />
                  <span className="text-gold">Successfully</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-xs text-text-muted font-mono uppercase tracking-widest leading-relaxed"
                >
                  {course.title}
                </motion.p>
              </div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col w-full gap-3 pt-2"
              >
                <PrimaryBtn
                  onClick={() => {
                    setShow(false);
                    setTimeout(() => router.push("/admin/courses"), 300);
                  }}
                  className="w-full justify-center py-3.5 text-xs tracking-[0.3em]"
                >
                  <ExternalLink size={14} /> VIEW ALL COURSES
                </PrimaryBtn>
                <button
                  onClick={() => {
                    setShow(false);
                    setTimeout(() => router.push(`/admin/courses/${course.id}`), 300);
                  }}
                  className="text-2xs font-mono uppercase tracking-[0.2em] text-text-muted hover:text-gold transition-colors"
                >
                  Edit This Course
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
