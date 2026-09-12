import { useState, useEffect } from "react";
import { getWorldwide } from "../lib/api";
import RecommendedCard from "../components/RecommendedCard";
import { Check, Loader2, Calendar, Languages } from "lucide-react";

const GENRES = [
  "fantasy", "romance", "mystery", "thriller", "horror", "classics",
  "young-adult", "science-fiction", "non-fiction", "historical-fiction",
  "poetry", "humor", "dystopian", "adventure", "mythology", "philosophy",
  "biography", "graphic-novels", "short-stories", "war", "crime",
  "paranormal", "literary-fiction", "self-help",
];

const ERAS = [
  { id: "all", label: "All Eras", yearMin: null, yearMax: null },
  { id: "2020-2026", label: "2020–2026 (Recent Releases)", yearMin: 2020, yearMax: 2026 },
  { id: "2010s", label: "2010–2019", yearMin: 2010, yearMax: 2019 },
  { id: "2000s", label: "2000–2009", yearMin: 2000, yearMax: 2009 },
  { id: "1900s", label: "1900–1999 (20th Century)", yearMin: 1900, yearMax: 1999 },
  { id: "1800s", label: "1800–1899 (19th Century)", yearMin: 1800, yearMax: 1899 },
  { id: "classics", label: "Classics & Antiquity (< 1800)", yearMin: 1, yearMax: 1799 },
];

const LANGUAGES = [
  { id: "all", label: "All Languages" },
  { id: "english", label: "English" },
  { id: "bengali", label: "Bengali (বাংলা)" },
  { id: "kannada", label: "Kannada (ಕನ್ನಡ)" },
  { id: "hindi", label: "Hindi (हिन्दी)" },
  { id: "spanish", label: "Spanish (Español)" },
  { id: "french", label: "French (Français)" },
  { id: "german", label: "German (Deutsch)" },
  { id: "italian", label: "Italian (Italiano)" },
  { id: "portuguese", label: "Portuguese (Português)" },
  { id: "japanese", label: "Japanese (日本語)" },
  { id: "chinese", label: "Chinese (中文)" },
  { id: "russian", label: "Russian (Русский)" },
  { id: "arabic", label: "Arabic / Urdu (العربية)" },
  { id: "tamil", label: "Tamil (தமிழ்)" },
  { id: "telugu", label: "Telugu (తెలుగు)" },
  { id: "malayalam", label: "Malayalam (മലയാളം)" },
  { id: "korean", label: "Korean (한국어)" },
];

const PAGE_SIZE = 36;

