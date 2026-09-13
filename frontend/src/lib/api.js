// api.js
// ------
// Central client for the FastAPI backend service with Open Library fallback.

import { getSubjectWorks, getSimilarBySubject, searchOpenLibrary } from "./openLibrary";

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const apiCache = new Map();

async function fetchWithCache(url) {
  if (apiCache.has(url)) {
    return apiCache.get(url);
  }
  const promise = fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      apiCache.delete(url);
      throw err;
    });

  apiCache.set(url, promise);
  return promise;
}

export async function searchBook(query) {
  try {
    return await fetchWithCache(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
  } catch (err) {
    console.warn("Backend API unavailable, using Open Library fallback for searchBook", err);
    return await searchOpenLibrary(query);
  }
}

export async function getRecommendations(title, n = 4, genre = null) {
  try {
    let url = `${BASE_URL}/recommend?title=${encodeURIComponent(title)}&n=${n}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    return await fetchWithCache(url);
  } catch (err) {
    console.warn("Backend API unavailable, using Open Library fallback for getRecommendations", err);
    const recs = await getSimilarBySubject(genre || "fiction", title, n);
    return { recommendations: recs };
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
  } catch (err) {
    console.warn("Backend API unavailable, using Open Library fallback for getPopular", err);
    const res = await getSubjectWorks(genre || "bestseller", n, offset);
    return res.books || [];
  }
}

export async function getWorldwide(n = 24, genre = null, yearMin = null, yearMax = null, language = null, offset = 0) {
  try {
    let url = `${BASE_URL}/worldwide?n=${n}&offset=${offset}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    if (yearMin) url += `&year_min=${yearMin}`;
    if (yearMax) url += `&year_max=${yearMax}`;
    if (language && language !== "all") url += `&language=${encodeURIComponent(language)}`;
    return await fetchWithCache(url);
  } catch (err) {
    console.warn("Backend API unavailable, using Open Library fallback for getWorldwide", err);
    const res = await getSubjectWorks(genre || "fiction", n, offset);
    return res.books || [];
  }
}

export async function getPersonalized(genres = null, vibe = null, n = 30) {
  try {
    let url = `${BASE_URL}/personalized?n=${n}`;
    if (genres) url += `&genres=${encodeURIComponent(genres)}`;
    if (vibe) url += `&vibe=${encodeURIComponent(vibe)}`;
    return await fetchWithCache(url);
  } catch (err) {
    console.warn("Backend API unavailable, using Open Library fallback for getPersonalized", err);
    const subject = (genres || vibe || "popular").split(",")[0];
    const res = await getSubjectWorks(subject, n);
    return res.books || [];
  }
}

export async function getLatest(n = 30, genre = null) {
  try {
    let url = `${BASE_URL}/latest?n=${n}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    return await fetchWithCache(url);
  } catch (err) {
    console.warn("Backend API unavailable, using Open Library fallback for getLatest", err);
    const res = await getSubjectWorks(genre || "fiction", n);
    return res.books || [];
  }
}

export async function searchByDescription(text, n = 10) {
  try {
    const url = `${BASE_URL}/search_by_text?q=${encodeURIComponent(text)}&n=${n}`;
    return await fetchWithCache(url);
  } catch (err) {
    console.warn("Backend API unavailable, using Open Library fallback for searchByDescription", err);
    try {
      const doc = await searchOpenLibrary(text);
      return [doc];
    } catch {
      const res = await getSubjectWorks("fiction", n);
      return res.books || [];
    }
  }
}

export async function getMoodRecommendations(mood, n = 8) {
  try {
    const url = `${BASE_URL}/mood?mood=${encodeURIComponent(mood)}&n=${n}`;
    return await fetchWithCache(url);
  } catch (err) {
    console.warn("Backend API unavailable, using Open Library fallback for getMoodRecommendations", err);
    const moodSubjectMap = {
      happy: "humor",
      sad: "drama",
      romantic: "romance",
      curious: "mystery",
      adventurous: "adventure",
      dark: "thriller",
      peaceful: "poetry",
      motivated: "biography",
    };
    const subject = moodSubjectMap[mood.toLowerCase()] || mood || "fiction";
    const res = await getSubjectWorks(subject, n);
    return res.books || [];
  }
}
