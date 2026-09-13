// api.js
// ------
// High-performance API client with instant preloaded catalog and backend / Open Library integration.

import catalog from "../data/catalog.json";
import { getSubjectWorks, getSimilarBySubject, searchOpenLibrary } from "./openLibrary";

const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const apiCache = new Map();

// Helper to fetch with timeout
async function fetchWithTimeout(url, timeoutMs = 2500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Normalize text for matching
function norm(str) {
  return String(str || "").toLowerCase().trim();
}

export async function searchBook(query) {
  const q = norm(query);
  if (!q) throw new Error("Empty search query");

  // 1. Try local catalog first for instant response
  const catalogMatch = catalog.find(
    (b) => norm(b.title).includes(q) || norm(b.authors).includes(q)
  );
  if (catalogMatch) {
    return catalogMatch;
  }

  // 2. If backend URL is defined, try backend
  if (BASE_URL) {
    try {
      return await fetchWithTimeout(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
    } catch {}
  }

  // 3. Fallback to Open Library
  return await searchOpenLibrary(query);
}

export async function getRecommendations(title, n = 6, genre = null) {
  // 1. If backend URL is defined, try backend
  if (BASE_URL) {
    try {
      return await fetchWithTimeout(
        `${BASE_URL}/recommend?title=${encodeURIComponent(title)}&n=${n}${genre ? `&genre=${encodeURIComponent(genre)}` : ""}`
      );
    } catch {}
  }

  // 2. Instant catalog recommendations based on target book genres
  const target = catalog.find((b) => norm(b.title) === norm(title)) || catalog.find((b) => norm(b.title).includes(norm(title)));
  const targetGenres = target && target.genres ? target.genres.split(" ").filter(Boolean) : (genre ? [genre] : ["fiction"]);

  const recs = catalog
    .filter((b) => norm(b.title) !== norm(title))
    .filter((b) => {
      const bGenres = b.genres || "";
      return targetGenres.some((g) => bGenres.includes(g));
    })
    .slice(0, n);

  if (recs.length > 0) {
    return { recommendations: recs };
  }

  // 3. Fallback to Open Library
  try {
    const olRecs = await getSimilarBySubject(genre || "fiction", title, n);
    return { recommendations: olRecs };
  } catch {
    return { recommendations: catalog.slice(0, n) };
  }
}

export async function getPopular(n = 36, genre = null, yearMin = null, yearMax = null, language = null, offset = 0) {
  // 1. If backend URL is defined, try backend
  if (BASE_URL) {
    try {
      let url = `${BASE_URL}/popular?n=${n}&offset=${offset}`;
      if (genre) url += `&genre=${encodeURIComponent(genre)}`;
      if (yearMin) url += `&year_min=${yearMin}`;
      if (yearMax) url += `&year_max=${yearMax}`;
      return await fetchWithTimeout(url);
    } catch {}
  }

  // 2. Serve from preloaded catalog instantly
  let filtered = catalog;

  if (genre && genre !== "all") {
    const g = norm(genre).replace("-", " ");
    filtered = filtered.filter((b) => norm(b.genres).includes(g) || norm(b.genres).includes(norm(genre)));
  }

  if (yearMin) {
    filtered = filtered.filter((b) => b.year && b.year >= yearMin);
  }

  if (yearMax) {
    filtered = filtered.filter((b) => b.year && b.year <= yearMax);
  }

  const results = filtered.slice(offset, offset + n);
  if (results.length > 0) {
    return results;
  }

  // Fallback if filter produces few results
  return catalog.slice(0, n);
}

export async function getWorldwide(n = 24, genre = null, yearMin = null, yearMax = null, language = null, offset = 0) {
  // 1. If backend is configured, try it
  if (BASE_URL) {
    try {
      let url = `${BASE_URL}/worldwide?n=${n}&offset=${offset}`;
      if (genre) url += `&genre=${encodeURIComponent(genre)}`;
      if (yearMin) url += `&year_min=${yearMin}`;
      if (yearMax) url += `&year_max=${yearMax}`;
      return await fetchWithTimeout(url);
    } catch {}
  }

  // 2. Filter local catalog
  let filtered = catalog;
  if (genre && genre !== "all") {
    const g = norm(genre).replace("-", " ");
    filtered = filtered.filter((b) => norm(b.genres).includes(g) || norm(b.genres).includes(norm(genre)));
  }
  if (yearMin) {
    filtered = filtered.filter((b) => b.year && b.year >= yearMin);
  }
  if (yearMax) {
    filtered = filtered.filter((b) => b.year && b.year <= yearMax);
  }

  const page = filtered.slice(offset, offset + n);
  if (page.length > 0) {
    return page;
  }

  // 3. Fallback to Open Library subject works
  try {
    const res = await getSubjectWorks(genre || "fiction", n, offset);
    if (res.books && res.books.length > 0) return res.books;
  } catch {}

  return catalog.slice(0, n);
}

export async function getPersonalized(genres = null, vibe = null, n = 30) {
  if (BASE_URL) {
    try {
      return await fetchWithTimeout(`${BASE_URL}/personalized?n=${n}${genres ? `&genres=${encodeURIComponent(genres)}` : ""}${vibe ? `&vibe=${encodeURIComponent(vibe)}` : ""}`);
    } catch {}
  }

  const targetGenres = genres ? genres.split(",").map(norm) : [];
  if (targetGenres.length > 0) {
    const matched = catalog.filter((b) => targetGenres.some((g) => norm(b.genres).includes(g)));
    if (matched.length > 0) return matched.slice(0, n);
  }

  return catalog.slice(0, n);
}

export async function getLatest(n = 30, genre = null) {
  if (BASE_URL) {
    try {
      return await fetchWithTimeout(`${BASE_URL}/latest?n=${n}${genre ? `&genre=${encodeURIComponent(genre)}` : ""}`);
    } catch {}
  }

  // Filter latest releases in catalog (year >= 2015)
  const recent = catalog.filter((b) => b.year && b.year >= 2012).slice(0, n);
  return recent.length > 0 ? recent : catalog.slice(0, n);
}

export async function searchByDescription(text, n = 10) {
  if (BASE_URL) {
    try {
      return await fetchWithTimeout(`${BASE_URL}/search_by_text?q=${encodeURIComponent(text)}&n=${n}`);
    } catch {}
  }

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
  if (BASE_URL) {
    try {
      return await fetchWithTimeout(`${BASE_URL}/mood?mood=${encodeURIComponent(mood)}&n=${n}`);
    } catch {}
  }

  const tags = MOOD_MAP[norm(mood)] || [norm(mood)];
  const matched = catalog
    .filter((b) => tags.some((t) => norm(b.genres).includes(t)))
    .slice(0, n);

  return matched.length > 0 ? matched : catalog.slice(0, n);
}
