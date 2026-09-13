import { useState } from "react";
import { Compass, RotateCcw, ArrowRight, BookOpen } from "lucide-react";
import { bookMatchesGenreTag } from "../lib/api";
import catalog from "../data/catalog.json";
import BookCover from "../components/BookCover";
import StarRating from "../components/StarRating";

// 9 in-depth questions that analyze reader profile, mood, pacing, stakes, and narrative preferences
const QUESTIONS = [
  {
    prompt: "It's a quiet evening with nowhere to be. You reach for a book that's...",
    options: [
      { label: "A slow-burn mystery where every small detail matters", genres: ["mystery", "thriller"] },
      { label: "A sweeping romance that makes your chest ache", genres: ["romance"] },
      { label: "An expansive world with its own lore, magic, and geography", genres: ["fantasy"] },
      { label: "Something grounded in reality: a memoir, investigative history, or big idea", genres: ["non-fiction", "biography"] },
    ],
  },
  {
    prompt: "Your ideal protagonist is...",
    options: [
      { label: "Clever, observant, but outmatched and surviving on sheer wit", genres: ["thriller", "mystery"] },
      { label: "Emotionally complex, guarded, and falling for someone against their better judgment", genres: ["romance", "literary-fiction"] },
      { label: "A rebel, chosen one, or reluctant hero facing a colossal destiny", genres: ["fantasy", "young-adult", "adventure"] },
      { label: "A deep thinker questioning society, morality, or the nature of existence", genres: ["philosophy", "classics", "science-fiction"] },
    ],
  },
  {
    prompt: "Pick a setting you'd gladly lose yourself in for 400 pages.",
    options: [
      { label: "A fog-shrouded manor, isolated boarding school, or secluded island", genres: ["mystery", "classics", "horror"] },
      { label: "A vibrant alien ecosystem, generation ship, or neon-lit future", genres: ["science-fiction", "dystopian"] },
      { label: "An ancient kingdom ruled by court intrigue, gods, and swordplay", genres: ["fantasy", "mythology"] },
      { label: "A bustling modern metropolis full of secrets, coffee shops, and chance encounters", genres: ["literary-fiction", "contemporary", "romance"] },
    ],
  },
  {
    prompt: "What reading pace fits your current state of mind?",
    options: [
      { label: "Fast and intense: short chapters and constant cliffhangers", genres: ["thriller", "crime", "adventure"] },
      { label: "Lyrical and atmospheric: rich prose meant to be savored slowly", genres: ["literary-fiction", "poetry", "classics"] },
      { label: "Brisk, witty, and heartwarming: lively dialogue and comedic charm", genres: ["humor", "romance"] },
      { label: "Epic and immersive: intricate politics, multiple perspectives, and grand conflicts", genres: ["fantasy", "war", "historical-fiction"] },
    ],
  },
  {
    prompt: "What kind of stakes hook you the hardest?",
    options: [
      { label: "Survival against impossible odds, nature, or a lethal antagonist", genres: ["adventure", "thriller", "horror"] },
      { label: "The fate of an empire, rebellion, or civilization on the brink", genres: ["fantasy", "dystopian", "war"] },
      { label: "Personal stakes: relationships, family secrets, or identity", genres: ["literary-fiction", "romance", "biography"] },
      { label: "Unlocking a forgotten scientific discovery or hidden truth", genres: ["science-fiction", "non-fiction", "mystery"] },
    ],
  },
  {
    prompt: "What's your stance on plot twists and surprises?",
    options: [
      { label: "I want to be completely deceived and have my jaw on the floor", genres: ["thriller", "mystery", "crime"] },
      { label: "I prefer deep emotional resonance over cheap shock value", genres: ["literary-fiction", "historical-fiction"] },
      { label: "I love a satisfying prophecy fulfilled with an unexpected twist", genres: ["fantasy", "mythology"] },
      { label: "Give me genuine chills, eerie atmosphere, and psychological dread", genres: ["horror", "paranormal"] },
    ],
  },
  {
    prompt: "Which time era pulls your curiosity most strongly?",
    options: [
      { label: "Modern releases and contemporary stories (2020–2026)", genres: ["romance", "thriller", "young-adult"] },
      { label: "Historic centuries: Victorian streets, medieval castles, ancient dynasties", genres: ["historical-fiction", "classics"] },
      { label: "Far-future centuries: interstellar travel, AI, and terraformed worlds", genres: ["science-fiction", "dystopian"] },
      { label: "Mythical realms unbound by human calendars", genres: ["fantasy", "mythology"] },
    ],
  },
  {
    prompt: "What gives a story lasting power for you?",
    options: [
      { label: "Ideas and concepts that make me rethink how the real world operates", genres: ["non-fiction", "philosophy", "science-fiction"] },
      { label: "Unforgettable characters who feel like people I know and grieve leaving", genres: ["literary-fiction", "young-adult", "romance"] },
      { label: "An intricate puzzle where every clue clicks into place like clockwork", genres: ["mystery", "crime"] },
      { label: "An inspirational journey of resilience, mastery, and triumph", genres: ["self-help", "biography", "adventure"] },
    ],
  },
  {
    prompt: "How do you want to feel when you read the very last sentence?",
    options: [
      { label: "Exhilarated and breathless from a masterclass conclusion", genres: ["thriller", "mystery", "adventure"] },
      { label: "Deeply moved, maybe with tears, but profoundly comforted", genres: ["romance", "literary-fiction"] },
      { label: "Awe-struck by the sheer scope and ambition of the journey", genres: ["fantasy", "science-fiction", "war"] },
      { label: "Motivated, illuminated, and ready to act in my own life", genres: ["self-help", "biography", "philosophy"] },
    ],
  },
];

