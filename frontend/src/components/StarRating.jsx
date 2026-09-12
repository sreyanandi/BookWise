import { Star } from "lucide-react";

export default function StarRating({ rating, size = 13, showValue = true, light = false }) {
  if (rating === null || rating === undefined || rating <= 0) {
    return (
      <span className={`text-xs ${light ? "text-white/60" : "text-ink-muted"}`}>
        No rating yet
      </span>
    );
  }

  const filled = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= filled ? "text-gold fill-gold" : "text-line fill-line"}
        />
      ))}
      {showValue && (
        <span className={`text-xs font-medium ml-1 ${light ? "text-white/90" : "text-ink-muted"}`}>
          ({rating.toFixed(2)})
        </span>
      )}
    </div>
  );
}
