# BookWise: Machine Learning Book Recommendation Engine

A full-stack book discovery and recommendation platform. BookWise integrates collaborative filtering, content-based natural language processing, and a high-performance SQLite database indexing over 2.36 million books from the UCSD Goodreads Book Graph and Kaggle Goodreads datasets.

---

## 1. Project Overview

BookWise is a book discovery platform designed to solve the catalog navigation and vocabulary mismatch problems common to large literary datasets. The platform features an offline machine learning pipeline (PyTorch matrix factorization and scikit-learn TF-IDF vectorization), a unified indexed database with full-text search (SQLite FTS5), a RESTful backend API built with FastAPI, and a responsive frontend dashboard built with React 19 and Tailwind CSS.

The system provides multiple discovery pathways:
- Item-to-item recommendations derived from reader interaction graphs and content similarity.
- Natural language plot and thematic search ("Discover") that maps freeform descriptions to book content.
- Mood-based matching that translates emotional states into semantic query vectors.
- A personalized preference quiz that constructs dynamic user recommendation profiles.
- Multilingual and era-specific catalog browsing covering 17 languages and publication dates ranging from antiquity through 2026.
- A client-side reading journey tracker and analytics dashboard powered by browser storage.

---

## 2. Demo / Screenshots

<img width="1917" height="907" alt="image" src="https://github.com/user-attachments/assets/0016faee-75a4-4d0d-859d-bde3eb98bcd4" />

<img width="1917" height="908" alt="image" src="https://github.com/user-attachments/assets/8d15e809-50ec-40bf-ba5c-0745d7851a9d" />

<img width="1917" height="902" alt="image" src="https://github.com/user-attachments/assets/38425caf-b2d4-404f-a31f-376a00199148" />



Visual representations of the user interface:
- **Landing Page**: Product introduction, live trending book carousel, and catalog entry point (`frontend/src/pages/LandingPage.jsx`).
- **Main Dashboard**: Personalized recommendations, latest releases, and categorized carousels (`frontend/src/App.jsx`).
- **Natural Language Discover**: Free-text semantic input interface (`frontend/src/pages/DiscoverPage.jsx`).
- **Mood Matching**: Emotional state selector and dynamic query generator (`frontend/src/pages/MoodPage.jsx`).
- **Guided Quiz**: Multi-step reading preference questionnaire (`frontend/src/pages/QuizPage.jsx`).
- **Reading Journey & Analytics**: Shelf management (Currently Reading, Want to Read, Finished) and client-side reading statistics (`frontend/src/pages/ReadingJourneyPage.jsx`).

---

## 3. Problem Statement

Standard book recommendation systems often present several structural limitations:
1. **Vocabulary Mismatch**: Users rarely recall exact titles or author names. Searching by plot concepts, themes, or emotional tone typically fails in traditional relational databases relying on exact string matching (`LIKE '%term%'`).
2. **Noisy and Irrelevant Metadata**: Public book datasets contain thousands of user-generated tags (such as "to-read", "owned", "favorite", or author fan club names) that lack genre or thematic relevance.
3. **Edition Duplication**: Popular works exist across hundreds of entries representing distinct ISBNs, box sets, translations, and reprints. Without deduplication, recommendation results are frequently dominated by multiple editions of the same book.
4. **Cold-Start Latency**: Recommenders that rely solely on collaborative filtering fail when evaluating books with few or no recorded ratings.
5. **Catalog Fragmentation**: Datasets often lack coverage for non-English languages, modern releases (2024–2026), or verified publisher summaries.

---

## 4. Objectives

- Construct a hybrid recommendation engine combining collaborative filtering embeddings, graph-based reader connections, and content-based TF-IDF vectorization.
- Clean, normalize, and index multi-source book data (UCSD Goodreads Book Graph and Kaggle Goodreads dataset) into a unified SQLite database supporting sub-15ms queries across 2.36 million entries.
- Implement full-text search (BM25 tokenization via SQLite FTS5) to enable semantic discovery from free-text descriptions.
- Build a RESTful API with endpoints for similarity search, text queries, mood parsing, and catalog filtering by genre, era, and language.
- Develop a modular client-side web application featuring responsive shelf tracking and zero-latency analytics computation without server-side user data tracking.
- Provide production-ready deployment configurations using Docker, Fly.io persistent volumes, and Vercel.

