// api.js
// ------
// High-performance API client with preloaded multi-language, all-era catalog and backend fallback.

import catalog from "../data/catalog.json";
import { getSubjectWorks, getSimilarBySubject, searchOpenLibrary } from "./openLibrary";

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const apiCache = new Map();

async function fetchWithCache(url, timeoutMs = 1200) {
  if (apiCache.has(url)) {
    return apiCache.get(url);
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const promise = fetch(url, { signal: controller.signal })
    .then(async (res) => {
      clearTimeout(id);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      clearTimeout(id);
      apiCache.delete(url);
      throw err;
    });

  apiCache.set(url, promise);
  return promise;
}

function norm(str) {
  return String(str || "").toLowerCase().trim();
}

const STOPWORDS = new Set([
  "the", "and", "of", "in", "to", "with", "for", "on", "at", "by", "from",
  "about", "into", "through", "after", "before", "is", "a", "an", "this",
  "that", "these", "those", "book", "books", "edition", "series", "novel",
  "vol", "volume", "part", "ed", "annotated", "collection", "selected", "works"
]);

const GENRE_STOPWORDS = new Set(["fiction", "non-fiction", "nonfiction", "literature", "contemporary", "general"]);

function getTokens(text) {
  const words = String(text || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  return new Set(words.filter((w) => w.length >= 4 && !STOPWORDS.has(w)));
}

function cleanRootTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/:.*/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function findSimilarBooks(targetBook, n = 24) {
  if (!targetBook) return [];

  const tId = String(targetBook.book_id || "");
  const tTitle = norm(targetBook.title);
  const tRoot = cleanRootTitle(targetBook.title);
  const tAuthor = norm(targetBook.authors);
  const tLang = norm(targetBook.language || "english");
  const tGenres = new Set(norm(targetBook.genres).split(/\s+/).filter(Boolean));
  const tSpecificGenres = new Set([...tGenres].filter((g) => !GENRE_STOPWORDS.has(g)));
  const tYear = targetBook.year;
  const tTokens = getTokens(`${targetBook.title} ${targetBook.description || ""}`);

  const scored = [];
  const seenRoots = new Set([tRoot]);

  for (const b of catalog) {
    if (String(b.book_id) === tId || norm(b.title) === tTitle) continue;

    const bRoot = cleanRootTitle(b.title);
    if (bRoot && bRoot === tRoot) continue;

    const bAuthor = norm(b.authors);
    const bLang = norm(b.language || "english");
    const bGenres = new Set(norm(b.genres).split(/\s+/).filter(Boolean));
    const bSpecificGenres = new Set([...bGenres].filter((g) => !GENRE_STOPWORDS.has(g)));
    const bYear = b.year;

    let score = 0;

    // 1. Language similarity / constraint
    if (tLang && tLang !== "english") {
      if (bLang === tLang) {
        score += 80;
      } else {
        score -= 200; // Keep non-English recommendations strictly within language
      }
    } else {
      if (bLang === "english") {
        score += 30;
      } else {
        score -= 40;
      }
    }

    // 2. Author matching
    if (tAuthor && bAuthor) {
      const tFirstAuthor = tAuthor.split(",")[0].split("&")[0].trim();
      if (tFirstAuthor && tFirstAuthor.length > 3 && bAuthor.includes(tFirstAuthor)) {
        score += 140;
      }
    }

    // 3. Specific Genre overlap
    let sharedCount = 0;
    for (const g of tSpecificGenres) {
      if (bSpecificGenres.has(g)) sharedCount++;
    }

    if (sharedCount > 0) {
      score += sharedCount * 40;
      const unionCount = new Set([...tSpecificGenres, ...bSpecificGenres]).size;
      if (unionCount > 0) {
        score += Math.round((sharedCount / unionCount) * 60);
      }
    } else {
      let generalShared = 0;
      for (const g of tGenres) {
        if (bGenres.has(g)) generalShared++;
      }
      if (generalShared === 0) {
        score -= 100;
      } else {
        score += generalShared * 10;
      }
    }

    // 4. Keyword tokens overlap
    const bTokens = getTokens(`${b.title} ${b.description || ""}`);
    let tokenOverlap = 0;
    for (const token of tTokens) {
      if (bTokens.has(token)) tokenOverlap++;
    }
    score += tokenOverlap * 15;

    // 5. Era / Year proximity
    if (tYear && bYear) {
      const diff = Math.abs(Number(tYear) - Number(bYear));
      if (diff <= 5) score += 15;
      else if (diff <= 15) score += 10;
      else if (diff <= 30) score += 5;
    }

    // 6. Quality tie-breaker
    const cnt = Number(b.ratings_count || 0);
    if (cnt > 0) {
      score += Math.min(15, Math.log10(cnt + 1) * 2);
    }

    if (score > 15) {
      scored.push({ score, book: b, root: bRoot });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const results = [];
  for (const item of scored) {
    if (item.root && seenRoots.has(item.root)) continue;
    if (item.root) seenRoots.add(item.root);
    results.push(item.book);
    if (results.length >= n) break;
  }

  return results;
}

export async function searchBook(query) {
  const q = norm(query);
  if (!q) throw new Error("Empty search query");

  // 1. Exact title match
  let match = catalog.find((b) => norm(b.title) === q);
  if (match) return match;

  // 2. Title starts with query
  match = catalog.find((b) => norm(b.title).startsWith(q));
  if (match) return match;

  // 3. Title contains query (prioritizing highest ratings_count)
  const titleMatches = catalog.filter((b) => norm(b.title).includes(q));
  if (titleMatches.length > 0) {
    return titleMatches.sort((a, b) => Number(b.ratings_count || 0) - Number(a.ratings_count || 0))[0];
  }

  // 4. Author contains query (prioritizing highest ratings_count)
  const authorMatches = catalog.filter((b) => norm(b.authors).includes(q));
  if (authorMatches.length > 0) {
    return authorMatches.sort((a, b) => Number(b.ratings_count || 0) - Number(a.ratings_count || 0))[0];
  }

  // 5. Genre or keywords match
  const genreMatches = catalog.filter((b) => norm(b.genres).includes(q) || norm(b.description).includes(q));
  if (genreMatches.length > 0) {
    return genreMatches.sort((a, b) => Number(b.ratings_count || 0) - Number(a.ratings_count || 0))[0];
  }

  // 6. Try backend
  try {
    return await fetchWithCache(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
  } catch {}

  // 7. Fallback to Open Library
  return await searchOpenLibrary(query);
}

export async function getRecommendations(titleOrBook, n = 24, genre = null) {
  try {
    const titleStr = typeof titleOrBook === "object" && titleOrBook !== null ? titleOrBook.title : titleOrBook;
    let url = `${BASE_URL}/recommend?title=${encodeURIComponent(titleStr)}&n=${n}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    return await fetchWithCache(url);
  } catch {}

  const target = typeof titleOrBook === "object" && titleOrBook !== null
    ? titleOrBook
    : (catalog.find((b) => norm(b.title) === norm(titleOrBook)) ||
       catalog.find((b) => norm(b.title).includes(norm(titleOrBook))) ||
       catalog.find((b) => norm(b.authors).includes(norm(titleOrBook))));

  if (target) {
    const similar = findSimilarBooks(target, n);
    if (similar.length > 0) {
      return { recommendations: similar };
    }
  }

  try {
    const titleStr = typeof titleOrBook === "object" && titleOrBook !== null ? titleOrBook.title : titleOrBook;
    const olRecs = await getSimilarBySubject(genre || "fiction", titleStr, n);
    return { recommendations: olRecs };
  } catch {
    return { recommendations: [] };
  }
}

export function bookMatchesGenreTag(bookGenresStr, g) {
  const bg = " " + norm(bookGenresStr) + " ";
  const target = norm(g);
  if (!target || target === "all") return true;

  if (target === "science-fiction") {
    return bg.includes("science-fiction") || bg.includes("sci-fi") || bg.includes("science fiction");
  }
  if (target === "non-fiction") {
    return bg.includes("non-fiction") || bg.includes("nonfiction") || bg.includes("non fiction");
  }
  if (target === "graphic-novels") {
    return bg.includes("graphic-novels") || bg.includes("graphic novels") || bg.includes("comics") || bg.includes("manga");
  }
  if (target === "short-stories") {
    return bg.includes("short-stories") || bg.includes("short stories");
  }
  if (target === "historical-fiction") {
    return bg.includes("historical-fiction") || bg.includes("historical fiction");
  }
  if (target === "literary-fiction") {
    return bg.includes("literary-fiction") || bg.includes("literary fiction");
  }
  if (target === "young-adult") {
    return bg.includes("young-adult") || bg.includes("young adult") || bg.includes(" ya ");
  }
  if (target === "self-help") {
    return bg.includes("self-help") || bg.includes("self help");
  }

  const spaced = target.replace(/-/g, " ");
  const re1 = new RegExp(`\\b${target}\\b`, "i");
  const re2 = new RegExp(`\\b${spaced}\\b`, "i");
  return re1.test(bookGenresStr) || re2.test(bookGenresStr);
}

export async function getPopular(n = 6, genre = null, yearMin = null, yearMax = null, language = null, offset = 0) {
  const genreList = genre && genre !== "all"
    ? String(genre).split(",").map((g) => norm(g).trim()).filter(Boolean)
    : [];

  try {
    let url = `${BASE_URL}/popular?n=${n}&offset=${offset}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    if (yearMin) url += `&year_min=${yearMin}`;
    if (yearMax) url += `&year_max=${yearMax}`;
    if (language && language !== "all") url += `&language=${encodeURIComponent(language)}`;
    let res = await fetchWithCache(url);
    if (Array.isArray(res)) {
      if (language && language !== "all") {
        res = res.filter((b) => norm(b.language) === norm(language));
      }
      if (genreList.length > 0) {
        res = res.filter((b) => genreList.some((g) => bookMatchesGenreTag(b.genres, g)));
      }
      if (res.length > 0) return res;
    }
  } catch {}

  let filtered = catalog;

  // Language filter
  if (language && language !== "all") {
    filtered = filtered.filter((b) => norm(b.language) === norm(language));
  }

  // Genre filter: STRICT MATCHING ONLY
  if (genreList.length > 0) {
    filtered = filtered
      .map((b) => {
        let matchCount = 0;
        for (const g of genreList) {
          if (bookMatchesGenreTag(b.genres, g)) matchCount++;
        }
        return { book: b, matchCount };
      })
      .filter((item) => item.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount || Number(b.book.ratings_count || 0) - Number(a.book.ratings_count || 0))
      .map((item) => item.book);
  }

  // Era filter
  if (yearMin) {
    filtered = filtered.filter((b) => b.year && b.year >= yearMin);
  }
  if (yearMax) {
    filtered = filtered.filter((b) => b.year && b.year <= yearMax);
  }

  const results = filtered.slice(offset, offset + n);
  return results;
}

export async function getWorldwide(n = 24, genre = null, yearMin = null, yearMax = null, language = null, offset = 0) {
  const genreList = genre && genre !== "all"
    ? String(genre).split(",").map((g) => norm(g).trim()).filter(Boolean)
    : [];

  try {
    let url = `${BASE_URL}/worldwide?n=${n}&offset=${offset}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    if (yearMin) url += `&year_min=${yearMin}`;
    if (yearMax) url += `&year_max=${yearMax}`;
    if (language && language !== "all") url += `&language=${encodeURIComponent(language)}`;
    let res = await fetchWithCache(url);
    if (Array.isArray(res)) {
      if (language && language !== "all") {
        res = res.filter((b) => norm(b.language) === norm(language));
      }
      if (genreList.length > 0) {
        res = res.filter((b) => genreList.some((g) => bookMatchesGenreTag(b.genres, g)));
      }
      if (res.length > 0) return res;
    }
  } catch {}

  let filtered = catalog;

  // Language filter
  if (language && language !== "all") {
    filtered = filtered.filter((b) => norm(b.language) === norm(language));
  }

  // Genre filter: STRICT MATCHING ONLY
  if (genreList.length > 0) {
    filtered = filtered
      .map((b) => {
        let matchCount = 0;
        for (const g of genreList) {
          if (bookMatchesGenreTag(b.genres, g)) matchCount++;
        }
        return { book: b, matchCount };
      })
      .filter((item) => item.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount || Number(b.book.ratings_count || 0) - Number(a.book.ratings_count || 0))
      .map((item) => item.book);
  }

  // Era filter
  if (yearMin) {
    filtered = filtered.filter((b) => b.year && b.year >= yearMin);
  }
  if (yearMax) {
    filtered = filtered.filter((b) => b.year && b.year <= yearMax);
  }

  const page = filtered.slice(offset, offset + n);
  return page;
}

export async function getPersonalized(genres = null, vibe = null, n = 30) {
  try {
    let url = `${BASE_URL}/personalized?n=${n}`;
    if (genres) url += `&genres=${encodeURIComponent(genres)}`;
    if (vibe) url += `&vibe=${encodeURIComponent(vibe)}`;
    return await fetchWithCache(url);
  } catch {}

  const targetGenres = genres ? genres.split(",").map(norm) : [];
  if (targetGenres.length > 0) {
    const matched = catalog.filter((b) => targetGenres.some((g) => bookMatchesGenreTag(b.genres, g)));
    if (matched.length > 0) return matched.slice(0, n);
  }

  return catalog.slice(0, n);
}

export async function getLatest(n = 30, genre = null) {
  try {
    let url = `${BASE_URL}/latest?n=${n}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    return await fetchWithCache(url);
  } catch {}

  // Filter 2024-2026 releases in catalog
  let latest = catalog.filter((b) => b.year && b.year >= 2024 && b.year <= 2026);
  if (genre && genre !== "all") {
    latest = latest.filter((b) => bookMatchesGenreTag(b.genres, genre));
  }
  return latest.slice(0, n);
}

const DESC_STOPWORDS = new Set([
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it", "they", "them", "what",
  "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did", "a", "an", "the", "and",
  "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with",
  "about", "into", "through", "before", "after", "to", "from", "in", "out", "on", "off",
  "over", "under", "then", "when", "where", "why", "how", "all", "any", "both", "each",
  "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same",
  "so", "than", "too", "very", "can", "will", "just", "should", "now", "want", "like",
  "book", "books", "story", "stories", "novel", "read", "reading", "looking", "something",
  "two", "people", "someone"
]);

const INTENT_MAP = {
  love: ["romance", "contemporary"],
  romance: ["romance", "contemporary"],
  "fall in love": ["romance", "contemporary"],
  detective: ["mystery", "crime", "thriller"],
  murder: ["mystery", "crime", "thriller"],
  crime: ["crime", "mystery", "thriller"],
  investigation: ["mystery", "thriller", "crime"],
  magic: ["fantasy", "adventure"],
  magical: ["fantasy", "adventure"],
  powers: ["fantasy", "young-adult"],
  hero: ["fantasy", "adventure", "young-adult"],
  survivors: ["dystopian", "post-apocalyptic", "science-fiction"],
  "world ends": ["dystopian", "post-apocalyptic", "science-fiction"],
  apocalypse: ["dystopian", "post-apocalyptic", "science-fiction"],
  rebuilding: ["dystopian", "historical-fiction"],
  space: ["science-fiction"],
  alien: ["science-fiction"],
  scary: ["horror", "thriller"],
  ghost: ["horror", "paranormal"],
  haunted: ["horror", "paranormal"],
  war: ["war", "historical-fiction"],
  poetry: ["poetry"],
  philosophy: ["philosophy"],
  biography: ["biography", "memoir"],
  motivational: ["self-help", "biography"],
};

export async function searchByDescription(text, n = 10) {
  const q = norm(text);
  if (!q) return [];

  try {
    const url = `${BASE_URL}/search_by_text?q=${encodeURIComponent(text)}&n=${n}`;
    const res = await fetchWithCache(url, 1500);
    if (Array.isArray(res) && res.length > 0) return res;
  } catch {}

  const rawWords = q.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const keywords = rawWords.filter((w) => w.length >= 3 && !DESC_STOPWORDS.has(w));

  const bonusGenres = new Set();
  for (const [phrase, genres] of Object.entries(INTENT_MAP)) {
    if (q.includes(phrase)) {
      for (const g of genres) bonusGenres.add(g);
    }
  }

  const scored = [];
  const seenRoots = new Set();

  for (const b of catalog) {
    const title = norm(b.title);
    const authors = norm(b.authors);
    const genres = norm(b.genres);
    const desc = norm(b.description || "");

    let score = 0;
    let matchedKw = 0;

    for (const kw of keywords) {
      if (desc.includes(kw)) {
        score += 25;
        matchedKw++;
      } else if (title.includes(kw)) {
        score += 35;
        matchedKw++;
      } else if (genres.includes(kw)) {
        score += 20;
        matchedKw++;
      }
    }

    let genreMatches = 0;
    for (const g of bonusGenres) {
      if (genres.includes(g)) {
        score += 25;
        genreMatches++;
      }
    }

    // Must match at least one keyword or strong intent tag
    if (matchedKw === 0 && (bonusGenres.size === 0 || genreMatches === 0)) {
      continue;
    }

    const cnt = Number(b.ratings_count || 0);
    if (cnt > 0) {
      score += Math.min(15, Math.log10(cnt + 1) * 2);
    }
    const rating = Number(b.rating || 0);
    if (rating > 0) {
      score += rating;
    }

    const lang = norm(b.language || "english");
    if (lang === "english") {
      score += 20;
    } else {
      score -= 20;
    }

    if (score > 0) {
      const root = cleanRootTitle(b.title);
      scored.push({ book: b, score, root });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const results = [];
  for (const item of scored) {
    if (item.root && seenRoots.has(item.root)) continue;
    if (item.root) seenRoots.add(item.root);
    results.push(item.book);
    if (results.length >= n) break;
  }

  return results;
}

const MOOD_SPECS = {
  happy: {
    genres: ["humor", "comedy"],
    keywords: ["humor", "comedy", "funny", "cheerful", "hilarious", "satire", "feel-good", "laughter", "witty", "fun"],
    negatives: ["tragedy", "grief", "horror", "morbid", "depressing"]
  },
  sad: {
    genres: ["drama"],
    keywords: ["tragedy", "tragic", "grief", "mourning", "sorrow", "heartbreak", "heartbreaking", "loss", "tearjerker", "bittersweet", "melancholy", "sadness", "depressing", "dying"],
    negatives: ["comedy", "hilarious", "laugh-out-loud"]
  },
  romantic: {
    genres: ["romance"],
    keywords: ["romance", "love", "romantic", "dating", "lovers", "relationship", "swoon", "heart", "kiss"],
    negatives: ["horror", "gory", "brutal"]
  },
  curious: {
    genres: ["mystery", "thriller", "science", "philosophy"],
    keywords: ["puzzle", "investigation", "secrets", "conspiracy", "detective", "curiosity", "discovery", "clue", "uncover"],
    negatives: []
  },
  adventurous: {
    genres: ["adventure"],
    keywords: ["adventure", "quest", "journey", "expedition", "voyage", "wilderness", "survival", "exploration"],
    negatives: []
  },
  dark: {
    genres: ["horror", "thriller", "crime"],
    keywords: ["horror", "dark", "gothic", "macabre", "sinister", "disturbing", "eerie", "spooky", "dread", "twisted", "chilling"],
    negatives: ["feel-good", "cheerful", "humor"]
  },
  peaceful: {
    genres: ["poetry"],
    keywords: ["peaceful", "calm", "gentle", "quiet", "nature", "zen", "tranquil", "meditative", "solitude"],
    negatives: ["horror", "thriller", "crime", "violent", "war"]
  },
  motivated: {
    genres: ["self-help", "biography", "memoir"],
    keywords: ["motivational", "motivation", "inspiration", "inspiring", "success", "habits", "growth", "leadership", "resilience", "triumph"],
    negatives: ["horror"]
  }
};

export async function getMoodRecommendations(mood, n = 8) {
  const mKey = norm(mood);
  const spec = MOOD_SPECS[mKey];

  // Try backend first if it's running
  try {
    const url = `${BASE_URL}/mood?mood=${encodeURIComponent(mood)}&n=${n}`;
    const res = await fetchWithCache(url, 1500);
    if (Array.isArray(res) && res.length > 0) return res;
  } catch {}

  if (!spec) {
    // If not a fixed mood key, treat it as a description search
    return searchByDescription(mood, n);
  }

  const scored = [];
  const seenRoots = new Set();

  for (const b of catalog) {
    const bg = " " + norm(b.genres) + " ";
    const title = norm(b.title);
    const desc = norm(b.description || "");
    const combined = `${title} ${desc} ${bg}`;

    let score = 0;
    let hits = 0;

    for (const g of spec.genres) {
      if (bg.includes(g)) {
        score += 30;
        hits++;
      }
    }

    for (const kw of spec.keywords) {
      if (desc.includes(kw)) {
        score += 15;
        hits++;
      } else if (title.includes(kw)) {
        score += 20;
        hits++;
      } else if (bg.includes(kw)) {
        score += 10;
        hits++;
      }
    }

    for (const neg of spec.negatives) {
      if (combined.includes(neg)) {
        score -= 40;
      }
    }

    if (hits === 0 || score <= 0) continue;

    const lang = norm(b.language || "english");
    if (lang === "english") score += 20;
    else score -= 20;

    const cnt = Number(b.ratings_count || 0);
    if (cnt > 0) {
      score += Math.min(10, Math.log10(cnt + 1) * 2);
    }
    score += Number(b.rating || 0);

    const root = cleanRootTitle(b.title);
    scored.push({ book: b, score, root });
  }

  scored.sort((a, b) => b.score - a.score);

  const results = [];
  for (const item of scored) {
    if (item.root && seenRoots.has(item.root)) continue;
    if (item.root) seenRoots.add(item.root);
    results.push(item.book);
    if (results.length >= n) break;
  }

  return results;
}
