import { useState } from "react";
import { Smile, Frown, Heart, HelpCircle, Compass, CloudMoon, Leaf, Flame, Loader2 } from "lucide-react";
import { getMoodRecommendations, searchByDescription } from "../lib/api";
import RecommendedCard from "../components/RecommendedCard";

const MOODS = [
  { id: "happy", label: "Happy", icon: Smile },
  { id: "sad", label: "Sad", icon: Frown },
  { id: "romantic", label: "Romantic", icon: Heart },
  { id: "curious", label: "Curious", icon: HelpCircle },
  { id: "adventurous", label: "Adventurous", icon: Compass },
  { id: "dark", label: "Dark", icon: CloudMoon },
  { id: "peaceful", label: "Peaceful", icon: Leaf },
  { id: "motivated", label: "Motivated", icon: Flame },
];

export default function MoodPage({ onSelectBook, favorites, onToggleFavorite }) {
  const [activeMood, setActiveMood] = useState(null);
  const [description, setDescription] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null); // "mood" | "text"

  async function pickMood(moodId) {
    setActiveMood(moodId);
    setMode("mood");
    setLoading(true);
    setError(null);
    try {
      const results = await getMoodRecommendations(moodId, 24);
      setBooks(results);
    } catch {
      setError("Couldn't find books for that mood right now.");
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }

  async function submitDescription(e) {
    e.preventDefault();
    if (!description.trim()) return;
    setActiveMood(null);
    setMode("text");
    setLoading(true);
    setError(null);
    try {
      const results = await searchByDescription(description.trim(), 24);
      setBooks(results);
    } catch {
      setError("Nothing matched that description yet. Try rephrasing your search.");
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold">What are you in the mood for?</h1>
        <p className="text-ink-muted text-sm mt-1 max-w-lg">
          Pick a mood or describe it in your own words. We will match your
          feeling to books using intelligent text similarity and genre patterns.
        </p>
      </div>

      {/* Fixed mood buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MOODS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => pickMood(id)}
            className={`flex flex-col items-center gap-2 px-4 py-4 rounded-2xl border text-sm font-medium transition-colors ${
              activeMood === id
                ? "bg-maroon text-white border-maroon"
                : "border-line text-ink hover:border-accent hover:bg-cream/60"
            }`}
          >
            <Icon size={20} className={activeMood === id ? "text-white" : "text-ink-muted"} />
            {label}
          </button>
        ))}
      </div>

      {/* Free-text mood description */}
      <form onSubmit={submitDescription} className="space-y-2">
        <label className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          Or describe your mood…
        </label>
        <div className="flex items-center gap-3 bg-cream rounded-full px-5 py-3">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="I want something mysterious but not too scary, with a little romance."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted"
          />
          <button
            type="submit"
            className="bg-accent hover:bg-accent-dark text-white text-xs font-medium px-5 py-2 rounded-full transition-colors shrink-0"
          >
            Find books
          </button>
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-sm text-accent font-medium py-1">
            <Loader2 size={16} className="animate-spin" />
            <span>Finding matching books for your mood…</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-cream animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <p className="text-ink-muted text-sm">{error}</p>
      ) : books.length > 0 ? (
        <div>
          <h2 className="font-display font-semibold text-base mb-4">
            {mode === "mood" ? `Matches for “${MOODS.find((m) => m.id === activeMood)?.label}”` : "Closest matches"}
          </h2>
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
        </div>
      ) : null}
    </div>
  );
}