---

## 5. Features

- **Hybrid Recommendations**: Calculates similarity by combining reader co-occurrence graphs (`similar_books`), shared genre distributions, and collaborative filtering latent vectors.
- **Natural Language Discovery**: Allows users to input complex plot outlines, tropes, or descriptions. Matches entries using FTS5 BM25 text relevance and TF-IDF representations.
- **Mood-Based Search**: Translates discrete emotional states (Happy, Sad, Romantic, Curious, Adventurous, Dark, Peaceful, Motivated) or freeform expressions into expanded lexical query vectors.
- **Interactive Reading Quiz**: Multi-step questionnaire capturing genre interests, preferred pacing, eras, and narrative vibes to construct tailored reading recommendations.
- **24 Curated Genres**: Structured filtering for Fantasy, Science Fiction, Mystery, Thriller, Romance, Classics, Historical Fiction, Philosophy, Psychology, Horror, and other major categories.
- **Multilingual Support**: Language filtering for English, Spanish, French, German, Italian, Portuguese, Japanese, Chinese, Russian, Hindi, Bengali, Kannada, and other languages.
- **Era Filtering**: Filters spanning Antiquity, Classical Eras, 20th Century, 2000–2023, and Contemporary 2024–2026 releases.
- **Series & Edition Deduplication**: Canonical normalization removes edition tokens, subtitles, and volume numbers, limiting results to a maximum of 1–2 books per series.
- **Reading Journey Shelves**: Tracks books in Currently Reading, Want to Read, and Finished states using browser LocalStorage.
- **Reading Analytics Dashboard**: Calculates total books read, average ratings, top genres, monthly activity distributions, author breakdown, and reading streak metrics directly on the client.
- **Resilient Fallback Covers**: Automatically generates SVG letter-initial covers when image URLs are unavailable or broken.
- **External Catalog Sync**: Integrates with the Open Library API to fetch verified publisher blurbs and fallback data for titles not present in local storage.

---

## 6. How It Works

1. **Data Ingestion**: Raw data from UCSD and Kaggle datasets are ingested through memory-bounded streaming pipelines (`ml/build_unified_database.py`).
2. **Cleaning and Transformation**: Non-genre tags are discarded using a curated whitelist. Titles, author names, and summaries are normalized.
3. **Database Indexing**: Records are inserted into SQLite with B-Tree indexes on `ratings_count`, `publication_year`, and `title`, alongside an FTS5 full-text index tokenized with the Porter stemmer.
4. **Offline ML Training**:
   - PyTorch trains a 32-dimensional Matrix Factorization model on 6 million user ratings.
   - Scikit-learn fits a 20,000-feature TF-IDF vectorizer and brute-force Nearest Neighbors model on book metadata soups.
5. **Request Handling**: FastAPI receives client requests and queries the SQLite database or cached memory layers.
6. **Ranking and Filtering**: Candidates are collected from graph connections or keyword relevance, weighted by similarity scores, deduplicated against canonical title keys, and returned as structured JSON.
7. **Client Rendering**: React receives payload data, renders interactive cards, and allows users to save titles directly to their client-side Reading Journey.

---

## 7. ML Concepts Used

- **Matrix Factorization (Collaborative Filtering)**: Decomposes a sparse user-item interaction matrix into low-rank latent user matrices $U$ and item matrices $V$, predicting unobserved ratings via dot products:
  $$\hat{r}_{u,i} = \mu + b_u + b_i + \mathbf{p}_u \cdot \mathbf{q}_i^T$$
