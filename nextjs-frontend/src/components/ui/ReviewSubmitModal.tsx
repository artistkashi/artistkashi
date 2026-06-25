"use client";

import { unwrap } from "@/api/client-service";
import type { ReviewType } from "@/api/openapi-client";
import { createCourseReview, createProductReview } from "@/api/openapi-client";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles, Star, X } from "lucide-react";
import { useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { PrimaryBtn } from "./buttons";
import { StarRating } from "./StarRating";

interface ReviewSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  reviewType?: ReviewType;
  entityId?: string;
  entityName?: string;
}

const reviewSchema = z.object({
  rating: z.number().min(0.5).max(5).refine((val) => val * 2 % 1 === 0, {
    message: "Rating must be in 0.5 increments",
  }),
  text: z
    .string()
    .min(1, "The narrative must not be empty")
    .max(1000, "The narrative is too long"),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

export function ReviewSubmitModal({
  isOpen,
  onClose,
  onSuccess,
  reviewType = "course",
  entityId,
  entityName,
}: ReviewSubmitModalProps) {
  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 5,
      text: "",
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { isSubmitting, errors },
  } = form;

  const onSubmit = useCallback(
    async (data: ReviewFormData) => {
      try {
        if (reviewType === "course") {
          await unwrap(
            createCourseReview({
              path: { slug: entityId! },
              body: {
                rating: data.rating,
                text: data.text,
              },
            })
          );
        } else if (reviewType === "product") {
          await unwrap(
            createProductReview({
              path: { slug: entityId! },
              body: {
                rating: data.rating,
                text: data.text,
              },
            })
          );
        } else {
          throw new Error("Review type not supported");
        }

        reset();
        onClose();
        onSuccess?.();
      } catch (err: unknown) {
        console.error("Failed to submit review:", err);
      }
    },
    [reviewType, entityId, onClose, onSuccess, reset]
  );

  const watchedText = watch("text");

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          key="review-modal-outer"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            key="review-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/95 backdrop-blur-sm"
          />

          <motion.div
            key="review-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-surface border border-border shadow-lg flex flex-col card-luxury overflow-hidden"
          >
            {/* Header */}
            <div className="p-card border-b border-border flex justify-between items-center bg-surface shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-primary/20 flex items-center justify-center bg-gold-bg">
                  <Sparkles className="text-primary" size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-[0.2em] text-foreground uppercase">
                    Chronicle Vision
                  </h2>
                  <p className="text-2xs text-text-muted font-mono tracking-[0.3em] uppercase mt-0.5">
                    Share your aesthetic truth
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-gold-bg transition-all rounded-full text-text-muted hover:text-primary"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-card space-y-8">
              {entityName && (
                <div className="border-l-2 border-primary/30 pl-4 py-1">
                  <p className="text-2xs font-mono uppercase tracking-[0.2em] text-text-muted">
                    Analyzing
                  </p>
                  <p className="text-sm font-bold text-foreground tracking-wide mt-0.5">
                    {entityName}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Rating */}
                <div className="space-y-4">
                  <label className="text-label! font-mono tracking-widest uppercase text-text-muted block">
                    Intimacy Level (Rating)
                  </label>
                  <Controller
                    name="rating"
                    control={control}
                    render={({ field }) => (
                      <StarRating
                        rating={field.value}
                        size={28}
                        interactive
                        onChange={(value) => field.onChange(value)}
                      />
                    )}
                  />
                  {errors.rating && (
                    <p className="text-xs text-danger font-mono mt-1">
                      {errors.rating.message}
                    </p>
                  )}
                </div>

                {/* Review Text */}
                <div className="space-y-4">
                  <label
                    htmlFor="review-text"
                    className="text-label! font-mono tracking-widest uppercase text-text-muted block"
                  >
                    The Chronicle (Narrative)
                  </label>
                  <div className="relative">
                    <textarea
                      id="review-text"
                      {...register("text")}
                      placeholder="Detail the depth, the brushstrokes, the soul of the piece..."
                      className="w-full bg-surface border border-border px-4 py-4 text-sm text-foreground rounded-sm focus:border-primary outline-none transition-all duration-300 resize-none min-h-40 placeholder:text-text-muted/40"
                    />
                    <div className="absolute bottom-4 right-4">
                      <p
                        className={cn(
                          "text-2xs font-mono tracking-widest transition-colors",
                          (watchedText || "").length > 900
                            ? "text-danger"
                            : "text-text-muted/40"
                        )}
                      >
                        {(watchedText || "").length}/1000
                      </p>
                    </div>
                  </div>
                  {errors.text && (
                    <p className="text-xs text-danger font-mono mt-1">
                      {errors.text.message}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 px-8 py-4 border border-border text-text-muted text-2xs font-mono uppercase tracking-[0.2em] hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                  <PrimaryBtn
                    type="submit"
                    disabled={isSubmitting || !watchedText?.trim()}
                    className="flex-1 text-xs"
                  >
                    {isSubmitting ? (
                      <div className="luxury-loader scale-75" />
                    ) : (
                      <>
                        <Send size={14} className="mr-2" />
                        <span>Imprint Archive</span>
                      </>
                    )}
                  </PrimaryBtn>
                </div>
              </form>
            </div>

            <p className="text-2xs font-mono tracking-widest text-text-muted/30 pb-6 text-center uppercase">
              Visions are refined by the curator before public unveiling.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
