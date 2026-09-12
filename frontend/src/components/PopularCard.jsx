import StarRating from "./StarRating";
import FavoriteButton from "./FavoriteButton";
import BookCover from "./BookCover";

export default function PopularCard({ book, onClick, isFavorite, onToggleFavorite }) {
  return (
    <button
      onClick={onClick}
      className="w-32 text-left shrink-0 group"
    >
      <div className="relative">
        <BookCover
          src={book.image_url}
          title={book.title}
          author={book.authors}
          className="w-32 h-44 object-cover rounded-xl group-hover:opacity-90 transition-opacity"
        />
        <div className="absolute top-1.5 right-1.5">
          <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} size={13} />
        </div>
      </div>
      <h3 className="font-display font-semibold text-xs leading-snug mt-2.5 line-clamp-2">
        {book.title}
      </h3>
      <p className="text-[11px] text-ink-muted mt-0.5 truncate">
        {book.authors} • {book.year}
      </p>
      <div className="mt-1.5">
        <StarRating rating={book.rating} size={11} />
      </div>
    </button>
  );
}


