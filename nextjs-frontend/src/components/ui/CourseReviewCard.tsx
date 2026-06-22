"use client";

import { Pencil, Trash2, User } from "lucide-react";
import { StarRating } from "./StarRating";
import { ReviewReadPublic } from "@/api/openapi-client";

interface CourseReviewCardProps {
  review: ReviewReadPublic;
  isOwn?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CourseReviewCard({
  review,
  isOwn = false,
  onEdit,
  onDelete,
}: CourseReviewCardProps) {
  const date = review.created_at
    ? new Date(review.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="border border-border bg-muted-light p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-muted border border-border flex items-center justify-center shrink-0">
            <User size={16} className="text-text-muted" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-main truncate">
              {review.user?.name ?? "Anonymous"}
            </p>
            <p className="text-2xs font-mono text-text-muted tracking-wider uppercase mt-0.5">
              {date}
            </p>
          </div>
        </div>
        {isOwn && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              className="w-8 h-8 flex items-center justify-center border border-border hover:border-primary hover:text-primary transition-all text-text-muted"
              title="Edit review"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="w-8 h-8 flex items-center justify-center border border-border hover:border-danger hover:text-danger transition-all text-text-muted"
              title="Delete review"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <StarRating rating={review.rating} />
        <span className="text-xs font-mono text-text-muted">
          {review.rating}/5
        </span>
      </div>

      <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">
        {review.text}
      </p>
    </div>
  );
}