const GENRE_LABEL = {
  mystery: "Mystery & Detective", thriller: "Psychological Thriller", romance: "Romance & Drama",
  fantasy: "High Fantasy & Magic", "non-fiction": "Non-Fiction & Ideas", biography: "Biography & Memoir",
  adventure: "Action & Adventure", "literary-fiction": "Literary Fiction", horror: "Dark Horror & Suspense",
  "young-adult": "Young Adult", classics: "Literary Classics", "science-fiction": "Sci-Fi & Speculative",
  dystopian: "Dystopian & Rebellion", mythology: "Mythology & Legend", "historical-fiction": "Historical Fiction",
  crime: "True Crime & Heist", humor: "Humor & Satire", paranormal: "Paranormal & Gothic",
  philosophy: "Philosophy & Thought", "self-help": "Personal Growth & Mindset", war: "War & Epic Conflict",
};

const QUIZ_STOPWORDS = new Set([
  "that", "this", "with", "from", "have", "more", "some", "than", "into", "book", "novel", "read",
  "your", "where", "when", "what", "which", "their", "there", "about", "want", "like", "will", "just"
]);

function scoreCatalogForQuiz(answers) {
  if (!answers || answers.length === 0) return { top: null, runnersUp: [] };

  const genreWeights = {};
  for (const ans of answers) {
    for (const g of ans.genres || []) {
      genreWeights[g] = (genreWeights[g] || 0) + 1;
    }
  }

  const optionKeywords = [];
  for (const ans of answers) {
    const words = String(ans.label || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !QUIZ_STOPWORDS.has(w));
    optionKeywords.push(...words);
  }

  const q7Label = answers[6]?.label || "";

  const scored = [];
  const seenSeries = new Set();

  function getSeriesKey(title) {
    const clean = String(title || "").toLowerCase();
    const match = clean.match(/\(([^,#]+)/);
    if (match) return match[1].trim();
    return clean.replace(/[^a-z0-9]/g, "").slice(0, 15);
  }

  for (const b of catalog) {
    const bg = " " + String(b.genres || "").toLowerCase() + " ";
    const title = String(b.title || "").toLowerCase();
    const desc = String(b.description || "").toLowerCase();

    let score = 0;
    let genreHits = 0;

    for (const [g, w] of Object.entries(genreWeights)) {
      if (bookMatchesGenreTag(b.genres, g)) {
        score += w * 16;
        genreHits++;
      }
    }

    if (genreHits === 0) continue;

    for (const kw of optionKeywords) {
      if (desc.includes(kw)) score += 5;
      else if (title.includes(kw)) score += 6;
      else if (bg.includes(kw)) score += 4;
    }

    const yr = Number(b.year);
    if (q7Label.includes("Modern")) {
      if (yr >= 2018) score += 20;
      else if (yr >= 2010) score += 10;
      else if (yr < 2000) score -= 20;
    } else if (q7Label.includes("Historic")) {
      if (bg.includes("historical") || bg.includes("classics")) score += 20;
      if (yr && yr <= 1980) score += 15;
    } else if (q7Label.includes("Far-future")) {
      if (bg.includes("sci-fi") || bg.includes("science-fiction") || bg.includes("space")) score += 20;
    } else if (q7Label.includes("Mythical")) {
      if (bg.includes("fantasy") || bg.includes("mythology") || bg.includes("magic")) score += 20;
    }

    const lang = String(b.language || "english").toLowerCase();
    if (lang === "english") score += 40;
    else score -= 40;

    const cnt = Number(b.ratings_count || 0);
    if (cnt > 0) {
      score += Math.min(10, Math.log10(cnt + 1) * 2);
    }
    score += Number(b.rating || 0);

    scored.push({ book: b, score, series: getSeriesKey(b.title) });
  }

  scored.sort((a, b) => b.score - a.score);

  const distinct = [];
  for (const item of scored) {
    if (item.series && seenSeries.has(item.series)) continue;
    if (item.series) seenSeries.add(item.series);
    distinct.push(item.book);
    if (distinct.length >= 3) break;
  }

  return {
    top: distinct[0] || null,
    runnersUp: distinct.slice(1, 3),
  };
}

export default function QuizPage({ onSelectBook }) {
  const [step, setStep] = useState(-1); // -1 = intro
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [scores, setScores] = useState({});
  const [matchData, setMatchData] = useState(null);
  const [resultGenre, setResultGenre] = useState(null);
  const [loading, setLoading] = useState(false);

  function start() {
    setSelectedAnswers([]);
    setScores({});
    setMatchData(null);
    setStep(0);
  }

  async function answer(option) {
    const updatedAnswers = [...selectedAnswers, option];
    setSelectedAnswers(updatedAnswers);

    const next = { ...scores };
    for (const g of option.genres) next[g] = (next[g] || 0) + 1;
    setScores(next);

    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1);
      return;
    }

    // Last question answered: tally and compute deterministic match
    const sorted = Object.entries(next).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0]?.[0] || "fantasy";
    setResultGenre(winner);
    setLoading(true);
    setStep(QUESTIONS.length); // results screen

    // Direct deterministic matching based on user's answers
    const match = scoreCatalogForQuiz(updatedAnswers);
    setMatchData(match);
    setLoading(false);
  }

  return (
    <div className="min-h-[440px] flex flex-col max-w-3xl mx-auto">
      {step === -1 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4">
          <div className="w-14 h-14 rounded-full bg-cream flex items-center justify-center text-maroon mb-5 shadow-xs">
            <Compass size={24} />
          </div>
          <h1 className="font-display text-2xl font-bold">Discover Your Next Signature Read</h1>
          <p className="text-ink-muted text-sm mt-3 max-w-md">
            Nine perceptive questions analyzing your taste in pacing, narrative stakes, settings, and emotional weight.
            We cross-reference your answers with our 2.3M+ worldwide book database to find your ideal match.
          </p>
          <button
            onClick={start}
            className="mt-8 bg-maroon hover:bg-maroon-panel text-white text-sm font-medium px-8 py-3 rounded-full transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            Start Reader Profile Quiz <ArrowRight size={15} />
          </button>
        </div>
      )}

      {step >= 0 && step < QUESTIONS.length && (
        <div className="flex-1 flex flex-col py-6 px-2">
          <div className="flex items-center gap-1.5 mb-8">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-maroon" : "bg-line"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-maroon">
              Question {step + 1} of {QUESTIONS.length}
            </p>
            <span className="text-xs text-ink-muted">
              {Math.round(((step + 1) / QUESTIONS.length) * 100)}% Complete
            </span>
          </div>

          <h2 className="font-display text-lg font-semibold leading-snug mb-6">
            {QUESTIONS[step].prompt}
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {QUESTIONS[step].options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => answer(opt)}
                className="text-left px-5 py-3.5 rounded-xl border border-line hover:border-maroon hover:bg-cream/60 transition-all text-sm cursor-pointer shadow-xs"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === QUESTIONS.length && (
        <div className="flex-1 flex flex-col items-center justify-center py-10 px-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 rounded-full border-2 border-line border-t-maroon animate-spin mx-auto mb-5" />
              <p className="text-ink font-medium text-sm">Analyzing your responses across 2.3M worldwide books…</p>
              <p className="text-ink-muted text-xs mt-1">Calibrating matching genre and tone</p>
            </div>
          ) : matchData?.top ? (
            <div className="w-full space-y-8 animate-fade-in">
              <div className="text-center">
                <span className="text-[11px] uppercase tracking-widest font-semibold text-maroon bg-cream px-3 py-1 rounded-full">
                  Primary Taste: {GENRE_LABEL[resultGenre] || resultGenre}
                </span>
                <h2 className="font-display text-2xl font-bold mt-3">Your Top Match</h2>
              </div>

              {/* Main spotlight recommendation */}
              <div className="bg-card border border-line rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-xs">
                <BookCover
                  src={matchData.top.image_url}
                  title={matchData.top.title}
                  author={matchData.top.authors}
                  className="w-36 h-52 object-cover rounded-xl shadow-md shrink-0 cursor-pointer"
                  onClick={() => onSelectBook(matchData.top.title)}
                />
                <div className="flex-1 text-center sm:text-left">
                  <h3
                    onClick={() => onSelectBook(matchData.top.title)}
                    className="font-display text-xl font-bold hover:text-maroon transition-colors cursor-pointer"
                  >
                    {matchData.top.title}
                  </h3>
                  <p className="text-ink-muted text-sm mt-1">{matchData.top.authors}</p>
                  {matchData.top.year && (
                    <span className="inline-block text-xs text-ink-muted bg-cream px-2 py-0.5 rounded mt-2">
                      Published {matchData.top.year}
                    </span>
                  )}
                  <div className="mt-3 flex justify-center sm:justify-start">
                    <StarRating rating={matchData.top.rating} />
                  </div>
                  <p className="text-xs text-ink-muted line-clamp-3 mt-3 leading-relaxed">
                    {matchData.top.blurb || matchData.top.description || "A highly recommended masterpiece matching your reading quiz answers."}
                  </p>

                  <div className="flex items-center gap-3 mt-5 flex-wrap justify-center sm:justify-start">
                    <button
                      onClick={() => onSelectBook(matchData.top.title)}
                      className="bg-maroon hover:bg-maroon-panel text-white text-xs font-semibold px-6 py-2.5 rounded-full transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                    >
                      <BookOpen size={14} /> View Book Details
                    </button>
                    <button
                      onClick={start}
                      className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink px-4 py-2.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={13} /> Retake Quiz
                    </button>
                  </div>
                </div>
              </div>

              {/* Runner-up recommendations */}
              {matchData.runnersUp?.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs uppercase font-semibold text-ink-muted tracking-wider mb-4 text-center sm:text-left">
                    Other High-Affinity Matches for Your Answers
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {matchData.runnersUp.map((b) => (
                      <div
                        key={b.book_id}
                        onClick={() => onSelectBook(b.title)}
                        className="bg-cream/40 border border-line rounded-xl p-3.5 flex items-center gap-3.5 hover:border-maroon/50 transition-all cursor-pointer shadow-xs"
                      >
                        <BookCover
                          src={b.image_url}
                          title={b.title}
                          author={b.authors}
                          className="w-14 h-20 object-cover rounded-lg shadow-xs shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="font-display text-sm font-bold truncate hover:text-maroon transition-colors">
                            {b.title}
                          </h5>
                          <p className="text-xs text-ink-muted truncate mt-0.5">{b.authors}</p>
                          <div className="mt-1.5 scale-90 origin-left">
                            <StarRating rating={b.rating} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 space-y-4">
              <p className="text-ink-muted text-sm">
                No matching books found right now for this specific combination.
              </p>
              <button
                onClick={start}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-maroon hover:underline cursor-pointer"
              >
                <RotateCcw size={14} /> Try quiz again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
