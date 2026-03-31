import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StarRatingProps {
  score: number | null;
  size?: number;
  showLabel?: boolean;
}

export default function StarRating({ score, size = 18, showLabel = true }: StarRatingProps) {
  const { t } = useTranslation();
  const maxStars = 5;
  const filledCount = score ?? 0;
  const label = (() => {
    if (score === null) return t("rating.new");
    if (score >= 5) return t("rating.excellent");
    if (score >= 4) return t("rating.good");
    if (score >= 3) return t("rating.fair");
    if (score >= 2) return t("rating.needsImprovement");
    return t("rating.atRisk");
  })();

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
        <span className="star-rating-label">{label}</span>
      )}
    </div>
  );
}
