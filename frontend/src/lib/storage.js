// storage.js
// ----------
// Storage helpers for browser localStorage.
// All data remains private on the user's device.

const FAVORITES_KEY = "bookwise_favorites";
const HISTORY_KEY = "bookwise_history";

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage might be full or disabled - fail silently, it's not critical.
  }
}

export function getFavorites() {
  return readList(FAVORITES_KEY);
}

export function isFavorite(favorites, bookId) {
  return favorites.some((b) => b.book_id === bookId);
}

export function toggleFavorite(favorites, book) {
  const exists = isFavorite(favorites, book.book_id);
  const next = exists
    ? favorites.filter((b) => b.book_id !== book.book_id)
    : [book, ...favorites];
  writeList(FAVORITES_KEY, next);
  return next;
}

export function getHistory() {
  return readList(HISTORY_KEY);
}

export function addToHistory(history, book) {
  // Most-recent-first, no duplicates, capped at 20 so it doesn't grow forever
  const next = [book, ...history.filter((b) => b.book_id !== book.book_id)].slice(0, 20);
  writeList(HISTORY_KEY, next);
  return next;
}

const PREFERENCES_KEY = "bookwise_preferences";

export function getPreferences() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasPreferences() {
  return Boolean(getPreferences());
}

export function setPreferences(prefs) {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {}
}

export function clearAll() {
  localStorage.removeItem(FAVORITES_KEY);
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(JOURNEY_KEY);
  localStorage.removeItem(PREFERENCES_KEY);
}

const NAME_KEY = "bookwise_user_name";

export function getUserName() {
  return localStorage.getItem(NAME_KEY) || "";
}

export function setUserName(name) {
  localStorage.setItem(NAME_KEY, name);
}

// ---------------------------------------------------------------------------
// Reading Journey
// ---------------------------------------------------------------------------
// One book lives in exactly one shelf at a time: "currentlyReading",
// "wantToRead", or "finished". Moving a book shelves just removes it from
// wherever it was and re-adds it to the new shelf, stamping the date.

const JOURNEY_KEY = "bookwise_journey";
export const SHELVES = ["currentlyReading", "wantToRead", "finished"];

function emptyJourney() {
  return { currentlyReading: [], wantToRead: [], finished: [] };
}

export function getJourney() {
  try {
    const raw = localStorage.getItem(JOURNEY_KEY);
    if (!raw) return emptyJourney();
    const parsed = JSON.parse(raw);
    return { ...emptyJourney(), ...parsed };
  } catch {
    return emptyJourney();
  }
}

function writeJourney(journey) {
  try {
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(journey));
  } catch {
    // Storage might be full or disabled.
  }
}

export function shelfOf(journey, bookId) {
  for (const shelf of SHELVES) {
    if (journey[shelf].some((b) => b.book_id === bookId)) return shelf;
  }
  return null;
}

// Moves (or adds) a book onto `toShelf`, removing it from any other shelf
// it was previously on. Stamps addedAt on first add, finishedAt when it
// lands on "finished". Preserves an existing myRating if the book already
// had one.
export function moveToShelf(journey, book, toShelf) {
  const existing = SHELVES.map((s) => journey[s].find((b) => b.book_id === book.book_id))
    .find(Boolean);

  const next = emptyJourney();
  for (const shelf of SHELVES) {
    next[shelf] = journey[shelf].filter((b) => b.book_id !== book.book_id);
  }

  const entry = {
    ...book,
    addedAt: existing?.addedAt || new Date().toISOString(),
    myRating: existing?.myRating ?? null,
    finishedAt: toShelf === "finished" ? (existing?.finishedAt || new Date().toISOString()) : null,
  };
  next[toShelf] = [entry, ...next[toShelf]];
  writeJourney(next);
  return next;
}

export function removeFromJourney(journey, bookId) {
  const next = emptyJourney();
  for (const shelf of SHELVES) {
    next[shelf] = journey[shelf].filter((b) => b.book_id !== bookId);
  }
  writeJourney(next);
  return next;
}

export function rateFinishedBook(journey, bookId, rating) {
  const next = { ...journey, finished: journey.finished.map((b) => (
    b.book_id === bookId ? { ...b, myRating: rating } : b
  )) };
  writeJourney(next);
  return next;
}