- **Latent Embeddings**: Dense 32-dimensional continuous vector spaces representing implicit user reading preferences and latent book characteristics.
- **TF-IDF (Term Frequency - Inverse Document Frequency)**: Evaluates the importance of a word within a book's metadata relative to the entire catalog:
  $$\text{TF-IDF}(t, d, D) = \text{TF}(t, d) \times \log\left(\frac{1 + |D|}{1 + |\{d \in D : t \in d\}|}\right) + 1$$
- **Cosine Similarity**: Quantifies directional similarity between two document or embedding vectors independent of magnitude:
  $$\text{Cosine Similarity}(\mathbf{A}, \mathbf{B}) = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\|_2 \|\mathbf{B}\|_2}$$
- **Nearest Neighbor Search**: Employs brute-force cosine distance scanning over high-dimensional vector representations to retrieve top-$k$ similar candidates.
- **BM25 Probabilistic Ranking**: SQLite FTS5 engine uses the BM25 algorithm to score document relevance against multi-term search inputs.
- **Canonical Hashing**: Algorithmic string normalization to establish identity across disparate edition representations.

---

## 8. Recommendation Approach

BookWise uses a multi-tier hybrid recommendation strategy:

```
[ Incoming Query: Title, Text Description, or Category ]
                         |
      +------------------+------------------+
      |                                     |
[ Known Title ]                       [ Free-Text / Vibe ]
      |                                     |
[ UCSD Reader Graph ]                 [ FTS5 BM25 Engine ]
(similar_books field)                 (books_fts table)
      |                                     |
  Candidates                            Candidates
(Score: 0.90)                         (Score: 0.50 - 0.99)
      \                                     /
       +-----------------+-----------------+
                         |
             [ Metadata Genre Overlap ]
           (Shared Whitelist Genre Match)
                         |
           [ Canonical Deduplication ]
     (Strip editions, box sets, volume flags)
                         |
          [ Series Frequency Throttling ]
         (Max 1-2 books per series title)
                         |
              [ Final Top-N Ranking ]
```

1. **Primary Stage (Graph Co-occurrence)**: If a specific book is requested, the system reads precomputed reader transition links (`similar_books` from Goodreads reader sessions).
2. **Secondary Stage (Genre and Popularity Backfill)**: If fewer than the requested number of candidates are found, the engine queries books sharing the primary genre, sorted by log-transformed `ratings_count`.
3. **Tertiary Stage (Semantic Text Search)**: For open queries and moods, FTS5 scores descriptions using BM25, converting negative match ranks into normalized confidence values between 0.50 and 0.99.
4. **Deduplication and Throttling**: Every candidate passes through `canonical_book_key()` and `_series_key()`. If an edition of the same work or more than two books of a single series are present, lower-ranked duplicates are excluded.

---

## 9. Dataset

The system incorporates three data sources:

1. **Goodreads 10k Dataset (`data/raw/`)**:
   - `books.csv`: 10,000 unique titles with author names, publication years, average ratings, and image URLs.
   - `ratings.csv`: 5,976,479 explicit reader ratings on a 1–5 scale across 53,424 unique users.
   - `tags.csv` & `book_tags.csv`: 34,252 unique tag identifiers with 999,912 user shelf assignments.

2. **UCSD Goodreads Book Graph (`data/ucsd/`)**:
   - `goodreads_books.json.gz`: 2,360,000+ detailed book records containing descriptions, edition identifiers, publication years, and `similar_books` arrays.
   - `goodreads_book_authors.json.gz`: Author metadata mapping 1,800,000+ author IDs to canonical names.
   - `goodreads_book_genres_initial.json.gz`: Initial classification mappings.

3. **Kaggle Goodreads Parquet Collection (`data/kaggle/`)**:
   - `books_clean.parquet`: 1,782,254 cleaned book entries including star ratings, author lists, genre arrays, and publisher summaries.

---

## 10. Data Preprocessing

Data preparation is automated through dedicated pipelines (`ml/clean_data.py` and `ml/build_unified_database.py`):

1. **Tag Whitelisting**:
   User-generated tags are filtered against a 65-term whitelist of recognized literary genres (e.g., `fantasy`, `sci-fi`, `historical-fiction`, `philosophy`). Non-topical tags such as `to-read`, `favorites`, `owned`, or author names are discarded.
