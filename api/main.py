"""
main.py
--------
FastAPI backend waiter for BookWise.
Connects directly to the high-performance SQLite recommendation engine.
"""

import sys
import os

# Allow import of recommend.py from ../ml
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ml"))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from recommend import (
    recommend,
    find_book,
    get_popular,
    search_by_text,
    get_worldwide,
    get_personalized,
    get_latest,
    MOOD_SOUPS,
)

app = FastAPI(title="BookWise API")

allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()] if allowed_origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


import re

def _clean_text(text):
    if not text:
        return ""
    if isinstance(text, dict):
        text = text.get("value", "")
    text = str(text)
    # Handle json-like descriptions stringified
    if text.startswith("{") and "value" in text:
        try:
            import json
            parsed = json.loads(text)
            if isinstance(parsed, dict) and "value" in parsed:
                text = parsed["value"]
        except Exception:
            pass
    # Strip HTML tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Strip wikitext bracket links [[Link|Text]] -> Text, [[Link]] -> Link
    text = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", text)
    # Strip markdown brackets
    text = re.sub(r"\[\d+\]", "", text)
    text = re.sub(r"\[edit\]", "", text, flags=re.IGNORECASE)
    # Clean whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Strip alternate cover preambles
    text = re.sub(r"^An alternative cover for this ASIN can be found here[\s.:-]*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^Alternate Cover Edition (?:for|of) (?:ASIN|ISBN)[\w\s.:-]*", "", text, flags=re.IGNORECASE)
    return text.strip()


def _synthesize_blurb(book):
    desc = _clean_text(book.get("description"))
    if desc and len(desc) > 30:
        return desc

    title = book.get("title", "This work")
    authors = book.get("authors", "the author")
    raw_genres = str(book.get("genres", "")).strip().split()
    genres_formatted = ", ".join(g.replace("-", " ") for g in raw_genres[:3]) if raw_genres else "fiction"
    raw_year = book.get("original_publication_year") or book.get("publication_year") or book.get("year")
    year_str = ""
    try:
        if raw_year and 0 < int(raw_year) <= 2026:
            year_str = f"published in {int(raw_year)}"
        else:
            year_str = "a renowned classic"
    except Exception:
        year_str = "a celebrated work"
    
    rating = float(book.get("average_rating") or book.get("rating") or 0.0)
    count = int(book.get("ratings_count") or 0)
    
    if rating > 0 and count > 0:
        rating_str = f"It holds a rating of {rating:.2f} out of 5 stars based on {count:,} verified reader reviews."
    elif rating > 0:
        rating_str = f"It holds an average rating of {rating:.2f} out of 5 stars."
    else:
        rating_str = "It is widely enjoyed across worldwide reading communities."

    return (
        f"Set in the world of {genres_formatted}, '{title}' is an acclaimed book by {authors}, {year_str}. "
        f"{rating_str} Exploring captivating themes and rich character journeys, it offers readers an authentic and memorable literary experience."
    )


def _format_api_book(book):
    if not book:
        return None
    raw_year = book.get("original_publication_year") or book.get("publication_year") or book.get("year")
    year = None
    try:
        if raw_year is not None:
            y = int(raw_year)
            if 0 < y <= 2026:
                year = y
    except Exception:
        year = None

    raw_rating = book.get("average_rating") or book.get("rating")
    rating_val = 0.0
    try:
        if raw_rating is not None:
            r = float(raw_rating)
            if 0.0 < r <= 5.0:
                rating_val = round(r, 2)
    except Exception:
        rating_val = 0.0

    cleaned_desc = _clean_text(book.get("description"))
    blurb = cleaned_desc if cleaned_desc and len(cleaned_desc) > 30 else _synthesize_blurb(book)

    return {
        "book_id": str(book["book_id"]),
        "title": book["title"],
        "authors": book["authors"],
        "genres": book.get("genres", ""),
        "year": year,
        "original_publication_year": year,
        "rating": rating_val,
        "average_rating": rating_val,
        "ratings_count": int(book.get("ratings_count") or 0),
        "image_url": book.get("image_url") or "",
        "blurb": blurb,
        "description": cleaned_desc or blurb,
        "source": book.get("source", "local"),
    }


@app.get("/")
def root():
    return {"status": "BookWise API is running", "database": "UCSD + Kaggle SQLite Unified"}


