import { Compass, Globe2, Heart, BookOpen, Star, ArrowRight, Smile, BookmarkCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { getPopular } from "../lib/api";
import BookCover from "../components/BookCover";
import bookshelfHero from "../assets/bookshelf-hero.jpg";
import logo from "../assets/logo-white.png";

const FEATURES = [
  {
    icon: Compass,
    title: "Smart recommendations",
    body: "Combines genre matching with real reader behavior from over 6 million ratings to surface books you will genuinely enjoy.",
  },
  {
    icon: Globe2,
    title: "Worldwide catalog",
    body: "Explore a massive library spanning every genre, era, and multiple international languages from the 1800s to modern releases.",
  },
  {
    icon: BookOpen,
    title: "Real summaries",
    body: "Every book includes an accurate, spoiler-free overview so you always know what to expect before starting.",
  },
  {
    icon: Heart,
    title: "Saved reading library",
    body: "Save your favorite titles and keep a private reading history directly in your browser.",
  },
  {
    icon: Smile,
    title: "Mood-based discovery",
    body: "Choose how you want to feel or describe a vibe in your own words to discover fitting stories.",
  },
  {
    icon: BookmarkCheck,
    title: "Reading journey tracker",
    body: "Track currently reading, want to read, and finished shelves to organize your personal reading goals.",
  },
];

export default function LandingPage({ onEnter, onStartQuiz, userName, onSaveName }) {
  const [preview, setPreview] = useState([]);
  const [enteredName, setEnteredName] = useState(userName || "");

  useEffect(() => {
    getPopular(8).then(setPreview).catch(() => { });
  }, []);

  function handleStart(action) {
    const trimmed = enteredName.trim();
    if (trimmed && onSaveName) {
      onSaveName(trimmed);
    }
    if (action === "quiz") {
      onStartQuiz();
    } else {
      onEnter();
    }
  }

  return (
    <div className="min-h-screen bg-maroon">
      {/* Top navigation header */}
      <header className="flex items-center justify-between max-w-6xl mx-auto px-6 sm:px-8 py-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" className="w-5 h-5 object-contain" />
          <span className="font-display font-bold text-lg text-card tracking-tight">
            BookWise<span className="text-accent">.</span>
          </span>
        </div>
        <button
          onClick={() => handleStart("library")}
          className="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer"
        >
          Get Started
        </button>
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={bookshelfHero}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-maroon/55 via-maroon/75 to-maroon" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 sm:px-8 pt-14 pb-20 text-center">
          <p className="text-accent text-xs font-semibold tracking-[0.2em] uppercase mb-4">
            A home for readers
          </p>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-[38px] font-bold text-card leading-tight max-w-2xl mx-auto">
            <span className="block">Find your next favourite book,</span>
            <span className="block">before you finish this one.</span>
          </h1>
          <p className="text-card/75 text-sm sm:text-base mt-5 max-w-lg mx-auto leading-relaxed">
            Search any title you love to discover thoughtful recommendations powered by reader ratings, story elements, and an expansive catalog from historical classics to modern releases.
          </p>

          {/* Name input for personalization */}
          <div className="mt-8 max-w-md mx-auto">
            <div className="flex items-center bg-card/10 backdrop-blur-md border border-card/25 rounded-full p-1.5 shadow-lg">
              <div className="pl-3.5 text-card/60">
                <User size={17} />
              </div>
              <input
                type="text"
                value={enteredName}
                onChange={(e) => setEnteredName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStart("library");
                }}
                placeholder="Enter your name to personalize..."
                className="flex-1 bg-transparent px-3 py-2 text-sm text-card placeholder:text-card/50 outline-none"
              />
              <button
                onClick={() => handleStart("library")}
                className="bg-accent hover:bg-accent-dark text-white text-xs sm:text-sm font-semibold px-5 py-2 rounded-full transition-colors shrink-0 cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
            <button
              onClick={() => handleStart("library")}
              className="bg-accent hover:bg-accent-dark text-white font-medium px-8 py-3 rounded-full transition-colors cursor-pointer shadow-md text-sm"
            >
              Browse the library
            </button>
            <button
              onClick={() => handleStart("quiz")}
              className="bg-card/10 border border-card/30 hover:border-card/60 text-card font-medium px-8 py-3 rounded-full transition-colors inline-flex items-center gap-2 cursor-pointer text-sm"
            >
              Take the quiz <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Main card panel */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-16">
        <div className="bg-card rounded-3xl shadow-2xl px-6 sm:px-10 py-12">
          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="text-left bg-cream/40 p-5 rounded-2xl border border-line/60">
                <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-maroon mb-3.5">
                  <Icon size={18} />
                </div>
                <h3 className="font-display font-semibold text-sm">{title}</h3>
                <p className="text-ink-muted text-xs mt-1.5 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          {/* Featured quiz banner */}
          <div className="mt-12 pt-8 border-t border-line">
            <div className="rounded-2xl bg-maroon overflow-hidden grid grid-cols-1 sm:grid-cols-[1.1fr_1fr]">
              <div className="px-7 sm:px-9 py-8 flex flex-col justify-center">
                <p className="text-accent text-[11px] font-semibold tracking-[0.2em] uppercase mb-2">
                  Featured quiz
                </p>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-card leading-snug">
                  What book on the shelf are you?
                </h2>
                <p className="text-card/75 text-xs sm:text-sm mt-2.5 max-w-sm leading-relaxed">
                  Answer nine quick questions about your reading tastes to discover your personalized book match.
                </p>
                <button
                  onClick={onStartQuiz}
                  className="mt-5 bg-accent hover:bg-accent-dark text-white text-xs sm:text-sm font-medium px-6 py-2.5 rounded-full transition-colors inline-flex items-center gap-2 w-fit"
                >
                  Take the quiz <ArrowRight size={14} />
                </button>
              </div>
              <div
                className="hidden sm:block bg-cover bg-center opacity-75"
                style={{ backgroundImage: `url(${bookshelfHero})` }}
              />
            </div>
          </div>

          {/* Trending preview */}
          {preview.length > 0 && (
            <div className="mt-12 pt-8 border-t border-line">
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="font-display font-semibold text-base">
                  Trending in the library right now
                </h2>
                <button
                  onClick={onEnter}
                  className="text-xs font-medium text-accent hover:text-accent-dark inline-flex items-center gap-1"
                >
                  See all <ArrowRight size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                {preview.map((book) => (
                  <button
                    key={book.book_id}
                    onClick={onEnter}
                    className="text-left group cursor-pointer"
                  >
                    <BookCover
                      src={book.image_url}
                      title={book.title}
                      author={book.authors}
                      className="w-full aspect-[2/3] object-cover rounded-lg group-hover:opacity-90 transition-opacity shadow-xs"
                    />
                    <p className="font-display font-medium text-xs mt-2.5 line-clamp-2">{book.title}</p>
                    <p className="text-ink-muted text-[11px] mt-0.5">by {book.authors}</p>
                    <div className="flex items-center gap-1 mt-1 text-ink-muted text-[11px]">
                      <Star size={11} className="text-gold fill-gold" />
                      {book.rating.toFixed(1)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center text-card/50 text-xs pb-8">
        BookWise. Discover your next great read.
      </footer>
    </div>
  );
}
