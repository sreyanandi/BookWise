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

export async function searchBook(query) {
  const q = norm(query);
  if (!q) throw new Error("Empty search query");

  // 1. Check local catalog first
  const match = catalog.find((b) => norm(b.title).includes(q) || norm(b.authors).includes(q));
  if (match) return match;

  // 2. Try backend
  try {
    return await fetchWithCache(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
  } catch {}

  // 3. Fallback to Open Library
  return await searchOpenLibrary(query);
}

export async function getRecommendations(title, n = 4, genre = null) {
  try {
    let url = `${BASE_URL}/recommend?title=${encodeURIComponent(title)}&n=${n}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    return await fetchWithCache(url);
  } catch {}

  const target = catalog.find((b) => norm(b.title) === norm(title)) || catalog.find((b) => norm(b.title).includes(norm(title)));
  const targetGenres = target && target.genres ? target.genres.split(" ").filter(Boolean) : (genre ? [genre] : ["fiction"]);

  const recs = catalog
    .filter((b) => norm(b.title) !== norm(title))
    .filter((b) => {
      const bGenres = b.genres || "";
      return targetGenres.some((g) => bGenres.includes(g));
    })
    .slice(0, n);

  if (recs.length > 0) return { recommendations: recs };

  try {
    const olRecs = await getSimilarBySubject(genre || "fiction", title, n);
    return { recommendations: olRecs };
  } catch {
    return { recommendations: catalog.slice(0, n) };
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
