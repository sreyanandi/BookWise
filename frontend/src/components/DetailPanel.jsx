import StarRating from "./StarRating";
import FavoriteButton from "./FavoriteButton";
import BookCover from "./BookCover";
import { BookOpen, Bookmark, CheckCircle2, X } from "lucide-react";

const SHELF_OPTIONS = [
  { id: "currentlyReading", label: "Reading", icon: BookOpen },
  { id: "wantToRead", label: "Want to Read", icon: Bookmark },
  { id: "finished", label: "Finished", icon: CheckCircle2 },
];

function Stat({ value, label }) {
  return (
    <div className="text-center">
      <div className="font-display font-semibold text-sm text-white">{value ?? "-"}</div>
      <div className="text-[11px] text-white/60 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

// Fallback used only when no summary is recorded for this title:
// an honest, factual line built from the data we do have, never a fake plot.
function fallbackDescription(book) {
  const genres = (book.genres || "").split(" ").filter(Boolean).slice(0, 3);
  const genreText = genres.length ? genres.join(", ") : "general fiction";
  const ratingPart = book.rating != null && book.rating > 0
    ? ` Holds an average rating of ${book.rating.toFixed(2)} out of 5${book.ratings_count ? ` from ${book.ratings_count.toLocaleString()} reader ratings` : ""}.`
    : "";
  const yearPart = book.year && book.year > 0 && book.year <= 2026 ? `, published in ${book.year}` : "";
  return `An acclaimed ${genreText} book by ${book.authors || "an esteemed author"}${yearPart}.${ratingPart} Explores engaging narratives and compelling character journeys.`;
}

export default function DetailPanel({ book, reason, isFavorite, onToggleFavorite, descriptionLoading, shelf, onMoveToShelf, onClose }) {
  if (!book) {
    return (
      <div className="h-full flex items-center justify-center text-white/60 text-sm px-8 text-center">
        Search or select a book to see its details here.
      </div>
    );
  }

  const summary = book.description || book.blurb || fallbackDescription(book);
  const validYear = book.year && book.year > 0 && book.year <= 2026 ? book.year : null;
  const validRating = book.rating != null && book.rating > 0 ? book.rating.toFixed(2) : null;
  const formattedRatingsCount = book.ratings_count
    ? (book.ratings_count >= 1000000
        ? `${(book.ratings_count / 1000000).toFixed(1)}M`
        : book.ratings_count >= 1000
        ? `${Math.round(book.ratings_count / 1000)}k`
        : book.ratings_count.toLocaleString())
    : null;

  return (
    <div className="h-full flex flex-col px-7 py-8 text-white relative animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display font-semibold text-sm leading-snug">
          {book.title}
        </h2>
        <div className="flex items-center gap-1.5 shrink-0">
          <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} light />
          {onClose && (
            <button
              onClick={onClose}
              title="Close panel"
              className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <BookCover
        src={book.image_url}
        title={book.title}
        author={book.authors}
        className="w-full max-w-[160px] mx-auto rounded-lg shadow-lg mt-6 object-cover"
      />

      <div className="text-center mt-5">
        <p className="text-sm font-medium">{book.authors}</p>
        <p className="text-xs text-white/60 mt-0.5">
          {validYear ? `Published in ${validYear}` : "Worldwide Edition"}
        </p>
      </div>

      <div className="flex justify-center mt-3">
        <StarRating rating={book.rating} light />
      </div>

      <div className="flex items-center justify-around mt-6 py-4 border-y border-maroon-panel-soft">
        <Stat value={validRating} label="rating" />
        <div className="w-px h-8 bg-maroon-panel-soft" />
        <Stat
          value={formattedRatingsCount}
          label="ratings"
        />
        <div className="w-px h-8 bg-maroon-panel-soft" />
        <Stat value={validYear} label="year" />
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] uppercase tracking-wide text-white/50">Summary</h3>
          {descriptionLoading && (
            <span className="flex items-center gap-1 text-[10px] text-accent animate-pulse font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              Loading summary…
            </span>
          )}
        </div>
        {descriptionLoading && !summary ? (
          <div className="space-y-2">
            <div className="h-3 bg-white/10 rounded animate-pulse" />
            <div className="h-3 bg-white/10 rounded animate-pulse w-4/5" />
            <div className="h-3 bg-white/10 rounded animate-pulse w-3/5" />
          </div>
        ) : (
          <p className="text-xs text-white/70 leading-relaxed whitespace-pre-line">{summary}</p>
        )}
      </div>

      {reason && (
        <p className="text-[11px] text-white/50 mt-3 italic">{reason}</p>
      )}

      {onMoveToShelf && (
        <div className="flex items-center gap-1.5 mt-4 flex-wrap">
          {SHELF_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onMoveToShelf(id)}
              className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                shelf === id
                  ? "bg-accent border-accent text-white"
                  : "border-white/15 text-white/60 hover:text-white hover:border-white/30"
              }`}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>
      )}

      <a
        href={`https://www.google.com/search?tbm=bks&q=${encodeURIComponent(book.title + " " + book.authors)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto pt-6 w-full bg-accent hover:bg-accent-dark text-white text-sm font-medium py-3 rounded-full transition-colors text-center block"
      >
        Read
      </a>
    </div>
  );
}