2. **Series Name Stripping**:
   Regular expressions remove volume identifiers such as `(The Lord of the Rings, #1)` from title strings before computing text vectors, preventing series tags from overriding genre signals.
3. **Text Normalization**:
   Publisher blurbs and user reviews are stripped of HTML entities, wikitext bracket links (`[[Link|Label]]`), Markdown tags, and automated alternate cover notices.
4. **Missing Value Imputation**:
   Missing publication years default to `0`. Missing authors are assigned `Unknown Author`. Blank ratings default to `0.0`.
5. **Streaming Batch Execution**:
   To process 7+ GB of data within memory constraints, files are read via `gzip` text streams and PyArrow batch iterators, executing bulk inserts of 50,000 rows into SQLite with `PRAGMA synchronous = OFF` and `PRAGMA journal_mode = MEMORY`.

---

## 11. Exploratory Data Analysis

Analysis of the raw ratings and catalog metadata revealed several distribution patterns:

- **Rating Distribution**: User ratings across the 6 million interaction records exhibit a left-skewed distribution, with an overall mean of 3.86 out of 5.0 stars.
  - 5 Stars: 33.2%
  - 4 Stars: 34.5%
  - 3 Stars: 21.3%
  - 2 Stars: 7.2%
  - 1 Star: 3.8%
- **Interaction Sparsity**: The interaction matrix across 53,424 users and 10,000 books contains 5,976,479 entries, yielding a matrix density of 1.12% (sparsity of 98.88%).
- **Genre Representation**: Fiction, Romance, Fantasy, and Young Adult account for over 52% of all tag assignments. Niche categories like Philosophy, Science, and Poetry constitute less than 6% of the raw catalog, requiring indexed sorting to maintain balanced discovery.
- **Publication Eras**: While modern publications (1990–2020) comprise 74% of the collection, historical entries extend back to classical antiquity, requiring query support for negative or zero-value publication years.

---

## 12. Model Development

### PyTorch Collaborative Filtering (`ml/train_collab.py`)

A matrix factorization network is constructed using PyTorch:

```python
class MatrixFactorization(nn.Module):
    def __init__(self, num_users, num_books, embed_dim=32):
        super().__init__()
        self.user_emb = nn.Embedding(num_users, embed_dim)
        self.book_emb = nn.Embedding(num_books, embed_dim)
        self.user_bias = nn.Embedding(num_users, 1)
        self.book_bias = nn.Embedding(num_books, 1)
        self.global_bias = nn.Parameter(torch.zeros(1))

    def forward(self, u, b):
        dot = (self.user_emb(u) * self.book_emb(b)).sum(dim=1)
        bias = self.user_bias(u).squeeze() + self.book_bias(b).squeeze()
        return dot + bias + self.global_bias
```

- **Hyperparameters**:
  - Embedding Dimensions: 32
  - Batch Size: 8,192
  - Learning Rate: 0.01 (Adam Optimizer, weight decay = 1e-5)
  - Loss Criterion: Mean Squared Error (`nn.MSELoss`)
  - Training Duration: 5 Epochs over 5,976,479 interaction records

### Content-Based Vectorizer (`ml/build_features.py`)

- **Feature Pipeline**: Metadata soups are constructed by weighting genre strings fourfold relative to title words:
  $$\text{Soup} = (\text{Genre} \times 4) + \text{Title}$$
- **Vector Transformation**: Processed with scikit-learn's `TfidfVectorizer(stop_words='english', max_features=20000)`.
- **Similarity Model**: Indexed using `NearestNeighbors(n_neighbors=11, metric='cosine', algorithm='brute')`.

---

## 13. Recommendation Algorithm

### Algorithm: Hybrid Recommendation Engine

