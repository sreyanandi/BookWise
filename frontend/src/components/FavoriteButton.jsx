import { Heart } from "lucide-react";

export default function FavoriteButton({ active, onToggle, light = false, size = 15 }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // don't trigger the card's own onClick underneath
        onToggle();
      }}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
        light
          ? "bg-white/10 hover:bg-white/20"
          : "bg-cream hover:bg-line"
      }`}
    >
      <Heart
        size={size}
        className={active ? "text-accent fill-accent" : light ? "text-white/70" : "text-ink-muted"}
      />
    </button>
  );
}