@app.get("/personalized")
def personalized(
    genres: str = Query(None, description="Optional comma-separated genres"),
    vibe: str = Query(None, description="Optional reading vibe"),
    n: int = Query(30, ge=1, le=100),
):
    books = get_personalized(genre_filter=genres, vibe=vibe, n=n)
    return [_format_api_book(b) for b in books]


@app.get("/latest")
def latest(
    genre: str = Query(None, description="Optional genre filter"),
    n: int = Query(30, ge=1, le=100),
):
    books = get_latest(genre_filter=genre, n=n)
    return [_format_api_book(b) for b in books]


@app.get("/popular")
def popular(
    genre: str = Query(None, description="Optional genre filter"),
    n: int = Query(10, ge=1, le=100),
    year_min: int = Query(None, description="Minimum publication year"),
    year_max: int = Query(None, description="Maximum publication year"),
    language: str = Query(None, description="Optional language filter"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    books = get_popular(genre_filter=genre, n=n, year_min=year_min, year_max=year_max, language=language, offset=offset)
    return [_format_api_book(b) for b in books]


@app.get("/worldwide")
def worldwide(
    genre: str = Query(None, description="Optional genre filter"),
    n: int = Query(24, ge=1, le=100),
    year_min: int = Query(None, description="Minimum publication year"),
    year_max: int = Query(None, description="Maximum publication year"),
    language: str = Query(None, description="Optional language filter"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    books = get_worldwide(genre_filter=genre, year_min=year_min, year_max=year_max, language=language, n=n, offset=offset)
    return [_format_api_book(b) for b in books]


@app.get("/search_by_text")
def search_by_text_endpoint(
    q: str = Query(..., description="A description, plot, or vibe to search for"),
    n: int = Query(10, ge=1, le=100),
    genre: str = Query(None, description="Optional genre filter"),
):
    results = search_by_text(q, n=n, genre_filter=genre)
    if not results:
        raise HTTPException(status_code=404, detail=f"No books matched '{q}'")
    return [_format_api_book(r) for r in results]


MOOD_SOUPS = {
    "happy": "uplifting cheerful feel good humor comedy fun light hearted joyful",
    "sad": "emotional heartbreaking grief loss tearjerker sorrow literary fiction",
    "romantic": "romance love passion relationship swoon hearted yearning",
    "curious": "mystery intriguing puzzle discovery curiosity non-fiction science ideas",
    "adventurous": "adventure action journey quest exploration daring expedition",
    "dark": "dark horror grim thriller crime disturbing sinister unsettling",
    "peaceful": "calm gentle cozy peaceful slow quiet poetry nature reflective",
    "cozy": "cozy calm gentle peaceful slow quiet mystery home comforting",
    "motivated": "self-help motivational inspiring biography success habits growth",
    "inspiring": "self-help motivational inspiring biography success habits growth",
    "nostalgic": "nostalgic classic coming of age childhood memory history retro",
    "thrilling": "thriller suspense mystery crime action fast paced gripping",
}



@app.get("/mood")
def mood_recommend(
    mood: str = Query(..., description="One of fixed or custom moods"),
    n: int = Query(8, ge=1, le=100),
):
    soup = MOOD_SOUPS.get(mood.lower(), mood)
    results = search_by_text(soup, n=n)
    if not results:
        # Fallback to popular books if FTS returns no matches
        results = get_popular(n=n)
    return [_format_api_book(r) for r in results]



@app.get("/search")
def search(q: str = Query(..., description="Book title to search for")):
    matches = find_book(q, limit=1)
    if not matches:
        raise HTTPException(status_code=404, detail=f"No book found matching '{q}'")
    return _format_api_book(matches[0])


@app.get("/recommend")
def get_recommendations(
    title: str = Query(..., description="Book title to base recommendations on"),
    n: int = Query(5, ge=1, le=100),
    genre: str = Query(None, description="Optional genre filter"),
):
    source, recs = recommend(title, n=n, genre_filter=genre)
    if source is None:
        raise HTTPException(status_code=404, detail=f"No book found matching '{title}'")
    return {
        "source_book": _format_api_book(source),
        "recommendations": [_format_api_book(r) for r in recs],
    }


# Mount built frontend assets so API and Web UI run together seamlessly
from fastapi.staticfiles import StaticFiles

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