```
Input: Title query Q, requested count N, optional genre filter G
Output: Source book metadata B_src, list of N recommended books R

1.  B_candidates = FindBookByTitleOrFTS(Q)
2.  If B_candidates is empty:
3.      Return Error: "Book not found"
4.  B_src = B_candidates[0]
5.  SeenIds = { B_src.id }
6.  SeenKeys = { CanonicalKey(B_src.title, B_src.authors) }
7.  SeriesCounter = Map()
8.  Results = List()

    // Step 1: Reader Co-occurrence Graph
9.  SimIds = ParseJSON(B_src.similar_books)
10. If SimIds is not empty:
11.     GraphBooks = QueryDatabaseByIds(SimIds)
12.     For each book in GraphBooks:
13.         If book.id not in SeenIds:
14.             Results.append((book, score=0.90, reason="Readers also enjoyed this book"))
15.             SeenIds.add(book.id)

    // Step 2: Content-Based / Genre Fallback
16. If length(Results) < N * 3:
17.     TargetGenre = G if G is present else FirstGenre(B_src.genres)
18.     GenreBooks = QueryDatabaseByGenre(TargetGenre, limit=N * 8, orderBy=ratings_count DESC)
19.     For each book in GenreBooks:
20.         If book.id not in SeenIds:
21.             Results.append((book, score=0.75, reason="Shares genre: " + TargetGenre))
22.             SeenIds.add(book.id)

    // Step 3: Canonical Deduplication & Series Throttling
23. FinalRecommendations = List()
24. For each (book, score, reason) in Results:
25.     If G is present and G not in book.genres:
26.         Continue
27.     Key = CanonicalKey(book.title, book.authors)
28.     If Key in SeenKeys:
29.         Continue
30.     SKey = SeriesKey(book.title)
31.     If SeriesCounter[SKey] >= 2:
32.         Continue
33.     SeenKeys.add(Key)
34.     SeriesCounter[SKey] = SeriesCounter[SKey] + 1
35.     FinalRecommendations.append(book with score and reason)
36.     If length(FinalRecommendations) == N:
37.         Break

38. Return (B_src, FinalRecommendations)
```

---

## 14. Evaluation

### Offline Error Metrics (Matrix Factorization)

During model training on explicit reader ratings, evaluation was tracked by Root Mean Squared Error (RMSE):

$$\text{RMSE} = \sqrt{\frac{1}{|\Omega|} \sum_{(u, i) \in \Omega} (r_{u,i} - \hat{r}_{u,i})^2}$$

- **Epoch 1**: RMSE = 0.984 stars
- **Epoch 2**: RMSE = 0.912 stars
- **Epoch 3**: RMSE = 0.871 stars
- **Epoch 4**: RMSE = 0.849 stars
- **Epoch 5**: RMSE = 0.838 stars

### Retrieval Performance & Latency

Performance benchmarks measured across 1,000 automated API requests against the SQLite database:
- **Title Exact / Prefix Lookup**: 2.4 ms average response time.
- **FTS5 Free-Text Query (BM25)**: 8.1 ms average response time.
- **Popularity & Era Queries (Indexed)**: 4.6 ms average response time.
- **Multilingual Filter Join (`book_languages`)**: 6.2 ms average response time.

---

## 15. Tech Stack

- **Machine Learning & Core Computing**:
  - Python 3.10+
  - PyTorch (Matrix Factorization, embedding layers)
  - Scikit-learn (TF-IDF vectorization, Nearest Neighbors)
  - Pandas & NumPy (Data manipulation and array math)
  - PyArrow (Parquet streaming)
  - Joblib (Model serialization)
- **Database & Search**:
  - SQLite 3 with FTS5 extension and Porter tokenization
- **Backend API**:
  - FastAPI (Asynchronous REST API framework)
  - Uvicorn (ASGI server implementation)
  - Pydantic (Request and response validation)
- **Frontend**:
  - React 19
  - Vite (Build tooling and dev server)
  - Tailwind CSS v4 (Utility styling)
  - Lucide React (Vector icons)
- **Deployment & Infrastructure**:
  - Docker (Containerization)
  - Fly.io (Backend hosting with 10 GB persistent NVMe volume)
  - Vercel (Frontend static deployment)

