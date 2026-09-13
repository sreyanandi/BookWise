import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Hero from "./components/Hero";
import RecommendedCard from "./components/RecommendedCard";
import PopularCard from "./components/PopularCard";
import DetailPanel from "./components/DetailPanel";
import CategoryPage from "./pages/CategoryPage";
import QuizPage from "./pages/QuizPage";
import BookListPage from "./pages/BookListPage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";
import LandingPage from "./pages/LandingPage";
import MoodPage from "./pages/MoodPage";
import DiscoverPage from "./pages/DiscoverPage";
import ReadingJourneyPage from "./pages/ReadingJourneyPage";
import { searchBook, getRecommendations, getPopular, getLatest } from "./lib/api";
import { searchOpenLibrary, getSimilarBySubject, getDescription } from "./lib/openLibrary";
import {
  getFavorites, toggleFavorite, getHistory, addToHistory,
  clearAll, getUserName, setUserName,
  getJourney, moveToShelf, removeFromJourney, rateFinishedBook, shelfOf,
} from "./lib/storage";

const RECOMMEND_COUNT = 24;

// Step 1: find the book, trying our unified SQLite database first, then falling back to Open Library
async function resolveBook(title) {
  try {
    const book = await searchBook(title);
    return { ...book, source: "local" };
  } catch {
    return await searchOpenLibrary(title);
  }
}

// Step 2: given a resolved book, get its recommendations and real summary
async function loadDetailsFor(book) {
  let recs = [];
  try {
    const res = await getRecommendations(book.title, RECOMMEND_COUNT);
    recs = res?.recommendations || [];
  } catch {
    const topSubject = (book.genres || "fiction").split(" ")[0];
    try {
      recs = await getSimilarBySubject(topSubject, book.title, RECOMMEND_COUNT);
    } catch {
      recs = [];
    }
  }

  let description = null;
  try {
    description = await getDescription(book);
  } catch {
    description = null;
  }

  return { recs, description };
}

