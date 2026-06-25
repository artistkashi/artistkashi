"use client";

import { unwrapPaginated } from "@/api/client-service";
import type { ReviewRead } from "@/api/openapi-client";
import { listAllReviews, ReviewType } from "@/api/openapi-client";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { Plus, Star, Filter, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { PrimaryBtn } from "./buttons";
import { ReviewSubmitModal } from "./ReviewSubmitModal";
import { CustomSelect } from "./custom-select";

interface ReviewsDisplayProps {
  reviewType: ReviewType;
  entityId?: string;
  entityName?: string;
  showSubmitButton?: boolean;
  onReviewSubmitted?: () => void;
}

const RATING_OPTIONS = [
  { value: "", label: "All Ratings" },
  { value: "5", label: "5 Stars" },
  { value: "4", label: "4 Stars" },
  { value: "3", label: "3 Stars" },
  { value: "2", label: "2 Stars" },
  { value: "1", label: "1 Star" },
];

const SORT_OPTIONS = [
  { value: "created_at_desc", label: "Newest First" },
  { value: "created_at_asc", label: "Oldest First" },
  { value: "rating_desc", label: "Highest Rated" },
  { value: "rating_asc", label: "Lowest Rated" },
];

export function ReviewsDisplay({
  reviewType,
  entityId,
  entityName,
  showSubmitButton = true,
  onReviewSubmitted,
}: ReviewsDisplayProps) {
  const [reviews, setReviews] = useState<ReviewRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<string>("");
  const [sortFilter, setSortFilter] = useState<string>("created_at_desc");
  const { user } = useAuth();

  const loadReviews = async () => {
    try {
      setLoading(true);
      const [sortBy, sortOrder] = sortFilter.split("_");
      const result = await unwrapPaginated(
        listAllReviews({
          query: {
            review_type: reviewType,
            entity_id: entityId,
            rating: ratingFilter ? parseInt(ratingFilter) : undefined,
            sort_by: sortBy,
            sort_order: sortOrder,
          },
        })
      );
      setReviews(result.data);
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [reviewType, entityId, ratingFilter, sortFilter]);

  const handleReviewSubmitted = async () => {
    setShowModal(false);
    await loadReviews();
    onReviewSubmitted?.();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="luxury-loader" />
        <p className="text-2xs font-mono uppercase tracking-[0.2em] text-text-muted">
          Analyzing Chronicles...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {showSubmitButton && user && (
        <PrimaryBtn
          onClick={() => setShowModal(true)}
          className="px-10 py-3.5 text-xs"
        >
          <Plus size={16} />
          <span>Chronicle Your Vision</span>
        </PrimaryBtn>
      )}

      {!user && showSubmitButton && (
        <p className="text-2xs font-mono uppercase tracking-widest text-text-muted opacity-60 italic border-l border-primary/20 pl-4 py-1">
          Authentication required to leave a mark.
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 card-luxury bg-gold-bg border-border/20">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gold" />
            <span className="text-2xs font-mono uppercase tracking-[0.2em] text-text-muted">Filter:</span>
          </div>
          <CustomSelect
            value={ratingFilter}
            onChange={(value) => setRatingFilter(String(value))}
            options={RATING_OPTIONS}
            className="w-40"
            placeholder="Rating"
          />
          <CustomSelect
            value={sortFilter}
            onChange={(value) => setSortFilter(String(value))}
            options={SORT_OPTIONS}
            className="w-40"
            placeholder="Sort"
          />
        </div>
      </div>

      {showSubmitButton && user && (
        <PrimaryBtn
          onClick={() => setShowModal(true)}
          className="px-10 py-3.5 text-xs"
        >
          <Plus size={16} />
          <span>Chronicle Your Vision</span>
        </PrimaryBtn>
      )}

      {!user && showSubmitButton && (
        <p className="text-2xs font-mono uppercase tracking-widest text-text-muted opacity-60 italic border-l border-primary/20 pl-4 py-1">
          Authentication required to leave a mark.
        </p>
      )}

      {reviews.length === 0 ? (
        <div className="py-20 text-center card-luxury bg-gold-bg border-dashed border-primary/20">
          <p className="text-2xs font-mono uppercase tracking-[0.3em] text-text-muted">
            The archive is silent. Be the first to speak.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {reviews.map((review) => (
            <div
              key={`review-${review.id}`}
              className="p-card card-luxury-hover group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={`star-${review.id}-${i}`}
                      size={14}
                      className={cn(
                        "transition-all duration-500",
                        i < (typeof review.rating === 'number' ? review.rating : parseFloat(review.rating))
                          ? "fill-primary text-primary gold-glow"
                          : "text-border"
                      )}
                    />
                  ))}
                </div>
                <span className="text-2xs font-mono uppercase tracking-tighter text-text-muted group-hover:text-primary transition-colors">
                  {review.created_at
                    ? new Date(review.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : null}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90 font-medium tracking-wide">
                "{review.text}"
              </p>
            </div>
          ))}
        </div>
      )}

      <ReviewSubmitModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleReviewSubmitted}
        reviewType={reviewType}
        entityId={entityId}
        entityName={entityName}
      />
    </div>
  );
}
