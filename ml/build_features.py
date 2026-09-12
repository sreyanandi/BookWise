"""
build_features.py
------------------
Goal (explained simply):
  1. For every book, build one "soup" of words: its genres + author + title
     (we repeat genres/author a few times so they matter MORE than random title words)
  2. Turn every book's soup into a numeric "fingerprint" using TF-IDF
     (TF-IDF = "which words are special/important to THIS book, not just common everywhere")
  3. Use Nearest Neighbors to quickly find, for any book, the other books
     whose fingerprints point in the most similar direction (cosine similarity)
  4. Save the fingerprints + neighbor-finder to disk so we don't redo this every time
"""

import pandas as pd
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
import joblib
import os

PROCESSED = "../data/processed"
MODEL_STORE = "model_store"

os.makedirs(MODEL_STORE, exist_ok=True)


def strip_series_info(title):
    # "Harry Potter and the Goblet of Fire (Harry Potter, #4)" -> "Harry Potter and the Goblet of Fire"
    # Removing the "(Series Name, #n)" part stops every book in a series from
    # sharing identical series-name text, which was drowning out genre signal.
    return re.sub(r"\s*\([^)]*#\d+[^)]*\)", "", str(title)).strip()


def build_soup(row):
    # Genres are the main signal for "is this a similar BOOK" (not "same author").
    # We leave author out of the fingerprint on purpose: a rare author name would
    # otherwise dominate the match and only recommend that author's own books.
    genres = (str(row["genres"]) + " ") * 4
    title = strip_series_info(row["title"])
    return f"{genres}{title}".lower()


def main():
    books = pd.read_csv(f"{PROCESSED}/books_clean.csv")
    books["genres"] = books["genres"].fillna("")

    print("Building word-soup for each book...")
    books["soup"] = books.apply(build_soup, axis=1)

    print("Turning soups into TF-IDF fingerprints...")
    vectorizer = TfidfVectorizer(stop_words="english", max_features=20000)
    tfidf_matrix = vectorizer.fit_transform(books["soup"])
    print(f"Fingerprint matrix shape: {tfidf_matrix.shape} "
          f"({tfidf_matrix.shape[0]} books x {tfidf_matrix.shape[1]} words)")

    print("Building the nearest-neighbor finder (cosine similarity)...")
    # n_neighbors=11 because the book itself will always be its own closest match (distance 0),
    # so we grab 10 extra and drop the book itself later.
    nn_model = NearestNeighbors(n_neighbors=11, metric="cosine", algorithm="brute")
    nn_model.fit(tfidf_matrix)

    # Save everything we'll need later, so recommend.py doesn't have to redo this work
    joblib.dump(vectorizer, f"{MODEL_STORE}/vectorizer.pkl")
    joblib.dump(nn_model, f"{MODEL_STORE}/nn_model.pkl")
    joblib.dump(tfidf_matrix, f"{MODEL_STORE}/tfidf_matrix.pkl")
    books[["book_id", "title", "authors", "genres", "original_publication_year",
           "average_rating", "ratings_count", "image_url"]].to_pickle(
        f"{MODEL_STORE}/books_lookup.pkl"
    )

    print("Saved vectorizer, nn_model, tfidf_matrix, and books_lookup to model_store/")


if __name__ == "__main__":
    main()
