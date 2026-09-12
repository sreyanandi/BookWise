# BookWise — ML Book Recommendation Dashboard

A book recommendation app styled after a maroon/white dashboard design,
backed by a hybrid local ML recommender AND a live connection to Open
Library for worldwide coverage and real summaries.

## What's inside
- `data/` — raw and cleaned book data (10,000 books, 6M ratings)
- `ml/` — cleaning, feature engineering, PyTorch collaborative model, and the
  hybrid recommend() function
- `api/` — FastAPI server: /search, /recommend, /popular, /search_by_text, /mood
- `frontend/` — React + Tailwind dashboard UI

## How to run

### 1. The brain (already trained)
```
cd ml
pip install pandas scikit-learn joblib torch numpy
python3 clean_data.py && python3 build_features.py && python3 train_collab.py
```

### 2. The API
```
cd api
pip install fastapi "uvicorn[standard]"
uvicorn main:app --reload --port 8000
```

### 3. The website
In a second terminal:
```
cd frontend
npm install
npm run dev
```
Open the printed URL (usually http://localhost:5173).

## How search + recommendations work now
1. **Local first**: we check our own 10,000-book dataset, which has the best
   recommendations (genre similarity + real reader collaborative filtering
   from 6M ratings).
2. **Worldwide fallback**: if a book isn't in our local set, the app queries
   [Open Library](https://openlibrary.org) live, in your browser — a free,
   public catalog covering virtually any published book, any country, any
   era from the 1800s through whatever's been catalogued recently. This
   needs a real internet connection (it won't work if you're offline, and
   it wasn't reachable from the sandbox this was built in — it will work
   normally on your own machine).
3. **Recommendations for a fallback book** come from Open Library's subject
   listings, ranked by how many editions/readers a book has.
4. **Summaries**: every book detail view tries to fetch a real,
   publisher-style summary from Open Library (these are back-cover-style
   blurbs, not spoiler-filled plot walkthroughs). If none exists for a
   title, we show an honest one-line fact sheet instead (genre, author,
   year, rating) rather than inventing a fake plot.

## Other features
- **Book covers always render** — if the real cover fails to load or
  doesn't exist, a clean letter-initial placeholder is shown instead of a
  broken image icon.
- **Category** — browse the most popular local books in any of 14 genres
- **Mood** — pick one of 8 moods (Happy, Sad, Romantic, Curious, Adventurous,
  Dark, Peaceful, Motivated) or describe your mood in your own words, and
  get books matched to it
- **Discover (search by description)** — describe a plot, scene, or feeling
  instead of a title, and find books by content similarity
- **Journey** — a personal Reading Journey with Currently Reading, Want to
  Read, and Finished shelves
- **Analytics** — a personal reading dashboard (books read, average rating,
  favorite genre, most-read genre, books this month) with charts for books
  per month, genre distribution, rating distribution, authors read, and
  reading streak — all computed from your own Reading Journey
- **Favorite** — heart any book to save it (persisted in your browser)
- **My Library** — automatic history of everything you've viewed
- **Settings** — change your display name, clear saved data
- **Help** — FAQ about how recommendations, mood/description search, and
  analytics work
- **Log Out** — clears the session view (favorites/history/journey stay
  saved locally)

All personal data (favorites, history, reading journey, display name) is
stored in your browser's localStorage only — nothing is sent to a server.

## Mood-based recommendations & search by description
Both features run on the same real NLP pipeline:
1. **Preprocessing + vectorization** — free text (a mood or a plot
   description) is turned into a numeric fingerprint using the exact same
   `TfidfVectorizer` trained on every book's genre/title data in
   `ml/build_features.py`.
2. **Similarity** — cosine similarity between that fingerprint and every
   book's fingerprint measures how closely the text matches each book.
3. **Recommendation** — the closest matches are returned, ranked by score.

This is exposed by the API as `GET /search_by_text?q=...` (used by
"Discover") and `GET /mood?mood=...` (used by "Mood", which expands a fixed
mood into a short descriptive phrase and reuses the same search).

## Reading Journey & Analytics
The Reading Journey (`Currently Reading` / `Want to Read` / `Finished`) is
stored entirely in the browser, alongside favorites and history. Marking a
book "Finished" stamps a date and lets you rate it — that data is what
powers the Analytics dashboard (books read, average rating, favorite/most
-read genre, books this month, and charts for monthly activity, genre and
rating distribution, top authors, and reading streak), computed live in the
browser from your own Journey data.

## Honest limitation
No dataset can contain books that don't exist yet. "2026 coverage" means:
recently published/catalogued books that Open Library has already indexed
— which is most mainstream releases within weeks of publication — not
books that haven't been written yet.

## Landing page
The app now opens on a marketing-style landing page (same maroon/white/orange
theme, Poppins font) with a live "Trending in the library" strip pulled from
the real API. Clicking "Get Started" or "Browse the library" enters the
dashboard. "Log Out" in the sidebar returns to this landing page.

## Category coverage
The category browser now covers 24 genres (fantasy, mythology, philosophy,
biography, war, crime, and more). For books outside our local library's
language/genre range, the top search bar reaches Open Library's full
worldwide, multi-language catalog.
