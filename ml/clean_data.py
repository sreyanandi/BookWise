"""
clean_data.py
--------------
Goal (explained simply):
  We have 3 messy files. This script:
  1. Reads the books
  2. Reads the sticky-note tags
  3. Throws away junk tags (like "to-read", "owned", "favorites") that aren't genres
  4. Picks each book's top 5 REAL genre-like tags
  5. Glues everything together into one clean table
  6. Saves it as books_clean.csv
"""

import pandas as pd

RAW = "../data/raw"
OUT = "../data/processed"

# Instead of trying to list every possible JUNK tag (impossible - there are
# thousands, like "harry-potter" or "hunger-games", which are fan-club tags
# pretending to be genres), we do the opposite: only ALLOW tags from a curated
# list of real genres. Anything not on this list gets thrown away.
GENRE_WHITELIST = {
    "fantasy", "science-fiction", "sci-fi", "young-adult", "ya", "romance",
    "mystery", "thriller", "horror", "historical-fiction", "classics",
    "classic", "non-fiction", "nonfiction", "biography", "memoir",
    "self-help", "poetry", "drama", "humor", "comedy", "graphic-novels",
    "paranormal", "mythology", "adventure", "dystopian", "dystopia",
    "contemporary", "crime", "war", "western", "childrens", "middle-grade",
    "picture-books", "science", "philosophy", "religion", "spirituality",
    "business", "psychology", "history", "true-crime", "chick-lit",
    "magic", "vampires", "zombies", "dragons", "epic-fantasy",
    "urban-fantasy", "space-opera", "post-apocalyptic", "steampunk",
    "coming-of-age", "literary-fiction", "short-stories", "cookbooks",
    "art", "travel", "sports", "politics", "economics", "parenting",
    "health", "fiction", "suspense", "action", "supernatural",
}

def load_books():
    books = pd.read_csv(f"{RAW}/books.csv")
    # Keep only the columns we actually need — drop the noise
    books = books[[
        "book_id", "goodreads_book_id", "authors", "original_publication_year",
        "title", "average_rating", "ratings_count", "image_url"
    ]].copy()

    # Fill in missing values sensibly instead of leaving blanks
    books["original_publication_year"] = books["original_publication_year"].fillna(0).astype(int)
    books["authors"] = books["authors"].fillna("Unknown Author")
    books["average_rating"] = books["average_rating"].fillna(0)
    books["ratings_count"] = books["ratings_count"].fillna(0).astype(int)

    # Drop any row with no title at all — useless without one
    books = books.dropna(subset=["title"])
    books = books.drop_duplicates(subset=["book_id"])
    return books


def load_genre_tags():
    tags = pd.read_csv(f"{RAW}/tags.csv")
    book_tags = pd.read_csv(f"{RAW}/book_tags.csv")

    # Attach the readable tag name to each tag_id
    merged = book_tags.merge(tags, on="tag_id", how="left")

    # Keep ONLY tags that are real genres from our whitelist
    merged = merged.dropna(subset=["tag_name"])
    merged = merged[merged["tag_name"].isin(GENRE_WHITELIST)]

    # Sort so the MOST-used real tags for each book come first
    merged = merged.sort_values(["goodreads_book_id", "count"], ascending=[True, False])

    # Keep top 5 tags per book, then squash them into one string like: "fantasy young-adult magic"
    top_tags = (
        merged.groupby("goodreads_book_id")["tag_name"]
        .apply(lambda tags: " ".join(tags.head(5)))
        .reset_index()
        .rename(columns={"tag_name": "genres"})
    )
    return top_tags


def main():
    books = load_books()
    genres = load_genre_tags()

    # Glue the genre column onto the books table
    full = books.merge(genres, on="goodreads_book_id", how="left")
    full["genres"] = full["genres"].fillna("")

    # Final clean columns, nice and tidy
    full = full[[
        "book_id", "title", "authors", "genres",
        "original_publication_year", "average_rating",
        "ratings_count", "image_url"
    ]]

    full.to_csv(f"{OUT}/books_clean.csv", index=False)
    print(f"Saved {len(full)} cleaned books to {OUT}/books_clean.csv")
    print(full.head(5).to_string())


if __name__ == "__main__":
    main()
