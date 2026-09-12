// openLibrary.js
// ---------------
// Open Library is a free, public catalog run by the Internet Archive, with
// basically every book ever published - any country, any language, any
// year from the 1800s through whatever was catalogued this week. No API
// key needed. We use it for 3 things our own small local dataset can't do:
//
//   1. Finding a book our local 10,000-book set doesn't have (worldwide fallback)
//   2. Finding "similar books" for that fallback case, by subject
//   3. Fetching a real, publisher-style summary for ANY book (ours never had these)

const OL_BASE = "https://openlibrary.org";
const OL_COVERS = "https://covers.openlibrary.org/b";

function coverUrl(coverId, size = "L") {
  return coverId ? `${OL_COVERS}/id/${coverId}-${size}.jpg` : null;
}

function slugifySubject(text) {
  return String(text || "fiction")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "fiction";
}

// Turns a raw Open Library search "doc" into the same shape our own
// BookCard/DetailPanel components already expect, so nothing downstream
// needs to know or care where a book came from.
function normalizeDoc(doc) {
  return {
    book_id: doc.key,                                   // e.g. "/works/OL27448W" - used as a stable id
    work_key: doc.key,
    title: doc.title,
    authors: (doc.author_name || ["Unknown"]).join(", "),
    year: doc.first_publish_year || null,
    rating: typeof doc.ratings_average === "number" ? doc.ratings_average : null,
    ratings_count: typeof doc.ratings_count === "number" ? doc.ratings_count : null,
    image_url: coverUrl(doc.cover_i),
    genres: (doc.subject || []).slice(0, 5).join(" ").toLowerCase(),
    source: "openlibrary",
  };
}

export async function searchOpenLibrary(query) {
  const url = `${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=5&fields=key,title,author_name,first_publish_year,cover_i,subject,ratings_average,ratings_count`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Open Library search failed");
  const data = await res.json();
  if (!data.docs || data.docs.length === 0) {
    throw new Error(`No worldwide match found for "${query}"`);
  }
  return normalizeDoc(data.docs[0]);
}

// Browses a whole subject/genre from Open Library's worldwide catalog
// used by CategoryPage's "Worldwide" tab and the quiz result screen, so the
// site isn't limited to our local 10,000-book dataset. Supports paging via
// `offset` so the person can keep clicking "Load more".
export async function getSubjectWorks(subject, limit = 24, offset = 0) {
  const slug = slugifySubject(subject);
  const url = `${OL_BASE}/subjects/${slug}.json?limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) return { books: [], hasMore: false };
  const data = await res.json();
  const works = data.works || [];
  const books = works.map((w) => ({
    book_id: w.key,
    work_key: w.key,
    title: w.title,
    authors: (w.authors || []).map((a) => a.name).join(", ") || "Unknown",
    year: w.first_publish_year || null,
    rating: null,
    ratings_count: null,
    image_url: coverUrl(w.cover_id),
    genres: subject,
    source: "openlibrary",
  }));
  const total = typeof data.work_count === "number" ? data.work_count : offset + books.length;
  return { books, hasMore: offset + books.length < total };
}

export async function getSimilarBySubject(subject, excludeTitle, n = 8) {
  const slug = slugifySubject(subject);
  const url = `${OL_BASE}/subjects/${slug}.json?limit=${n + 1}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.works || [])
    .filter((w) => w.title !== excludeTitle)
    .slice(0, n)
    .map((w) => ({
      book_id: w.key,
      work_key: w.key,
      title: w.title,
      authors: (w.authors || []).map((a) => a.name).join(", ") || "Unknown",
      year: w.first_publish_year || null,
      rating: null,
      ratings_count: null,
      image_url: coverUrl(w.cover_id),
      genres: subject,
      source: "openlibrary",
      reason: `Also filed under "${subject}" on Open Library`,
    }));
}

const descriptionCache = new Map();

function cleanDescriptionText(text) {
  if (!text) return null;
  let str = typeof text === "string" ? text : text.value || "";
  if (!str) return null;
  
  // Handle json stringified object
  if (str.startsWith("{") && str.includes("value")) {
    try {
      const parsed = JSON.parse(str);
      str = parsed.value || str;
    } catch {}
  }
  
  // Strip HTML
  str = str.replace(/<[^>]+>/g, " ");
  // Strip wikitext bracket links [[Link|Text]] -> Text
  str = str.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1");
  // Strip footnotes [1], [edit]
  str = str.replace(/\[\d+\]/g, "").replace(/\[edit\]/gi, "");
  // Clean whitespace
  str = str.replace(/\s+/g, " ").trim();
  
  return str.length > 20 ? str : null;
}

export async function getDescription(workKeyOrBook) {
  if (!workKeyOrBook) return null;
  
  const cacheKey = typeof workKeyOrBook === "object"
    ? (workKeyOrBook.work_key || `${workKeyOrBook.title}-${workKeyOrBook.authors}`)
    : workKeyOrBook;
    
  if (descriptionCache.has(cacheKey)) {
    return descriptionCache.get(cacheKey);
  }

  // If book object already has a valid blurb/description from our backend, use it
  if (typeof workKeyOrBook === "object" && workKeyOrBook.description && workKeyOrBook.description.length > 40) {
    const cleaned = cleanDescriptionText(workKeyOrBook.description);
    if (cleaned) {
      descriptionCache.set(cacheKey, cleaned);
      return cleaned;
    }
  }

  const fetchPromise = (async () => {
    let workKey = typeof workKeyOrBook === "object" ? workKeyOrBook.work_key : workKeyOrBook;
    if (typeof workKeyOrBook === "object" && !workKey) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 2000);
        const found = await searchOpenLibrary(`${workKeyOrBook.title} ${workKeyOrBook.authors || ""}`);
        clearTimeout(tid);
        workKey = found ? found.work_key : null;
      } catch {
        workKey = null;
      }
    }
    
    if (!workKey) return null;

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${OL_BASE}${workKey}.json`, { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) return null;
      const data = await res.json();
      return cleanDescriptionText(data.description);
    } catch {
      return null;
    }
  })();

  descriptionCache.set(cacheKey, fetchPromise);
  const result = await fetchPromise;
  descriptionCache.set(cacheKey, result);
  return result;
}

