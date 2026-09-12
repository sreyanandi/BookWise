import StarRating from "./StarRating";
import FavoriteButton from "./FavoriteButton";
import BookCover from "./BookCover";

export default function RecommendedCard({ book, onClick, isFavorite, onToggleFavorite }) {
  return (
    <button
      onClick={onClick}
      className="flex gap-4 border border-line rounded-2xl p-4 bg-card text-left hover:border-accent transition-colors"
    >
      <BookCover
        src={book.image_url}
        title={book.title}
        author={book.authors}
        className="w-16 h-24 object-cover rounded-lg shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-sm leading-snug line-clamp-2">
            {book.title}
          </h3>
          <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} />
        </div>
        <p className="text-xs text-ink-muted mt-1">
          {book.authors} • {book.year}
        </p>
        <div className="mt-3">
          <StarRating rating={book.rating} />
        </div>
      </div>
    </button>
  );
}


