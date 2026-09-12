"""
train_collab.py
----------------
Goal (explained simply):
  Give every reader a set of "taste dials" (numbers) and every book a set
  of "flavor dials". Then nudge all the dials, bit by bit, until:

      (reader's taste dials) · (book's flavor dials) ≈ rating the reader gave

  This is called Matrix Factorization — a classic, simple way to do
  collaborative filtering. After training, books with similar flavor-dial
  patterns are ones REAL READERS tended to enjoy together, which can catch
  patterns that pure genre-matching misses entirely.

Run:
  python3 train_collab.py
"""

import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import joblib
import os
import time

RAW = "../data/raw"
MODEL_STORE = "model_store"
EMBED_DIM = 32          # how many "dials" each user/book gets
EPOCHS = 5
BATCH_SIZE = 8192
LEARNING_RATE = 0.01


class MatrixFactorization(nn.Module):
    """The dial-turning machine itself."""
    def __init__(self, num_users, num_books, embed_dim):
        super().__init__()
        self.user_emb = nn.Embedding(num_users, embed_dim)   # taste dials
        self.book_emb = nn.Embedding(num_books, embed_dim)   # flavor dials
        self.user_bias = nn.Embedding(num_users, 1)          # "this user rates everything higher/lower"
        self.book_bias = nn.Embedding(num_books, 1)          # "this book is just generally loved/hated"
        self.global_bias = nn.Parameter(torch.zeros(1))      # overall average nudge

        # Start the dials at small random values, not zero, so learning can begin
        nn.init.normal_(self.user_emb.weight, std=0.05)
        nn.init.normal_(self.book_emb.weight, std=0.05)
        nn.init.zeros_(self.user_bias.weight)
        nn.init.zeros_(self.book_bias.weight)

    def forward(self, user_idx, book_idx):
        dot = (self.user_emb(user_idx) * self.book_emb(book_idx)).sum(dim=1)
        bias = self.user_bias(user_idx).squeeze() + self.book_bias(book_idx).squeeze()
        return dot + bias + self.global_bias


def main():
    print("Loading ratings...")
    ratings = pd.read_csv(f"{RAW}/ratings.csv")
    print(f"  {len(ratings):,} ratings from real readers")

    # book_id in this dataset is already 1..10000, but user_id needs to be
    # re-mapped to a clean 0..N range for use as array indices.
    unique_users = ratings["user_id"].unique()
    user_to_idx = {u: i for i, u in enumerate(unique_users)}
    ratings["user_idx"] = ratings["user_id"].map(user_to_idx)
    ratings["book_idx"] = ratings["book_id"] - 1  # book_id is 1-indexed -> 0-indexed

    num_users = len(unique_users)
    num_books = ratings["book_idx"].max() + 1
    print(f"  {num_users:,} unique readers, {num_books:,} books")

    # Convert to tensors once, up front — much faster than converting every batch
    user_t = torch.tensor(ratings["user_idx"].values, dtype=torch.long)
    book_t = torch.tensor(ratings["book_idx"].values, dtype=torch.long)
    rating_t = torch.tensor(ratings["rating"].values, dtype=torch.float32)

    model = MatrixFactorization(num_users, num_books, EMBED_DIM)
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-5)
    loss_fn = nn.MSELoss()

    n = len(user_t)
    print(f"\nTraining for {EPOCHS} epochs (turning the dials)...")
    for epoch in range(EPOCHS):
        start = time.time()
        # Shuffle order each epoch so the model doesn't memorize a fixed sequence
        perm = torch.randperm(n)
        total_loss = 0.0
        num_batches = 0

        for i in range(0, n, BATCH_SIZE):
            batch_idx = perm[i:i + BATCH_SIZE]
            u = user_t[batch_idx]
            b = book_t[batch_idx]
            r = rating_t[batch_idx]

            optimizer.zero_grad()
            pred = model(u, b)
            loss = loss_fn(pred, r)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            num_batches += 1

        avg_loss = total_loss / num_batches
        elapsed = time.time() - start
        # RMSE tells us: "on average, how many stars off are our guesses?"
        rmse = avg_loss ** 0.5
        print(f"  Epoch {epoch+1}/{EPOCHS} — RMSE: {rmse:.3f} stars off  ({elapsed:.1f}s)")

    # Pull out the trained "flavor dials" for every book — this is what we
    # actually need going forward, we can throw away the rest of the model.
    book_embeddings = model.book_emb.weight.detach().numpy()

    os.makedirs(MODEL_STORE, exist_ok=True)
    np.save(f"{MODEL_STORE}/book_embeddings.npy", book_embeddings)
    print(f"\nSaved {book_embeddings.shape} book embeddings to {MODEL_STORE}/book_embeddings.npy")


if __name__ == "__main__":
    main()
