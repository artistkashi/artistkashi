"use client";

import { useState, useEffect } from "react";
import { Star, Plus } from "lucide-react";
import {
  listReviews,
  ReviewReadPublic,
  ReviewType,
} from "@/api/openapi-client";
import { ReviewSubmitModal } from "./ReviewSubmitModal";
import { useAuth } from "@/lib/auth-store";
import { unwrapPaginated } from "@/api/client-service";
import { cn } from "@/lib/utils";
import { PrimaryBtn } from "./buttons";

interface ReviewsDisplayProps {
  reviewType: ReviewType;
  entityId?: number;
  entityName?: string;
  limit?: number;
  showSubmitButton?: boolean;
  onReviewSubmitted?: () => void;
}

export function ReviewsDisplay({
  reviewType,
  entityId,
  entityName,
  limit = 10,
  showSubmitButton = true,
  onReviewSubmitted,
}: ReviewsDisplayProps) {
  const [reviews, setReviews] = useState<ReviewReadPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        const { data } = await unwrapPaginated(
          listReviews({
            query: {
              review_type: reviewType,
              entity_id: entityId,
              limit,
            },
          })
        );
        setReviews(data);
      } catch (error) {
        console.error("Failed to load reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [reviewType, entityId, limit]);

  const handleReviewSubmitted = async () => {
    setShowModal(false);
    const { data } = await unwrapPaginated(
      listReviews({
        query: {
          review_type: reviewType,
          entity_id: entityId,
          limit,
        },
      })
    );
    setReviews(data);
    onReviewSubmitted?.();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="luxury-loader" />
        <p className="text-2xs font-mono uppercase tracking-[0.2em] text-text-muted">Analyzing Chronicles...</p>
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

      {reviews.length === 0 ? (
        <div className="py-20 text-center card-luxury bg-gold-bg border-dashed border-primary/20">
          <p className="text-2xs font-mono uppercase tracking-[0.3em] text-text-muted">
            The archive is silent. Be the first to speak.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {reviews.map((review) => (
            <div key={`review-${review.id}`} className="p-card card-luxury-hover group">
              <div className="flex items-start justify-between mb-6">
                <div className="flex gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={`star-${review.id}-${i}`}
                      size={14}
                      className={cn(
                        "transition-all duration-500",
                        i < review.rating
                          ? "fill-primary text-primary gold-glow"
                          : "text-border"
                      )}
                    />
                  ))}
                </div>
                <span className="text-2xs font-mono uppercase tracking-tighter text-text-muted group-hover:text-primary transition-colors">
                  {new Date(review.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
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