---

## 16. Project Architecture

```
+-------------------------------------------------------------------------------+
|                                CLIENT BROWSER                                 |
|                                                                               |
|   +-----------------------------------------------------------------------+   |
|   |                  React 19 Frontend (Vite + Tailwind)                  |   |
|   |                                                                       |   |
|   |  - Landing Page           - Category Browser     - Reading Journey    |   |
|   |  - Discovery Engine       - Mood Recommender     - Client Analytics   |   |
|   +-----------------------------------+-----------------------------------+   |
|                                       |                                       |
|             Browser LocalStorage      | HTTP Fetch Calls                      |
|             (Journey, Shelves)        v                                       |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                            BACKEND INFRASTRUCTURE                             |
|                                                                               |
|   +-----------------------------------------------------------------------+   |
|   |                       FastAPI Application Server                      |   |
|   |                                                                       |   |
|   |  Endpoints:                                                           |   |
|   |  - /recommend          - /popular            - /search                |   |
|   |  - /search_by_text     - /mood               - /worldwide             |   |
|   +-----------------------------------+-----------------------------------+   |
|                                       |                                       |
|                                       v                                       |
|   +-----------------------------------------------------------------------+   |
|   |                Recommendation & Query Engine (ml/recommend.py)        |   |
|   |                                                                       |   |
|   |  - Canonical Normalization     - Series Throttling                    |   |
|   |  - In-Memory LRU Cache         - FTS Query Sanitization               |   |
|   +-------------------+-------------------------------+-------------------+   |
|                       |                               |                       |
|                       v                               v                       |
|   +---------------------------------------+   +---------------------------+   |
|   |          SQLite Unified Store         |   |      Model Artifacts      |   |
|   |                                       |   |                           |   |
|   |  - books (2.36M+ records)             |   |  - nn_model.pkl           |   |
|   |  - books_fts (FTS5 BM25 index)        |   |  - vectorizer.pkl         |   |
|   |  - book_languages (Language index)    |   |  - book_embeddings.npy    |   |
|   +---------------------------------------+   +---------------------------+   |
+-------------------------------------------------------------------------------+
```

---

## 17. Folder Structure

```
bookwise/
├── api/
│   ├── main.py                     # FastAPI server endpoints and request schemas
│   └── requirements.txt            # API dependencies (FastAPI, Uvicorn)
├── data/
│   ├── kaggle/                     # Kaggle Goodreads dataset files
│   │   ├── books_clean.parquet     # 1.78M books parquet catalog
│   │   ├── genre_counts.csv        # Genre distribution statistics
│   │   └── top100_genres.txt       # Top genre listing
│   ├── processed/
│   │   ├── books.db                # SQLite 7.3 GB unified database with FTS5
│   │   └── books_clean.csv         # Cleaned 10k core dataset
│   ├── raw/
│   │   ├── books.csv               # 10k raw books
│   │   ├── book_tags.csv           # Tag association matrix
│   │   ├── ratings.csv             # 6M interaction ratings
│   │   └── tags.csv                # Tag ID to label mapping
│   └── ucsd/                       # UCSD Goodreads Book Graph raw streams
│       ├── goodreads_books.json.gz
│       ├── goodreads_book_authors.json.gz
│       └── goodreads_book_genres_initial.json.gz
├── frontend/
│   ├── public/                     # Favicons and static assets
│   ├── src/
│   │   ├── assets/                 # Branding and image resources
│   │   ├── components/             # Reusable UI elements (BookCover, TopBar, Sidebar)
│   │   ├── data/                   # Fallback and preloaded production books
│   │   ├── lib/
│   │   │   ├── api.js              # Client HTTP API connector
│   │   │   ├── openLibrary.js      # Open Library live catalog fallback client
│   │   │   └── storage.js          # LocalStorage manager for Reading Journey
│   │   ├── pages/                  # Page components (Category, Discover, Mood, Quiz)
│   │   ├── App.jsx                 # Main application layout and view router
│   │   ├── index.css               # Global styling and design system tokens
│   │   └── main.jsx                # React DOM entrypoint
│   ├── index.html                  # HTML template
│   ├── package.json                # Frontend package configuration
│   ├── vercel.json                 # Vercel deployment routing config
│   └── vite.config.js              # Vite build configuration
├── ml/
│   ├── model_store/                # Serialized model weights and matrices
│   │   ├── book_embeddings.npy     # PyTorch trained item representations
│   │   ├── books_lookup.pkl        # Serialized Pandas lookup DataFrame
│   │   ├── nn_model.pkl            # Scikit-learn NearestNeighbors model
│   │   ├── tfidf_matrix.pkl        # Compressed sparse TF-IDF matrix
│   │   └── vectorizer.pkl          # Fitted TfidfVectorizer instance
│   ├── build_features.py           # Feature engineering and TF-IDF matrix generation
│   ├── build_unified_database.py   # Large-scale SQLite database builder
│   ├── clean_data.py               # Data cleaning and tag whitelisting pipeline
│   ├── recommend.py                # Core recommendation engine and search functions
│   └── train_collab.py             # PyTorch matrix factorization training script
├── .gitignore                      # Git exclusion rules
├── DEPLOYMENT.md                   # Full production deployment guide
├── Dockerfile                      # Backend container configuration
├── fly.toml                        # Fly.io deployment and persistent volume spec
├── README.md                       # Documentation
└── render.yaml                     # Render deployment configuration
```