export default function CategoryPage({ onSelectBook, favorites, onToggleFavorite }) {
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedEra, setSelectedEra] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  function toggleGenre(g) {
    setSelectedGenres((prev) => {
      if (prev.includes(g)) {
        return prev.filter((item) => item !== g);
      } else {
        return [...prev, g];
      }
    });
  }

  function selectAllGenres() {
    setSelectedGenres([...GENRES]);
  }

  function clearGenres() {
    setSelectedGenres([]);
  }

  useEffect(() => {
    let isMounted = true;
    async function fetchInitial() {
      setLoading(true);
      setHasMore(true);
      const genreParam = selectedGenres.length > 0 ? selectedGenres.join(",") : null;
      const eraObj = ERAS.find((e) => e.id === selectedEra) || ERAS[0];

      try {
        const res = await getWorldwide(
          PAGE_SIZE,
          genreParam,
          eraObj.yearMin,
          eraObj.yearMax,
          selectedLanguage,
          0
        );
        if (isMounted) {
          const newBatch = res || [];
          setBooks(newBatch);
          if (newBatch.length < PAGE_SIZE) {
            setHasMore(false);
          }
        }
      } catch {
        if (isMounted) {
          setBooks([]);
          setHasMore(false);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, [selectedGenres, selectedEra, selectedLanguage]);

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const genreParam = selectedGenres.length > 0 ? selectedGenres.join(",") : null;
    const eraObj = ERAS.find((e) => e.id === selectedEra) || ERAS[0];

    try {
      const res = await getWorldwide(
        PAGE_SIZE,
        genreParam,
        eraObj.yearMin,
        eraObj.yearMax,
        selectedLanguage,
        books.length
      );
      const newBatch = res || [];
      if (newBatch.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setBooks((prev) => {
        const existingIds = new Set(prev.map((b) => b.book_id));
        const filtered = newBatch.filter((b) => !existingIds.has(b.book_id));
        return [...prev, ...filtered];
      });
    } catch (e) {
      console.error(e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-xl font-bold">Browse by category</h1>
          <p className="text-ink-muted text-sm mt-1 max-w-2xl">
            Explore all available books across historical eras, genres, and world languages.
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-ink-muted">
            <span className="font-medium text-maroon">
              {selectedGenres.length === 0
                ? "All categories selected"
                : `${selectedGenres.length} ${selectedGenres.length === 1 ? "category" : "categories"} active`}
            </span>
            <span>•</span>
            <button
              onClick={selectAllGenres}
              className="text-accent hover:underline cursor-pointer"
            >
              Select all
            </button>
            <span>•</span>
            <button
              onClick={clearGenres}
              className="text-ink-muted hover:text-ink cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Era / Publication Year Filter */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-ink-muted font-medium flex items-center gap-1.5 mr-1 shrink-0">
            <Calendar size={13} className="text-maroon" /> Era:
          </span>
          {ERAS.map((era) => {
            const isActive = selectedEra === era.id;
            return (
              <button
                key={era.id}
                onClick={() => setSelectedEra(era.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-maroon text-white shadow-xs font-semibold"
                    : "bg-card border border-line text-ink-muted hover:text-ink hover:border-ink-muted/50"
                }`}
              >
                {era.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* World Language Filter */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-ink-muted font-medium flex items-center gap-1.5 mr-1 shrink-0">
            <Languages size={13} className="text-maroon" /> Language:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {LANGUAGES.map((lang) => {
              const isActive = selectedLanguage === lang.id;
              return (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLanguage(lang.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-maroon text-white shadow-xs font-semibold"
                      : "bg-card border border-line text-ink-muted hover:text-ink hover:border-ink-muted/50"
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {GENRES.map((g) => {
          const isSelected = selectedGenres.includes(g);
          return (
            <button
              key={g}
              onClick={() => toggleGenre(g)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer capitalize font-medium ${
                isSelected
                  ? "bg-maroon text-white border-maroon shadow-xs"
                  : "border-line text-ink-muted hover:text-ink hover:border-ink-muted/50 bg-card"
              }`}
            >
              {isSelected && <Check size={12} strokeWidth={2.8} />}
              {g.replace("-", " ")}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-sm text-accent font-medium py-1">
            <Loader2 size={16} className="animate-spin" />
            <span>Finding books for your criteria…</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-cream animate-pulse" />
            ))}
          </div>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12 space-y-2 bg-cream/30 rounded-2xl border border-line p-8">
          <p className="text-ink font-medium">No books matched this exact combination of category, era, and language.</p>
          <p className="text-ink-muted text-xs">Try selecting "All Eras", "All Languages", or clearing category filters to view all available titles.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span>
              Showing {books.length} books {selectedLanguage !== "all" ? `in ${LANGUAGES.find(l => l.id === selectedLanguage)?.label}` : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {books.map((book, i) => (
              <RecommendedCard
                key={`${book.book_id}-${i}`}
                book={book}
                onClick={() => onSelectBook(book.title)}
                isFavorite={favorites.some((f) => f.book_id === book.book_id)}
                onToggleFavorite={() => onToggleFavorite(book)}
              />
            ))}
          </div>

          {/* Load More Button or Finished indicator */}
          <div className="flex flex-col items-center justify-center pt-6 pb-2">
            {hasMore ? (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 text-sm font-medium px-8 py-2.5 rounded-full border border-line bg-card text-ink hover:border-accent hover:text-accent transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-accent" />
                    <span>Loading more books…</span>
                  </>
                ) : (
                  <span>Load more books ({books.length} loaded)</span>
                )}
              </button>
            ) : (
              <p className="text-xs text-ink-muted">
                All {books.length} available books for this selection are loaded.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
