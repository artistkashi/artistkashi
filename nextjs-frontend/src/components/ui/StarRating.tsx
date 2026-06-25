"use client";

import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export function StarRating({
  rating,
  size = 16,
  interactive = false,
  onChange,
}: StarRatingProps) {
  const numericRating = typeof rating === 'number' ? rating : parseFloat(rating);
  const fullStars = Math.floor(numericRating);
  const hasHalfStar = numericRating - fullStars >= 0.5;

  if (interactive) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className="group transition-all duration-300 transform active:scale-90"
          >
            <Star
              size={size}
              className={cn(
                "transition-all duration-500",
                star <= rating
                  ? "fill-primary text-primary gold-glow"
                  : "text-border group-hover:text-primary/40"
              )}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star
          key={`full-${i}`}
          size={size}
          className="fill-primary text-primary"
        />
      ))}
      {/* Half star */}
      {hasHalfStar && (
        <Star
          key="half"
          size={size}
          className="fill-primary text-primary"
          style={{ clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)" } as React.CSSProperties}
        />
      )}
      {/* Empty stars */}
      {Array.from({ length: 5 - fullStars - (hasHalfStar ? 1 : 0) }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          size={size}
          className="fill-none text-border"
        />
      ))}
    </div>
  );
}
