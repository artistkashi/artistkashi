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
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={cn(
            star <= rating
              ? "fill-primary text-primary"
              : "fill-none text-border"
          )}
        />
      ))}
    </div>
  );
}
