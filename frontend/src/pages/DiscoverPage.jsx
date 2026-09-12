import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { searchByDescription } from "../lib/api";
import RecommendedCard from "../components/RecommendedCard";

const EXAMPLES = [
  "Two people fall in love but can't be together",
  "A detective solving a murder in a small town",
  "A young hero discovers hidden magical powers",
  "Survivors rebuilding life after the world ends",
];

export default function DiscoverPage({ onSelectBook, favorites, onToggleFavorite }) {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  async function runSearch(text) {
    const value = text.trim();
    if (!value) return;
    setQuery(value);
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const results = await searchByDescription(value, 24);
      setBooks(results);
    } catch {
      setError("Nothing matched that description yet. Try using different keywords or plot points.");
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold">Search by description</h1>
        <p className="text-ink-muted text-sm mt-1 max-w-lg">
          Describe a plot, setting, character, or theme to discover books that match your idea.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); runSearch(query); }}
        className="flex items-center gap-3 bg-cream rounded-full px-5 py-3"
      >
        <Search size={16} className="text-ink-muted shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="I want a story about two people who fall in love but can't be together."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted"
        />
        <button
          type="submit"
          className="bg-accent hover:bg-accent-dark text-white text-xs font-medium px-5 py-2 rounded-full transition-colors shrink-0"
        >
          Search
        </button>
      </form>

      {!searched && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => runSearch(ex)}
              className="text-xs font-medium px-4 py-2 rounded-full border border-line text-ink-muted hover:text-ink hover:border-accent transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-sm text-accent font-medium py-1">
            <Loader2 size={16} className="animate-spin" />
            <span>Discovering books matching your description…</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-cream animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <p className="text-ink-muted text-sm">{error}</p>
      ) : searched && books.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {books.map((book) => (
            <RecommendedCard
              key={book.book_id}
              book={book}
              onClick={() => onSelectBook(book.title)}
              isFavorite={favorites.some((f) => f.book_id === book.book_id)}
              onToggleFavorite={() => onToggleFavorite(book)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
