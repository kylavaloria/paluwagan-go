import { Star } from "lucide-react";

interface StarRatingProps {
  score: number | null;
  size?: number;
  showLabel?: boolean;
}

function getLabel(score: number | null): string {
  if (score === null) return "New member";
  if (score >= 5) return "Excellent";
  if (score >= 4) return "Good";
  if (score >= 3) return "Fair";
  if (score >= 2) return "Needs improvement";
  return "At risk";
}

export default function StarRating({ score, size = 18, showLabel = true }: StarRatingProps) {
  const maxStars = 5;
  const filledCount = score ?? 0;

  return (
    <div className="star-rating">
      {Array.from({ length: maxStars }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={`star-rating-star${i < filledCount ? " star-rating-star--filled" : ""}`}
          fill={i < filledCount ? "#facc15" : "none"}
          strokeWidth={1.5}
        />
      ))}
      {showLabel && (
        <span className="star-rating-label">{getLabel(score)}</span>
      )}
    </div>
  );
}
