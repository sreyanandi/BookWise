import { useState } from "react";
import { Star, X, BookOpen, Bookmark, CheckCircle2, Search } from "lucide-react";
import { searchBook } from "../lib/api";
import { searchOpenLibrary } from "../lib/openLibrary";
import BookCover from "../components/BookCover";

const SHELF_META = {
  currentlyReading: { title: "Currently Reading", icon: BookOpen },
  wantToRead: { title: "Want to Read", icon: Bookmark },
  finished: { title: "Finished", icon: CheckCircle2 },
};

function RatingInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); onChange(i); }}
          aria-label={`Rate ${i} stars`}
          className="p-0.5"
        >
          <Star
            size={14}
            className={i <= (value || 0) ? "text-gold fill-gold" : "text-line fill-line"}
          />
        </button>
      ))}
    </div>
  );
}

function ShelfCard({ book, shelf, onMove, onRemove, onRate, onSelectBook }) {
  return (
    <div className="flex gap-3 border border-line rounded-2xl p-3 bg-card">
      <button onClick={() => onSelectBook(book.title)} className="shrink-0">
        <BookCover
          src={book.image_url}
          title={book.title}
          author={book.authors}
          className="w-12 h-[72px] object-cover rounded-md"
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button onClick={() => onSelectBook(book.title)} className="text-left min-w-0">
            <p className="font-display font-semibold text-xs leading-snug line-clamp-2">
              {book.title}
            </p>
          </button>
          <button
            onClick={() => onRemove(book.book_id)}
            aria-label="Remove"
            className="shrink-0 text-ink-muted hover:text-ink"
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-1">{book.authors}</p>

        {shelf === "finished" ? (
          <div className="mt-2">
            <RatingInput value={book.myRating} onChange={(r) => onRate(book.book_id, r)} />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {Object.keys(SHELF_META)
              .filter((s) => s !== shelf)
              .map((s) => (
                <button
                  key={s}
                  onClick={() => onMove(book, s)}
                  className="text-[10px] font-medium px-2 py-1 rounded-full border border-line text-ink-muted hover:text-ink hover:border-accent transition-colors"
                >
                  Move to {SHELF_META[s].title}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReadingJourneyPage({ journey, onMove, onRemove, onRate, onSelectBook }) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    const title = query.trim();
    if (!title) return;
    setAdding(true);
    setAddError(null);
    try {
      let book;
      try {
        book = await searchBook(title);
      } catch {
        book = await searchOpenLibrary(title);
      }
      onMove(book, "wantToRead");
      setQuery("");
    } catch {
      setAddError(`Couldn't find a book matching "${title}".`);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold">My Reading Journey</h1>
        <p className="text-ink-muted text-sm mt-1 max-w-lg">
          Track what you are currently reading, what is next on your list, and finished titles.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex items-center gap-3 bg-cream rounded-full px-5 py-3">
        <Search size={16} className="text-ink-muted shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add a book to Want to Read…"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted"
        />
        <button
          type="submit"
          disabled={adding}
          className="bg-accent hover:bg-accent-dark text-white text-xs font-medium px-5 py-2 rounded-full transition-colors shrink-0 disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </form>
      {addError && <p className="text-xs text-ink-muted -mt-3">{addError}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(SHELF_META).map(([shelf, { title, icon: Icon }]) => (
          <div key={shelf} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Icon size={16} className="text-maroon" />
              {title}
              <span className="text-ink-muted font-normal text-xs">({journey[shelf].length})</span>
            </div>
            {journey[shelf].length === 0 ? (
              <div className="border border-dashed border-line rounded-2xl py-8 text-center text-ink-muted text-xs">
                Nothing here yet.
              </div>
            ) : (
              <div className="space-y-3">
                {journey[shelf].map((book) => (
                  <ShelfCard
                    key={book.book_id}
                    book={book}
                    shelf={shelf}
                    onMove={onMove}
                    onRemove={(id) => onRemove(id)}
                    onRate={onRate}
                    onSelectBook={onSelectBook}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
