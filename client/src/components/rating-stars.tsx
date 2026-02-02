import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function RatingStars({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onRatingChange,
}: RatingStarsProps) {
  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      const newRating = index + 1;
      onRatingChange(newRating === Math.round(rating) ? 0 : newRating);
    }
  };

  return (
    <div className="flex items-center gap-0.5" data-testid="rating-stars">
      {Array.from({ length: maxRating }).map((_, index) => {
        const rounded = Math.round(rating);
        const filled = index < rounded;

        return (
          <button
            key={index}
            type="button"
            onClick={() => (interactive ? handleClick(index) : undefined)}
            className={`relative ${
              interactive ? "cursor-pointer" : "cursor-default"
            }`}
            disabled={!interactive}
            data-testid={`star-${index + 1}`}
          >
            <Star
              className={`${sizeClasses[size]} ${
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
