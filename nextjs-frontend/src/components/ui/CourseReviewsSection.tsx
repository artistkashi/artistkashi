"use client";

import { unwrap, unwrapPaginated } from "@/api/client-service";
import type {
  ReviewCreate,
  ReviewReadPublic,
  ReviewUpdate,
} from "@/api/openapi-client";
import {
  createCourseReview,
  deleteCourseReview,
  getMyCourseReview,
  listCourseReviews,
  updateCourseReview,
} from "@/api/openapi-client";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { PrimaryBtn } from "./buttons";
import { CourseReviewCard } from "./CourseReviewCard";
import { StarRating } from "./StarRating";

interface CourseReviewsSectionProps {
  courseSlug: string;
  courseId: string;
  isEnrolled: boolean;
  isAuthenticated: boolean;
}

export function CourseReviewsSection({
  courseSlug,
  isEnrolled,
  isAuthenticated,
}: CourseReviewsSectionProps) {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewReadPublic | null>(
    null
  );
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState("");
  const queryClient = useQueryClient();

  const pageSize = 10;

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["course-reviews", courseSlug, page],
    queryFn: async () => {
      const result = await unwrapPaginated(
        listCourseReviews({
          path: { slug: courseSlug },
          query: { page, page_size: pageSize },
        })
      );
      return result;
    },
  });

  const { data: myReview, isLoading: myReviewLoading } = useQuery({
    queryKey: ["my-course-review", courseSlug],
    queryFn: async () => {
      try {
        return await unwrap(getMyCourseReview({ path: { slug: courseSlug } }));
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
  });

  const reviews = reviewsData?.data ?? [];
  const pagination = reviewsData?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  const createMutation = useMutation({
    mutationFn: async (payload: ReviewCreate) => {
      await unwrap(
        createCourseReview({
          path: { slug: courseSlug },
          body: payload,
        })
      );
    },
    onSuccess: () => {
      toast.success("Review submitted successfully");
      setShowForm(false);
      setFormRating(5);
      setFormText("");
      queryClient.invalidateQueries({
        queryKey: ["course-reviews", courseSlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["my-course-review", courseSlug],
      });
    },
    onError: () => {
      toast.error("Failed to submit review");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: ReviewUpdate) => {
      await unwrap(
        updateCourseReview({
          path: { slug: courseSlug },
          body: payload,
        })
      );
    },
    onSuccess: () => {
      toast.success("Review updated successfully");
      setEditingReview(null);
      setFormRating(5);
      setFormText("");
      queryClient.invalidateQueries({
        queryKey: ["course-reviews", courseSlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["my-course-review", courseSlug],
      });
    },
    onError: () => {
      toast.error("Failed to update review");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await unwrap(deleteCourseReview({ path: { slug: courseSlug } }));
    },
    onSuccess: () => {
      toast.success("Review deleted");
      queryClient.invalidateQueries({
        queryKey: ["course-reviews", courseSlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["my-course-review", courseSlug],
      });
    },
    onError: () => {
      toast.error("Failed to delete review");
    },
  });

  const handleEdit = (review: ReviewReadPublic) => {
    setEditingReview(review);
    setFormRating(typeof review.rating === 'number' ? review.rating : parseFloat(review.rating));
    setFormText(review.text);
    setShowForm(true);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete your review?")) {
      deleteMutation.mutate();
    }
  };

  const handleSubmit = () => {
    if (editingReview) {
      updateMutation.mutate({ rating: formRating, text: formText });
    } else {
      createMutation.mutate({ rating: formRating, text: formText });
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingReview(null);
    setFormRating(5);
    setFormText("");
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const canSubmit = formText.trim().length > 0;

  return (
    <div className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border border-primary/20 flex items-center justify-center bg-gold-bg rounded">
            <MessageSquare className="text-primary" size={18} />
          </div>
          <h2 className="text-text-main font-bold text-3xl">Student Reviews</h2>
        </div>
        {isEnrolled && !myReview && isAuthenticated && (
          <PrimaryBtn
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs"
          >
            <Sparkles size={14} className="mr-2" />
            Write Review
          </PrimaryBtn>
        )}
      </div>

      {/* Review Form */}
      <AnimatePresence>
        {showForm && isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="border border-border bg-dark-soft p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-primary/20 flex items-center justify-center bg-gold-bg">
                  <Sparkles className="text-primary" size={14} />
                </div>
                <p className="text-label font-mono text-gold tracking-[0.2em] uppercase text-xs">
                  {editingReview ? "Edit Your Review" : "Share Your Experience"}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-mono tracking-widest uppercase text-text-muted block">
                  Rating
                </label>
                <StarRating
                  rating={formRating}
                  size={24}
                  interactive
                  onChange={setFormRating}
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-mono tracking-widest uppercase text-text-muted block">
                  Your Review
                </label>
                <textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="What did you think of this course?"
                  className="w-full bg-surface border border-border px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-all resize-none min-h-24 placeholder:text-text-muted/40"
                  maxLength={1000}
                />
                <div className="flex justify-end">
                  <span
                    className={cn(
                      "text-2xs font-mono tracking-widest",
                      formText.length > 900
                        ? "text-danger"
                        : "text-text-muted/40"
                    )}
                  >
                    {formText.length}/1000
                  </span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border border-border text-text-muted text-2xs font-mono uppercase tracking-[0.2em] hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <PrimaryBtn
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !canSubmit}
                  className="flex-1 text-xs"
                >
                  {isSubmitting ? (
                    <span className="luxury-loader scale-75" />
                  ) : (
                    <>
                      <Send size={14} className="mr-2" />
                      <span>{editingReview ? "Update" : "Submit"}</span>
                    </>
                  )}
                </PrimaryBtn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review List */}
      {reviewsLoading || myReviewLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-border bg-muted-light p-6 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-muted" />
                  <div className="h-2 w-16 bg-muted" />
                </div>
              </div>
              <div className="h-3 w-1/3 bg-muted mb-3" />
              <div className="space-y-2">
                <div className="h-2 w-full bg-muted" />
                <div className="h-2 w-4/5 bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="border border-border bg-muted-light p-12 text-center rounded">
          <div className="w-11 h-11 mx-auto mb-4 border border-border flex items-center justify-center rounded">
            <MessageSquare size={20} className="text-text-muted" />
          </div>
          <p className="text-text-muted text-sm mb-2">No reviews yet</p>
          <p className="text-text-muted/60 text-xs">
            {isEnrolled && isAuthenticated
              ? "Be the first to share your experience!"
              : "Reviews will appear here once students share their thoughts."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <CourseReviewCard
              key={review.id}
              review={review}
              isOwn={myReview?.id === review.id}
              onEdit={() => handleEdit(review)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="w-10 h-10 border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed text-text-muted"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "w-10 h-10 border text-xs font-mono transition-all",
                    page === pageNum
                      ? "border-primary text-primary bg-gold-bg"
                      : "border-border text-text-muted hover:border-primary hover:text-primary"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="w-10 h-10 border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed text-text-muted"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Show user's existing review note */}
      {myReview && !showForm && isAuthenticated && (
        <div className="mt-6 text-center">
          <p className="text-xs text-text-muted font-mono">
            You have already reviewed this course.
          </p>
        </div>
      )}
    </div>
  );
}
