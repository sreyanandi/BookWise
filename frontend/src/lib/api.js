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

export async function getPopular(n = 6, genre = null, yearMin = null, yearMax = null, language = null, offset = 0) {
  try {
    let url = `${BASE_URL}/popular?n=${n}&offset=${offset}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    if (yearMin) url += `&year_min=${yearMin}`;
    if (yearMax) url += `&year_max=${yearMax}`;
    if (language && language !== "all") url += `&language=${encodeURIComponent(language)}`;
    return await fetchWithCache(url);
  } catch {}

  let filtered = catalog;

  // Language filter
  if (language && language !== "all") {
    filtered = filtered.filter((b) => norm(b.language) === norm(language));
  }

  // Genre filter
  if (genre && genre !== "all") {
    const genreList = String(genre).split(",").map((g) => norm(g).trim()).filter(Boolean);
    if (genreList.length > 0) {
      filtered = filtered.filter((b) => {
        const bg = norm(b.genres);
        return genreList.some((g) => {
          const gSpaced = g.replace("-", " ");
          return bg.includes(g) || bg.includes(gSpaced);
        });
      });
    }
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
  try {
    let url = `${BASE_URL}/worldwide?n=${n}&offset=${offset}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    if (yearMin) url += `&year_min=${yearMin}`;
    if (yearMax) url += `&year_max=${yearMax}`;
    if (language && language !== "all") url += `&language=${encodeURIComponent(language)}`;
    return await fetchWithCache(url);
  } catch {}

  let filtered = catalog;

  // Language filter
  if (language && language !== "all") {
    filtered = filtered.filter((b) => norm(b.language) === norm(language));
  }

  // Genre filter
  if (genre && genre !== "all") {
    const genreList = String(genre).split(",").map((g) => norm(g).trim()).filter(Boolean);
    if (genreList.length > 0) {
      filtered = filtered.filter((b) => {
        const bg = norm(b.genres);
        return genreList.some((g) => {
          const gSpaced = g.replace("-", " ");
          return bg.includes(g) || bg.includes(gSpaced);
        });
      });
    }
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
    const matched = catalog.filter((b) => targetGenres.some((g) => norm(b.genres).includes(g)));
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
    const g = norm(genre);
    latest = latest.filter((b) => norm(b.genres).includes(g));
  }
  return latest.slice(0, n);
}

export async function searchByDescription(text, n = 10) {
  try {
    const url = `${BASE_URL}/search_by_text?q=${encodeURIComponent(text)}&n=${n}`;
    return await fetchWithCache(url);
  } catch {}

  const terms = norm(text).split(/\s+/).filter((w) => w.length > 2);
  const scored = catalog
    .map((b) => {
      const combined = `${norm(b.title)} ${norm(b.authors)} ${norm(b.genres)}`;
      const score = terms.reduce((acc, term) => (combined.includes(term) ? acc + 1 : acc), 0);
      return { book: b, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.book)
    .slice(0, n);

  if (scored.length > 0) return scored;
  return catalog.slice(0, n);
}

const MOOD_MAP = {
  happy: ["humor", "comedy", "ya", "adventure", "fun"],
  sad: ["drama", "classics", "historical-fiction", "tragedy"],
  romantic: ["romance", "contemporary", "love"],
  curious: ["mystery", "thriller", "science", "non-fiction"],
  adventurous: ["adventure", "fantasy", "magic", "quest"],
  dark: ["horror", "thriller", "dark", "crime", "dystopian"],
  peaceful: ["poetry", "classics", "philosophy", "gentle"],
  motivated: ["biography", "memoir", "self-help", "nonfiction"],
};

export async function getMoodRecommendations(mood, n = 8) {
  try {
    const url = `${BASE_URL}/mood?mood=${encodeURIComponent(mood)}&n=${n}`;
    return await fetchWithCache(url);
  } catch {}

  const tags = MOOD_MAP[norm(mood)] || [norm(mood)];
  const matched = catalog
    .filter((b) => tags.some((t) => norm(b.genres).includes(t)))
    .slice(0, n);

  return matched.length > 0 ? matched : catalog.slice(0, n);
}