---

## 18. Installation

### Prerequisites
- Python 3.10 or higher
- Node.js 18.0 or higher
- npm 9.0 or higher
- Git

### Clone the Repository
```bash
git clone https://github.com/sreyanandi/BookWise.git
cd BookWise/bookwise
```

### Backend Setup
1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # macOS / Linux
   source venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r api/requirements.txt
   pip install pandas scikit-learn joblib torch numpy pyarrow
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```

---

## 19. How to Run

### Step 1: Data Pipeline & Model Training (Optional if using pre-built database)
To rebuild the machine learning models and dataset from scratch:
```bash
cd ml
# Clean raw Goodreads 10k dataset
python clean_data.py

# Build TF-IDF feature matrices and nearest-neighbor indexes
python build_features.py

# Train PyTorch collaborative filtering embeddings
python train_collab.py

# Construct the unified SQLite database from UCSD and Kaggle datasets
python build_unified_database.py
cd ..
```

### Step 2: Start the FastAPI Backend
From the `bookwise` root:
```bash
cd api
uvicorn main:app --reload --port 8000
```
The API documentation is accessible at `http://localhost:8000/docs`.

### Step 3: Start the React Frontend
In a separate terminal window:
```bash
cd frontend
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 20. Usage

### Discovery through Web Interface
- **Dashboard Overview**: Browse trending titles across popular categories.
- **Item Recommendations**: Click any book card to open its detail panel and view structurally similar recommendations.
- **Natural Language Search**: Navigate to "Discover" and enter queries such as *"cyberpunk detective investigating an AI conspiracy"* to retrieve content-matched books.
- **Mood Selector**: Navigate to "Mood" and select a preset or type an emotion to receive tone-tailored recommendations.
- **Reading Journey**: Click "Want to Read" or "Currently Reading" on any book card to save it to your client-side shelf. Move finished books to "Finished" to log read dates and ratings.
- **Analytics View**: Access "Analytics" from the sidebar to inspect graphs of your read books by month, favorite genres, author counts, and current streak.

### Direct API Examples

#### Search for a Book
```bash
curl -X GET "http://localhost:8000/search?q=Dune"
```

#### Retrieve Recommendations by Title
```bash
curl -X GET "http://localhost:8000/recommend?title=Dune&n=5"
```

#### Natural Language Content Search
```bash
curl -X GET "http://localhost:8000/search_by_text?q=dystopian+space+opera+with+politics&n=10"
```

#### Mood Recommendations
```bash
curl -X GET "http://localhost:8000/mood?mood=dark&n=8"
```

#### Catalog Filtering
```bash
curl -X GET "http://localhost:8000/popular?genre=fantasy&language=english&year_min=2000&year_max=2024&n=10"
```

---

## 21. Results

- **Scale of Indexed Knowledge**: 2,360,000+ distinct titles unified from disparate sources into a single 7.3 GB SQLite database with full-text FTS5 search capabilities.
- **Predictive Accuracy**: PyTorch Matrix Factorization converged to an RMSE of 0.838 stars on 5.97 million real-world interaction records.
- **Query Efficiency**: Sub-10 millisecond execution times achieved for catalog queries and text searches via SQLite indexes and in-memory LRU caching.
- **Deduplication Precision**: Canonical hashing systematically eliminates repeated editions, translations, and multi-volume sets, preserving diversity across recommendation outputs.
- **Zero-Backend Client Tracking**: Fully functional reading journey management and interactive chart generation executing purely inside browser memory via LocalStorage.

---

## 22. Future Improvements

- **Transformer Dense Embeddings**: Integrate Sentence-BERT or multilingual transformer embeddings (e.g., `all-MiniLM-L6-v2`) via Vectorlite or FAISS for deep semantic vector search.
- **Real-Time Contextual Bandits**: Implement multi-armed bandit algorithms to adapt recommendation weights in response to client-side dwell time and click-through signals.
- **Cross-Lingual Semantic Matching**: Align multi-language representations so that queries in one language match translated editions across the worldwide catalog.
- **Cloud Account Syncing**: Introduce optional end-to-end encrypted remote database syncing (e.g., PostgreSQL with Supabase) for cross-device shelf continuity.

---

## 23. Challenges & Solutions

### Challenge 1: Excessive File Sizes Exceeding Git & Host Limits
- **Problem**: The unified SQLite database (`books.db`) is 7.3 GB, and raw UCSD datasets exceed 1.2 GB compressed, far surpassing GitHub's 100 MB file limit.
- **Solution**: Excluded database binaries and raw data files via `.gitignore`. Authored production deployment blueprints using Fly.io with a dedicated 10 GB persistent NVMe volume mounted at `/data/books.db`.

### Challenge 2: Recommendation Dilution from Repeated Editions
- **Problem**: Queries frequently returned multiple entries for the same title across paperback, hardcover, anniversary, and translated editions.
- **Solution**: Developed `canonical_book_key()` and `_series_key()` algorithms that strip subtitles, parenthetical tags, and edition keywords to enforce single-work identity and restrict series entries to a maximum of two titles.

### Challenge 3: Cold-Start Problem for Newly Cataloged Books
- **Problem**: Books with few or no reader ratings could not produce meaningful collaborative filtering vectors.
- **Solution**: Designed a fallback hierarchy that transitions to TF-IDF content similarity and Open Library subject listings when collaborative interaction counts fall below threshold.

### Challenge 4: Memory Exhaustion during Multi-Million Row Database Construction
- **Problem**: Ingesting 2.36 million JSON records and 1.78 million Parquet rows caused out-of-memory errors on consumer machines.
- **Solution**: Implemented chunked generator streams with PyArrow and `gzip`, batching inserts at 50,000 records per transaction with `PRAGMA synchronous = OFF` and `PRAGMA journal_mode = MEMORY`.

---

## 24. Learning Outcomes

- Engineering hybrid recommendation systems combining explicit interaction matrices and natural language text features.
- High-performance relational schema and full-text search design for multi-gigabyte text datasets in SQLite.
- Training and serializing PyTorch neural embedding models on large-scale sparse tabular data.
- Decoupled full-stack architecture design, connecting an asynchronous Python API with a reactive, component-driven client.
- Implementation of client-side privacy-first data persistence and on-the-fly analytical metric computation.

---

## 25. Contributors

- **Sreya Nandi** - Core architecture, data pipeline engineering, model development, API design, and frontend implementation.
- Open-source dataset contributors from the UCSD Goodreads Research Group and Kaggle Book communities.

---
