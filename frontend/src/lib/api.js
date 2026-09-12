// api.js
// ------
// Central client for the FastAPI backend service.

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const apiCache = new Map();

async function fetchWithCache(url) {
  if (apiCache.has(url)) {
    return apiCache.get(url);
  }
  const promise = fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }).catch((err) => {
    apiCache.delete(url);
    throw err;
  });
  
  apiCache.set(url, promise);
  return promise;
}

export async function searchBook(query) {
  return fetchWithCache(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
}

export async function getRecommendations(title, n = 4, genre = null) {
  let url = `${BASE_URL}/recommend?title=${encodeURIComponent(title)}&n=${n}`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  return fetchWithCache(url);
}

export async function getPopular(n = 6, genre = null, yearMin = null, yearMax = null, language = null, offset = 0) {
  let url = `${BASE_URL}/popular?n=${n}&offset=${offset}`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  if (yearMin) url += `&year_min=${yearMin}`;
  if (yearMax) url += `&year_max=${yearMax}`;
  if (language && language !== "all") url += `&language=${encodeURIComponent(language)}`;
  return fetchWithCache(url);
}

export async function getWorldwide(n = 24, genre = null, yearMin = null, yearMax = null, language = null, offset = 0) {
  let url = `${BASE_URL}/worldwide?n=${n}&offset=${offset}`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  if (yearMin) url += `&year_min=${yearMin}`;
  if (yearMax) url += `&year_max=${yearMax}`;
  if (language && language !== "all") url += `&language=${encodeURIComponent(language)}`;
  return fetchWithCache(url);
}

export async function getPersonalized(genres = null, vibe = null, n = 30) {
  let url = `${BASE_URL}/personalized?n=${n}`;
  if (genres) url += `&genres=${encodeURIComponent(genres)}`;
  if (vibe) url += `&vibe=${encodeURIComponent(vibe)}`;
  return fetchWithCache(url);
}

export async function getLatest(n = 30, genre = null) {
  let url = `${BASE_URL}/latest?n=${n}`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  return fetchWithCache(url);
}

export async function searchByDescription(text, n = 10) {
  const url = `${BASE_URL}/search_by_text?q=${encodeURIComponent(text)}&n=${n}`;
  return fetchWithCache(url);
}

export async function getMoodRecommendations(mood, n = 8) {
  const url = `${BASE_URL}/mood?mood=${encodeURIComponent(mood)}&n=${n}`;
  return fetchWithCache(url);
}

