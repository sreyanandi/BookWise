"""
recommend.py
-------------
High-performance SQLite & FTS5 backed book recommendation & search engine.
Operates directly on data/processed/books.db (2.36M+ UCSD books + Kaggle dataset).
"""

import os
import re
import json
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "..", "data", "processed", "books.db"))


def get_db_connection():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database not found at {DB_PATH}. Run build_unified_database.py first.")
    db_uri = f"file:{os.path.abspath(DB_PATH)}?mode=ro"
    conn = sqlite3.connect(db_uri, uri=True, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


_MEMORY_CACHE = {}


def canonical_book_key(title, author=""):
    """
    Returns a normalized (canonical_title, primary_author) tuple to detect and
    eliminate duplicate editions, translations, prints, and box sets.
    """
    t = str(title or "").lower().strip()
    # Strip parenthetical annotations e.g. (The Hunger Games, #1), (Book 1)
    t = re.sub(r"\(.*?\)", "", t)
    # Strip subtitle after colon if main title is sufficiently descriptive
    if ":" in t:
        parts = t.split(":")
        if len(parts[0].strip()) >= 3:
            t = parts[0]
    # Strip edition/volume markers
    t = re.sub(r"\b(series|trilogy|edition|version|volume|vol\.?|book\s*\d+|part\s*\d+)\b.*", "", t)
    # Retain only letters and numbers
    t = re.sub(r"[^a-z0-9]", "", t)
    if not t:
        t = str(title or "").lower().strip()

    # Primary author token
    a = str(author or "").lower().strip()
    a_first = a.split(",")[0].split("&")[0].split(" and ")[0].strip()
    a_clean = re.sub(r"[^a-z]", "", a_first)

    return (t, a_clean)


def _deduplicate_books(books, n=10, max_per_series=2, exclude_keys=None):
    """Filters a list of book dictionaries so only unique titles are kept."""
    seen_keys = set(exclude_keys or [])
    series_counts = {}
    unique = []

    for b in books:
        if not b or not b.get("title"):
            continue
        key = canonical_book_key(b["title"], b.get("authors", ""))
        if key in seen_keys:
            continue

        s_key = _series_key(b["title"])
        if s_key and series_counts.get(s_key, 0) >= max_per_series:
            continue

        seen_keys.add(key)
        if s_key:
            series_counts[s_key] = series_counts.get(s_key, 0) + 1

        unique.append(b)
        if len(unique) >= n:
            break

    return unique


def _format_book_row(row):
    """Converts a SQLite Row or dictionary into a normalized book dictionary."""
    if row is None:
        return None
    d = dict(row)
    
    image_url = (d.get("image_url") or "").strip()
    if "nophoto" in image_url:
        image_url = ""
    elif "images.gr-assets.com/books/" in image_url:
        suffix = image_url.split("images.gr-assets.com/books/")[-1]
        if "/" not in suffix:
            image_url = ""
        
    raw_year = d.get("publication_year")
    pyear = None
    try:
        if raw_year is not None:
            y = int(raw_year)
            if 0 < y <= 2026:
                pyear = y
    except Exception:
        pyear = None

    raw_rating = d.get("average_rating")
    rating_val = 0.0
    try:
        if raw_rating is not None:
            r = float(raw_rating)
            if 0.0 < r <= 5.0:
                rating_val = round(r, 2)
    except Exception:
        rating_val = 0.0

    raw_desc = str(d.get("description") or "").strip()
    # Strip alternate cover preambles
    clean_desc = re.sub(r"^An alternative cover for this ASIN can be found here[\s.:-]*", "", raw_desc, flags=re.IGNORECASE)
    clean_desc = re.sub(r"^Alternate Cover Edition (?:for|of) (?:ASIN|ISBN)[\w\s.:-]*", "", clean_desc, flags=re.IGNORECASE)
    clean_desc = clean_desc.strip()

    return {
        "book_id": str(d.get("book_id", "")),
        "title": d.get("title", ""),
        "authors": d.get("authors") or "Unknown Author",
        "genres": d.get("genres") or "",
        "publication_year": pyear,
        "year": pyear,
        "original_publication_year": pyear,
        "average_rating": rating_val,
        "rating": rating_val,
        "ratings_count": int(d.get("ratings_count") or 0),
        "image_url": image_url,
        "description": clean_desc,
        "similar_books": d.get("similar_books") or "[]",
        "source": d.get("source") or "ucsd",
    }


KNOWN_FRANCHISES = {
    "harry potter": "harry potter", "sorcerer's stone": "harry potter", "philosopher's stone": "harry potter",
    "chamber of secrets": "harry potter", "prisoner of azkaban": "harry potter", "goblet of fire": "harry potter",
    "order of the phoenix": "harry potter", "half-blood prince": "harry potter", "deathly hallows": "harry potter",
    "the hunger games": "hunger games", "hunger games": "hunger games", "catching fire": "hunger games", "mockingjay": "hunger games", "ballad of songbirds": "hunger games",
    "twilight": "twilight", "new moon": "twilight", "eclipse": "twilight", "breaking dawn": "twilight",
    "divergent": "divergent", "insurgent": "divergent", "allegiant": "divergent",
    "percy jackson": "percy jackson", "the lightning thief": "percy jackson",
    "the lord of the rings": "lord of the rings", "lord of the rings": "lord of the rings", "the fellowship of the ring": "lord of the rings", "the two towers": "lord of the rings", "the return of the king": "lord of the rings",
    "the hobbit": "hobbit", "hobbit": "hobbit",
    "a song of ice and fire": "game of thrones", "game of thrones": "game of thrones", "a clash of kings": "game of thrones", "a storm of swords": "game of thrones",
    "court of thorns and roses": "acotar", "acotar": "acotar",
    "chronicles of narnia": "narnia", "narnia": "narnia", "the lion, the witch": "narnia",
    "maze runner": "maze runner", "fifty shades": "fifty shades",
    "outlander": "outlander", "dune": "dune",
}


def _series_key(title):
    t_lower = str(title).lower()
    for phrase, s_name in KNOWN_FRANCHISES.items():
        if phrase in t_lower:
            return s_name
    match = re.search(r"\(([^,#]+)", str(title))
    if match:
        return match.group(1).strip().lower()
    return t_lower


def sanitize_fts_query(query):
    cleaned = re.sub(r'[^\w\s]', ' ', query)
    tokens = [t.strip() for t in cleaned.split() if t.strip()]
    if not tokens:
        return ""
    return " OR ".join(tokens)


def find_book(query, limit=1):
    """Find best-matching book for a given search title with indexed queries."""
    cache_key = f"find_{query}_{limit}"
    if cache_key in _MEMORY_CACHE:
        return _MEMORY_CACHE[cache_key]

    conn = get_db_connection()
    c = conn.cursor()
    
    query_str = str(query).strip()
    fetch_limit = limit * 4
    
    # 1. Exact match (case-insensitive)
    c.execute("SELECT * FROM books WHERE title = ? COLLATE NOCASE LIMIT ?", (query_str, fetch_limit))
    rows = c.fetchall()
    
    # 2. Title prefix match
    if not rows:
        c.execute("SELECT * FROM books WHERE title LIKE ? LIMIT ?", (f"{query_str}%", fetch_limit))
        rows = c.fetchall()
        
    # 3. Fast FTS title search
    if not rows:
        try:
            fts_q = sanitize_fts_query(query_str)
            if fts_q:
                c.execute("""
                    SELECT b.* 
                    FROM books_fts f
                    JOIN books b ON f.book_id = b.book_id
                    WHERE books_fts MATCH ?
                    ORDER BY rank
                    LIMIT ?
                """, (fts_q, fetch_limit))
                rows = c.fetchall()
        except Exception:
            pass

    # 4. General substring match fallback
    if not rows:
        c.execute("SELECT * FROM books WHERE title LIKE ? LIMIT ?", (f"%{query_str}%", fetch_limit))
        rows = c.fetchall()
            
    conn.close()
    unique_matches = _deduplicate_books([_format_book_row(r) for r in rows], n=limit, max_per_series=1)
    _MEMORY_CACHE[cache_key] = unique_matches
    return unique_matches


LANGUAGE_FILTERS = {
    "english": "(title NOT GLOB '*[\u0400-\u04ff\u0900-\u097f\u3040-\u30ff\u4e00-\u9fa5]*')",
    "spanish": "((title LIKE '% del %' OR title LIKE '% de la %' OR title LIKE '% los %' OR title LIKE '% las %' OR title LIKE 'El %' OR title LIKE 'La %' OR title LIKE 'Los %' OR title LIKE 'Las %' OR title LIKE '% para %' OR title LIKE '% por %' OR title LIKE '% una %' OR title LIKE '% con %') AND title NOT LIKE 'The %' AND title NOT LIKE '% the %' AND title NOT LIKE '% and %' AND title NOT LIKE '% of %')",
    "french": "((title LIKE 'Le %' OR title LIKE 'Les %' OR title LIKE \"L'%\" OR title LIKE '% du %' OR title LIKE '% des %' OR title LIKE '% dans %' OR title LIKE '% pour %') AND title NOT LIKE 'The %' AND title NOT LIKE '% the %' AND title NOT LIKE '% and %' AND title NOT LIKE '% of %')",
    "german": "((title LIKE 'Der %' OR title LIKE 'Das %' OR title LIKE 'Ein %' OR title LIKE 'Eine %' OR title LIKE '% der %' OR title LIKE '% des %' OR title LIKE '% und %' OR title LIKE '% für %' OR title LIKE '% mit %') AND title NOT LIKE 'The %' AND title NOT LIKE '% the %' AND title NOT LIKE '% and %' AND title NOT LIKE '% of %' AND title NOT LIKE '% to %' AND title NOT LIKE 'Die %')",
    "italian": "((title LIKE 'Il %' OR title LIKE 'Lo %' OR title LIKE 'Gli %' OR title LIKE '% del %' OR title LIKE '% della %' OR title LIKE '% delle %' OR title LIKE '% degli %' OR title LIKE '% nel %') AND title NOT LIKE 'The %' AND title NOT LIKE '% the %' AND title NOT LIKE '% and %' AND title NOT LIKE '% of %')",
    "portuguese": "((title LIKE 'O %' OR title LIKE 'Os %' OR title LIKE '% do %' OR title LIKE '% da %' OR title LIKE '% dos %' OR title LIKE '% das %' OR title LIKE '% com %') AND title NOT LIKE 'The %' AND title NOT LIKE '% the %' AND title NOT LIKE '% and %' AND title NOT LIKE '% of %' AND title NOT LIKE 'Do %' AND title NOT LIKE '% Do %' AND title NOT LIKE 'As %')",
    "japanese": "title GLOB '*[\u3040-\u30ff]*'",
    "chinese": "title GLOB '*[\u4e00-\u9fa5]*' AND title NOT GLOB '*[\u3040-\u30ff]*'",
    "russian": "title GLOB '*[\u0400-\u04ff]*'",
    "hindi": "(title GLOB '*[\u0900-\u097f]*' OR authors GLOB '*[\u0900-\u097f]*')",
}


def query_books_catalog(genre_filter=None, year_min=None, year_max=None, language=None, n=36, offset=0):
    """
    Unified, ultra-fast catalog query engine.
    For non-English languages (Bengali, Kannada, Hindi, Spanish, French, Japanese, Russian, etc.),
    joins with the indexed book_languages table for sub-10ms response times.
    For All/English, uses idx_books_ratings_count.
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    lang_key = (language or "").strip().lower()
    is_specific_lang = lang_key and lang_key not in ("all", "english")
    
    fetch_limit = min(max(n * 4, 60), 300)
    
    if is_specific_lang:
        where_clauses = ["bl.language = ?"]
        params = [lang_key]
        
        if year_min is not None:
            where_clauses.append("bl.publication_year >= ?")
            params.append(int(year_min))
        if year_max is not None:
            where_clauses.append("bl.publication_year <= ?")
            params.append(int(year_max))
            
        genre_clauses = []
        if genre_filter:
            genres = [g.strip().lower() for g in str(genre_filter).split(",") if g.strip()]
            if genres:
                genre_clauses = ["LOWER(b.genres) LIKE ?"] * len(genres)
                where_clauses.append(f"({' OR '.join(genre_clauses)})")
                params.extend([f"%{g}%" for g in genres])
                
        where_sql = f"WHERE {' AND '.join(where_clauses)}"
        sql = f"""
            SELECT b.* FROM book_languages bl
            JOIN books b ON bl.book_id = b.book_id
            {where_sql}
            ORDER BY bl.ratings_count DESC
            LIMIT ? OFFSET ?
        """
        exec_params = list(params) + [fetch_limit, int(offset)]
        c.execute(sql, exec_params)
        rows = c.fetchall()
        
        # If strict genre filter returned fewer than 4 books, fallback to all books in that language
        if len(rows) < 4 and genre_clauses:
            fallback_where = ["bl.language = ?"]
            fallback_params = [lang_key]
            if year_min is not None:
                fallback_where.append("bl.publication_year >= ?")
                fallback_params.append(int(year_min))
            if year_max is not None:
                fallback_where.append("bl.publication_year <= ?")
                fallback_params.append(int(year_max))
            fallback_sql = f"""
                SELECT b.* FROM book_languages bl
                JOIN books b ON bl.book_id = b.book_id
                WHERE {' AND '.join(fallback_where)}
                ORDER BY bl.ratings_count DESC
                LIMIT ? OFFSET ?
            """
            c.execute(fallback_sql, fallback_params + [fetch_limit, int(offset)])
            rows = c.fetchall()
    else:
        where_clauses = []
        params = []
        
        if genre_filter:
            genres = [g.strip().lower() for g in str(genre_filter).split(",") if g.strip()]
            if genres:
                genre_conditions = ["LOWER(genres) LIKE ?"] * len(genres)
                where_clauses.append(f"({' OR '.join(genre_conditions)})")
                params.extend([f"%{g}%" for g in genres])
                
        if year_min is not None or year_max is not None:
            where_clauses.append("publication_year > 0")
            where_clauses.append("publication_year <= 2026")
            if year_min is not None:
                where_clauses.append("publication_year >= ?")
                params.append(int(year_min))
            if year_max is not None:
                where_clauses.append("publication_year <= ?")
                params.append(int(year_max))
                
        if lang_key == "english":
            where_clauses.append("book_id NOT IN (SELECT book_id FROM book_languages)")
            
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        exec_params = list(params) + [fetch_limit, int(offset)]
        
        try:
            sql = f"SELECT * FROM books INDEXED BY idx_books_ratings_count {where_sql} ORDER BY ratings_count DESC LIMIT ? OFFSET ?"
            c.execute(sql, exec_params)
            rows = c.fetchall()
        except Exception:
            sql = f"SELECT * FROM books {where_sql} ORDER BY ratings_count DESC LIMIT ? OFFSET ?"
            c.execute(sql, exec_params)
            rows = c.fetchall()
            
    conn.close()
    return _deduplicate_books([_format_book_row(r) for r in rows], n=n, max_per_series=1)


def get_popular(genre_filter=None, year_min=None, year_max=None, language=None, n=10, offset=0):
    """Sort books by popularity with optional genre, era/year, language, and offset pagination."""
    cache_key = f"popular_{genre_filter}_{year_min}_{year_max}_{language}_{n}_{offset}"
    if cache_key in _MEMORY_CACHE:
        return _MEMORY_CACHE[cache_key]

    unique_books = query_books_catalog(
        genre_filter=genre_filter,
        year_min=year_min,
        year_max=year_max,
        language=language,
        n=n,
        offset=offset
    )
    _MEMORY_CACHE[cache_key] = unique_books
    return unique_books


def get_worldwide(genre_filter=None, year_min=None, year_max=None, language=None, n=36, offset=0):
    """
    Returns books from the unified catalog across all historical eras and languages.
    Uses index-accelerated sorting to ensure instantaneous loading across all criteria.
    """
    cache_key = f"worldwide_{genre_filter}_{year_min}_{year_max}_{language}_{n}_{offset}"
    if cache_key in _MEMORY_CACHE:
        return _MEMORY_CACHE[cache_key]

    unique_books = query_books_catalog(
        genre_filter=genre_filter,
        year_min=year_min,
        year_max=year_max,
        language=language,
        n=n,
        offset=offset
    )
    _MEMORY_CACHE[cache_key] = unique_books
    return unique_books


def recommend(title_query, n=5, max_per_series=2, genre_filter=None, blend=0.6):
    """
    Find recommendations for a title using graph similarity combined with
    genre overlap, popularity ranking, and canonical deduplication.
    """
    cache_key = f"rec_{title_query}_{n}_{genre_filter}"
    if cache_key in _MEMORY_CACHE:
        return _MEMORY_CACHE[cache_key]

    matches = find_book(title_query, limit=1)
    if not matches:
        return None, []
        
    source_book = matches[0]
    source_key = canonical_book_key(source_book["title"], source_book.get("authors", ""))
    
    conn = get_db_connection()
    c = conn.cursor()
    
    candidates = []
    seen_ids = {str(source_book["book_id"])}
    
    sim_ids = []
    try:
        if source_book.get("similar_books"):
            sim_ids = json.loads(source_book["similar_books"])
    except Exception:
        sim_ids = []
        
    if sim_ids:
        placeholders = ",".join(["?"] * len(sim_ids))
        c.execute(f"SELECT * FROM books WHERE book_id IN ({placeholders})", sim_ids)
        for r in c.fetchall():
            book = _format_book_row(r)
            if str(book["book_id"]) not in seen_ids:
                candidates.append((book, 0.90, "Readers also enjoyed this book"))
                seen_ids.add(str(book["book_id"]))
                
    if len(candidates) < n * 5:
        source_genres = [g for g in source_book["genres"].split() if g]
        top_genre = genre_filter or (source_genres[0] if source_genres else None)
        
        if top_genre:
            c.execute("""
                SELECT * FROM books 
                WHERE LOWER(genres) LIKE ? AND book_id != ?
                ORDER BY ratings_count DESC LIMIT ?
            """, (f"%{top_genre.lower()}%", source_book["book_id"], n * 8))
            for r in c.fetchall():
                book = _format_book_row(r)
                if str(book["book_id"]) not in seen_ids:
                    reason = f"Shares the genre: {top_genre}"
                    candidates.append((book, 0.75, reason))
                    seen_ids.add(str(book["book_id"]))
                    
    conn.close()
    
    series_counts = {}
    seen_canonical_keys = {source_key}
    recommendations = []
    
    for book, base_sim, reason in candidates:
        if genre_filter and genre_filter.lower() not in book["genres"].lower():
            continue
            
        b_key = canonical_book_key(book["title"], book.get("authors", ""))
        if b_key in seen_canonical_keys:
            continue
            
        s_key = _series_key(book["title"])
        if series_counts.get(s_key, 0) >= max_per_series:
            continue
            
        seen_canonical_keys.add(b_key)
        book_copy = dict(book)
        book_copy["similarity"] = round(base_sim, 2)
        book_copy["reason"] = reason
        recommendations.append(book_copy)
        series_counts[s_key] = series_counts.get(s_key, 0) + 1
        
        if len(recommendations) >= n:
            break
            
    result = (source_book, recommendations)
    _MEMORY_CACHE[cache_key] = result
    return result


def search_by_text(query_text, n=10, genre_filter=None, exclude_ids=None):
    """
    Free-text search using SQLite FTS5 BM25 text relevance or indexed title search with deduplication.
    """
    cache_key = f"text_{query_text}_{n}_{genre_filter}"
    if cache_key in _MEMORY_CACHE:
        return _MEMORY_CACHE[cache_key]

    conn = get_db_connection()
    c = conn.cursor()
    
    exclude_ids = exclude_ids or set()
    fetch_limit = min(max(n * 4, 30), 150)
    
    try:
        fts_q = sanitize_fts_query(query_text)
        if not fts_q:
            conn.close()
            return []
            
        sql = """
            SELECT b.*, f.rank
            FROM books_fts f
            JOIN books b ON f.book_id = b.book_id
            WHERE books_fts MATCH ?
        """
        params = [fts_q]
        
        if genre_filter:
            genres = [g.strip().lower() for g in str(genre_filter).split(",") if g.strip()]
            if genres:
                genre_conditions = ["LOWER(b.genres) LIKE ?"] * len(genres)
                sql += f" AND ({' OR '.join(genre_conditions)})"
                params.extend([f"%{g}%" for g in genres])
            
        sql += " ORDER BY f.rank LIMIT ?"
        params.append(fetch_limit)
        
        c.execute(sql, params)
        rows = c.fetchall()
        
        candidates = []
        for r in rows:
            book = _format_book_row(r)
            if str(book["book_id"]) in exclude_ids:
                continue
            rank_val = abs(float(r["rank"])) if "rank" in r.keys() else 1.0
            sim_score = round(max(0.50, min(0.99, 1.0 - (rank_val / 20.0))), 2)
            book["similarity"] = sim_score
            candidates.append(book)
                
        conn.close()
        results = _deduplicate_books(candidates, n=n, max_per_series=2)
        _MEMORY_CACHE[cache_key] = results
        return results
    except Exception:
        where_extra = ""
        params_extra = []
        if genre_filter:
            genres = [g.strip().lower() for g in str(genre_filter).split(",") if g.strip()]
            if genres:
                genre_conditions = ["LOWER(genres) LIKE ?"] * len(genres)
                where_extra = f" AND ({' OR '.join(genre_conditions)})"
                params_extra = [f"%{g}%" for g in genres]
        
        c.execute(f"SELECT * FROM books WHERE (title LIKE ? OR genres LIKE ?){where_extra} ORDER BY ratings_count DESC LIMIT ?",
                  (f"%{query_text}%", f"%{query_text}%", *params_extra, fetch_limit))
        rows = c.fetchall()
        conn.close()
        results = _deduplicate_books([_format_book_row(r) for r in rows], n=n, max_per_series=2)
        _MEMORY_CACHE[cache_key] = results
        return results


MOOD_SOUPS = {
    "happy": "uplifting cheerful feel good humor comedy fun light hearted joyful",
    "sad": "emotional heartbreaking grief loss tearjerker sorrow literary fiction",
    "romantic": "romance love passion relationship swoon hearted yearning",
    "curious": "mystery intriguing puzzle discovery curiosity non-fiction science ideas",
    "adventurous": "adventure action journey quest exploration daring expedition",
    "dark": "dark horror grim thriller crime disturbing sinister unsettling",
    "peaceful": "calm gentle cozy peaceful slow quiet poetry nature reflective",
    "motivated": "self-help motivational inspiring biography success habits growth",
}


def get_personalized(genre_filter=None, vibe=None, n=30):
    """
    Returns recommendations strictly filtered by the user's preferred genres and reading vibe.
    If no preference is provided, falls back cleanly to general popular books across all categories.
    """
    cache_key = f"personalized_{genre_filter}_{vibe}_{n}"
    if cache_key in _MEMORY_CACHE:
        return _MEMORY_CACHE[cache_key]

    genre_str = None
    if genre_filter:
        g_list = [g.strip().lower() for g in str(genre_filter).split(",") if g.strip()]
        if g_list:
            genre_str = ",".join(g_list)

    vibe_key = (vibe or "").strip().lower()
    vibe_soup = MOOD_SOUPS.get(vibe_key)

    results = []
    if vibe_soup:
        # Search by vibe keywords with genre constraint
        results = search_by_text(vibe_soup, n=n, genre_filter=genre_str)
        if len(results) < n:
            # Supplement with popular books strictly in the same genres
            pop = get_popular(genre_filter=genre_str, n=n)
            seen = {b["book_id"] for b in results}
            for b in pop:
                if b["book_id"] not in seen:
                    results.append(b)
                    seen.add(b["book_id"])
                    if len(results) >= n:
                        break
    elif genre_str:
        # Strict genre filter
        results = get_popular(genre_filter=genre_str, n=n)
    else:
        # General books across all categories
        results = get_popular(n=n)

    _MEMORY_CACHE[cache_key] = results
    return results


def get_latest(genre_filter=None, n=30):
    """
    Returns latest new releases (published 2024-2026) sorted by popularity and year.
    """
    cache_key = f"latest_{genre_filter}_{n}"
    if cache_key in _MEMORY_CACHE:
        return _MEMORY_CACHE[cache_key]

    conn = get_db_connection()
    c = conn.cursor()
    fetch_limit = min(max(n * 5, 80), 300)
    
    where_clauses = ["publication_year >= 2024", "publication_year <= 2026"]
    params = []
    
    if genre_filter:
        genres = [g.strip().lower() for g in str(genre_filter).split(",") if g.strip()]
        if genres:
            genre_conditions = ["LOWER(genres) LIKE ?"] * len(genres)
            where_clauses.append(f"({' OR '.join(genre_conditions)})")
            params.extend([f"%{g}%" for g in genres])

    sql = f"SELECT * FROM books WHERE {' AND '.join(where_clauses)} ORDER BY ratings_count DESC LIMIT ?"
    params.append(fetch_limit)
    
    c.execute(sql, params)
    rows = c.fetchall()
    conn.close()
    
    unique_books = _deduplicate_books([_format_book_row(r) for r in rows], n=n, max_per_series=1)
    _MEMORY_CACHE[cache_key] = unique_books
    return unique_books