export default function App() {
  const [entered, setEntered] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [userName, setUserNameState] = useState(getUserName());
  const [query, setQuery] = useState("");

  const [allBooks, setAllBooks] = useState([]);
  const [popular, setPopular] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedReason, setSelectedReason] = useState(null);
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [status, setStatus] = useState("loading");
  const [notFoundQuery, setNotFoundQuery] = useState(null);
  const [isShowingLatest, setIsShowingLatest] = useState(false);

  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [journey, setJourneyState] = useState({ currentlyReading: [], wantToRead: [], finished: [] });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setFavorites(getFavorites());
    setHistory(getHistory());
    setJourneyState(getJourney());
  }, []);

  // When opening the website, show all books by default
  useEffect(() => {
    setStatus("loading");
    getPopular(36)
      .then((books) => {
        const list = books || [];
        setAllBooks(list);
        setPopular(list.slice(0, 16));
        setStatus("done");
      })
      .catch(() => setStatus("done"));
  }, []);

  function handleToggleFavorite(book) {
    setFavorites(toggleFavorite(favorites, book));
  }

  function handleMoveToShelf(book, shelf) {
    setJourneyState((j) => moveToShelf(j, book, shelf));
  }

  function handleRemoveFromJourney(bookId) {
    setJourneyState((j) => removeFromJourney(j, bookId));
  }

  function handleRateFinished(bookId, rating) {
    setJourneyState((j) => rateFinishedBook(j, bookId, rating));
  }

  // When user clicks a particular book or searches for it
  const selectBook = useCallback(async (title) => {
    setMobileMenuOpen(false);
    setStatus("loading");
    setNotFoundQuery(null);
    setIsShowingLatest(false);

    try {
      const book = await resolveBook(title);
      setSelectedBook(book);
      setSelectedReason(null);
      setDescriptionLoading(!book.description && !book.blurb);
      setQuery(book.title);
      setActiveNav("Dashboard");
      setStatus("done");
      setHistory((h) => addToHistory(h, book));

      const { recs, description } = await loadDetailsFor(book);
      setRecommended(recs || []);
      if (description) {
        setSelectedBook((prev) => (prev && prev.title === book.title ? { ...prev, description } : prev));
      }
      setDescriptionLoading(false);
    } catch (err) {
      setStatus("error");
      setNotFoundQuery(title);
    }
  }, []);

  function handleClearSelection() {
    setSelectedBook(null);
    setQuery("");
    setRecommended([]);
    setIsShowingLatest(false);
  }

  function handleEnter() {
    setEntered(true);
  }

  async function handleShowLatest() {
    setStatus("loading");
    setIsShowingLatest(true);
    setSelectedBook(null);
    try {
      const latestBooks = await getLatest(36);
      setAllBooks(latestBooks || []);
      setPopular((latestBooks || []).slice(0, 16));
      setStatus("done");
    } catch {
      setStatus("done");
    }
  }

  function handleSaveName(name) {
    setUserName(name);
    setUserNameState(name);
  }

  function handleClearData() {
    clearAll();
    setFavorites([]);
    setHistory([]);
    setJourneyState({ currentlyReading: [], wantToRead: [], finished: [] });
  }

  function handleLogOut() {
    setEntered(false);
    setActiveNav("Dashboard");
    setSelectedBook(null);
    setMobileMenuOpen(false);
  }

  if (!entered) {
    return (
      <LandingPage
        onEnter={handleEnter}
        onStartQuiz={() => {
          setActiveNav("Quiz");
          setEntered(true);
        }}
        userName={userName}
        onSaveName={handleSaveName}
      />
    );
  }

  return (
    <div
      className={`h-screen w-screen bg-card grid grid-cols-1 md:grid-cols-[220px_1fr] ${
        selectedBook ? "lg:grid-cols-[220px_1fr_360px]" : ""
      } grid-rows-[auto_1fr] overflow-hidden`}
    >
      <div className="col-span-full border-b border-line">
        <TopBar
          query={query}
          onQueryChange={setQuery}
          onSubmit={() => query.trim() && selectBook(query.trim())}
          userName={userName}
          onSaveName={handleSaveName}
          isLoading={status === "loading"}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          isMobileMenuOpen={mobileMenuOpen}
        />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block border-r border-line overflow-y-auto">
        <Sidebar
          active={activeNav}
          onSelect={(label) => (label === "Log Out" ? handleLogOut() : setActiveNav(label))}
        />
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 bg-card h-full shadow-2xl z-10 flex flex-col">
            <Sidebar
              active={activeNav}
              onSelect={(label) => {
                if (label === "Log Out") handleLogOut();
                else setActiveNav(label);
              }}
              onCloseMobileMenu={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Scrollable Content */}
      <main className="overflow-y-auto px-4 sm:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8">
        {activeNav === "Dashboard" && (
          <>
            <Hero name={userName ? userName.split(" ")[0] : ""} onShowLatest={handleShowLatest} />

            {isShowingLatest && (
              <div className="flex items-center justify-between bg-cream/90 border border-line rounded-2xl px-5 py-3 text-xs text-ink shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="font-semibold text-maroon">
                    Showing All Latest New Releases (2024–2026 Worldwide)
                  </span>
                </div>
                <button
                  onClick={handleClearSelection}
                  className="text-xs font-semibold text-accent hover:text-accent-dark hover:underline cursor-pointer"
                >
                  Return to All Books →
                </button>
              </div>
            )}

            {selectedBook && !isShowingLatest && (
              <div className="flex items-center justify-between bg-cream/90 border border-line rounded-2xl px-5 py-3 text-xs text-ink shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-maroon animate-pulse" />
                  <span>
                    Selected book: <strong className="text-maroon font-semibold">"{selectedBook.title}"</strong> {selectedBook.authors ? `by ${selectedBook.authors}` : ""}
                  </span>
                </div>
                <button
                  onClick={handleClearSelection}
                  className="text-xs font-semibold text-accent hover:text-accent-dark hover:underline cursor-pointer"
                >
                  Clear & Show All Books →
                </button>
              </div>
            )}

            {status === "error" && (
              <div className="text-center text-ink-muted text-sm py-6">
                No book found matching "{notFoundQuery}". Try checking the spelling or searching another title.
              </div>
            )}

            <section>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="font-display font-semibold text-base">
                    {isShowingLatest
                      ? "Spotlight New Releases (2024–2026)"
                      : selectedBook
                      ? `Recommended based on “${selectedBook.title}”`
                      : "All Books"}
                  </h2>
                  {selectedBook && !isShowingLatest && (
                    <span className="text-[11px] font-medium text-maroon bg-cream px-2.5 py-0.5 rounded-full">
                      Readers who liked this also enjoyed
                    </span>
                  )}
                  {!selectedBook && !isShowingLatest && (
                    <span className="text-[11px] font-medium text-ink-muted bg-cream px-2.5 py-0.5 rounded-full">
                      Worldwide Catalog (2.8M+ Books)
                    </span>
                  )}
                  {status === "loading" && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-accent font-medium bg-cream px-2.5 py-0.5 rounded-full animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                      Loading…
                    </span>
                  )}
                </div>
                <span className="text-xs text-ink-muted font-medium">
                  {(selectedBook ? recommended.length : allBooks.length)} books
                </span>
              </div>

              {status === "loading" && (selectedBook ? recommended.length === 0 : allBooks.length === 0) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-28 rounded-2xl bg-cream animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(selectedBook ? recommended : allBooks).map((book) => (
                    <RecommendedCard
                      key={book.book_id}
                      book={book}
                      onClick={() => selectBook(book.title)}
                      isFavorite={favorites.some((f) => f.book_id === book.book_id)}
                      onToggleFavorite={() => handleToggleFavorite(book)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-semibold text-base">Popular Now</h2>
                  {popular.length === 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-accent font-medium bg-cream px-2.5 py-0.5 rounded-full animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                      Loading books…
                    </span>
                  )}
                </div>
                <span className="text-xs text-ink-muted font-medium">
                  {popular.length} top books
                </span>
              </div>
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin">
                {popular.map((book) => (
                  <PopularCard
                    key={book.book_id}
                    book={book}
                    onClick={() => selectBook(book.title)}
                    isFavorite={favorites.some((f) => f.book_id === book.book_id)}
                    onToggleFavorite={() => handleToggleFavorite(book)}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {activeNav === "Category" && (
          <CategoryPage
            onSelectBook={selectBook}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {activeNav === "Quiz" && <QuizPage onSelectBook={selectBook} />}

        {activeNav === "Mood" && (
          <MoodPage
            onSelectBook={selectBook}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {activeNav === "Discover" && (
          <DiscoverPage
            onSelectBook={selectBook}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {activeNav === "Journey" && (
          <ReadingJourneyPage
            journey={journey}
            onMove={handleMoveToShelf}
            onRemove={handleRemoveFromJourney}
            onRate={handleRateFinished}
            onSelectBook={selectBook}
          />
        )}

        {activeNav === "My Library" && (
          <BookListPage
            title="My Library"
            subtitle="Books you've recently viewed or searched for."
            books={history}
            emptyMessage="Books you view will show up here."
            onSelectBook={selectBook}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {activeNav === "Favorite" && (
          <BookListPage
            title="Favorites"
            subtitle="Books you've hearted."
            books={favorites}
            emptyMessage="Tap the heart on any book to save it here."
            onSelectBook={selectBook}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {activeNav === "Setting" && (
          <SettingsPage userName={userName} onSaveName={handleSaveName} onClearData={handleClearData} />
        )}

        {activeNav === "Help" && <HelpPage />}
      </main>

      {/* Detail Panel Desktop (Column 3 on lg+) */}
      {selectedBook && (
        <div className="hidden lg:block bg-maroon-panel overflow-y-auto">
          <DetailPanel
            book={selectedBook}
            reason={selectedReason}
            descriptionLoading={descriptionLoading}
            isFavorite={selectedBook ? favorites.some((f) => f.book_id === selectedBook.book_id) : false}
            onToggleFavorite={() => selectedBook && handleToggleFavorite(selectedBook)}
            shelf={selectedBook ? shelfOf(journey, selectedBook.book_id) : null}
            onMoveToShelf={(shelf) => selectedBook && handleMoveToShelf(selectedBook, shelf)}
            onClose={handleClearSelection}
          />
        </div>
      )}

      {/* Detail Panel Mobile / Tablet (Slide-up modal overlay on < lg) */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 lg:hidden">
          <div className="fixed inset-0" onClick={handleClearSelection} />
          <div className="relative w-full max-w-lg bg-maroon-panel rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl z-10 animate-fade-in">
            <DetailPanel
              book={selectedBook}
              reason={selectedReason}
              descriptionLoading={descriptionLoading}
              isFavorite={selectedBook ? favorites.some((f) => f.book_id === selectedBook.book_id) : false}
              onToggleFavorite={() => selectedBook && handleToggleFavorite(selectedBook)}
              shelf={selectedBook ? shelfOf(journey, selectedBook.book_id) : null}
              onMoveToShelf={(shelf) => selectedBook && handleMoveToShelf(selectedBook, shelf)}
              onClose={handleClearSelection}
            />
          </div>
        </div>
      )}
    </div>
  );
}

