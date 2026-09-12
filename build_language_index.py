import sqlite3, time, re, sys

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = 'd:/bookwise/bookwise/data/processed/books.db'
conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA synchronous = OFF")
conn.execute("PRAGMA journal_mode = MEMORY")
conn.execute("PRAGMA cache_size = -64000")
c = conn.cursor()

print("Recreating book_languages table...")
c.execute("DROP TABLE IF EXISTS book_languages")
c.execute("""
CREATE TABLE book_languages (
    book_id TEXT PRIMARY KEY,
    language TEXT NOT NULL,
    ratings_count INTEGER,
    publication_year INTEGER
)
""")
conn.commit()

# Compiled regexes for scripts
re_bengali = re.compile(r'[\u0980-\u09ff]')
re_bengali_auth = re.compile(r'\b(tagore|rabindranath|satyajit ray|sarat chandra|bankim chandra|kazi nazrul|bibhutibhushan|humayun ahmed|sukumar ray|sunil gangopadhyay|shirshendu|mahasweta devi)\b', re.I)

re_kannada = re.compile(r'[\u0c80-\u0cff]')
re_kannada_auth = re.compile(r'\b(kuvempu|bhyrappa|tejaswi|ananthamurthy|shivaram karanth|masti venkatesha|bendre|girish karnad|triveni|gokak|kambara|devanur mahadeva|poornachandra)\b', re.I)

re_tamil = re.compile(r'[\u0b80-\u0bff]')
re_tamil_auth = re.compile(r'\b(kalki|kalki krishnamurthy|subramania bharati|sujatha|jayakanthan|kannadasan|perumal murugan)\b', re.I)

re_telugu = re.compile(r'[\u0c00-\u0c7f]')
re_telugu_auth = re.compile(r'\b(sri sri|gurazada|viswanatha satyanarayana|chalam|yandamuri)\b', re.I)

re_malayalam = re.compile(r'[\u0d00-\u0d7f]')
re_malayalam_auth = re.compile(r'\b(vaikom|basheer|vasudevan nair|thakazhi|o\.?\s*v\.?\s*vijayan)\b', re.I)

re_hindi = re.compile(r'[\u0900-\u097f]')
re_hindi_auth = re.compile(r'\b(premchand|harivansh rai|dinkar|dharamvir bharati|phanishwar nath|mahadevi varma|jaishankar prasad|surya kant tripathi)\b', re.I)

re_arabic = re.compile(r'[\u0600-\u06ff]')
re_japanese = re.compile(r'[\u3040-\u30ff]')
re_cjk = re.compile(r'[\u4e00-\u9fa5]')
re_korean = re.compile(r'[\uac00-\ud7af\u1100-\u11ff]')
re_russian = re.compile(r'[\u0400-\u04ff]')
re_greek = re.compile(r'[\u0370-\u03ff]')
re_hebrew = re.compile(r'[\u0590-\u05ff]')

re_eng_stopwords = re.compile(r'\b(the|and|of|in|to|with|for|on|at|by|from|about|into|through|after|before)\b', re.I)

re_es = re.compile(r'\b(el|la|los|las|del|de la|de los|en el|en la|para|por|una|uno|con|y|sin|sobre|hacia|desde)\b', re.I)
re_fr = re.compile(r'\b(le|la|les|du|des|de la|dans|pour|une|un|et|sur|avec|sans|sous)\b', re.I)
re_de = re.compile(r'\b(der|die|das|den|dem|des|ein|eine|eines|einem|einen|und|für|mit|von|zu|auf|im)\b', re.I)
re_it = re.compile(r'\b(il|lo|la|i|gli|le|del|della|delle|degli|dei|nel|nella|nelle|negli|nei|per|con|un|una)\b', re.I)
re_pt = re.compile(r'\b(o|os|as|do|da|dos|das|no|na|nos|nas|com|para|uma|um|sem|sob|sobre)\b', re.I)

def detect_non_english(title, authors=""):
    text = f"{title} {authors}"
    
    # 1. Indic & Asian / Cyrillic / Semitic scripts & celebrated authors
    if re_bengali.search(text) or re_bengali_auth.search(text):
        return "bengali"
    if re_kannada.search(text) or re_kannada_auth.search(text):
        return "kannada"
    if re_tamil.search(text) or re_tamil_auth.search(text):
        return "tamil"
    if re_telugu.search(text) or re_telugu_auth.search(text):
        return "telugu"
    if re_malayalam.search(text) or re_malayalam_auth.search(text):
        return "malayalam"
    if re_hindi.search(text) or re_hindi_auth.search(text):
        return "hindi"
    if re_arabic.search(text):
        return "arabic"
    if re_japanese.search(text):
        return "japanese"
    if re_korean.search(text):
        return "korean"
    if re_cjk.search(text):
        return "chinese"
    if re_russian.search(text):
        return "russian"
    if re_greek.search(text):
        return "greek"
    if re_hebrew.search(text):
        return "hebrew"
        
    # 2. European languages (only if NOT containing English stopwords)
    t_lower = f" {title.lower()} "
    if not re_eng_stopwords.search(t_lower):
        if re_es.search(t_lower):
            return "spanish"
        if re_fr.search(t_lower):
            return "french"
        if re_de.search(t_lower):
            return "german"
        if re_it.search(t_lower):
            return "italian"
        if re_pt.search(t_lower):
            return "portuguese"
            
    return None

print("Scanning books and populating non-English book_languages...", flush=True)
t0 = time.time()
c.execute("SELECT book_id, title, authors, ratings_count, publication_year FROM books")

batch = []
total = 0
inserted = 0
lang_stats = {}

for row in c:
    total += 1
    bid, title, authors, ratings_count, pyear = row
    lang = detect_non_english(title, authors or "")
    if lang:
        batch.append((bid, lang, ratings_count or 0, pyear or 0))
        lang_stats[lang] = lang_stats.get(lang, 0) + 1
        inserted += 1
        
        if len(batch) >= 20000:
            c2 = conn.cursor()
            c2.executemany("INSERT OR REPLACE INTO book_languages VALUES (?, ?, ?, ?)", batch)
            conn.commit()
            batch = []
            
    if total % 500000 == 0:
        print(f"  Scanned {total:,} books, found {inserted:,} non-English ({time.time()-t0:.1f}s)...", flush=True)

if batch:
    c2 = conn.cursor()
    c2.executemany("INSERT OR REPLACE INTO book_languages VALUES (?, ?, ?, ?)", batch)
    conn.commit()

print(f"Creating indexes on book_languages ({inserted:,} rows)...", flush=True)
c.execute("CREATE INDEX idx_bl_lang ON book_languages(language, ratings_count DESC)")
c.execute("CREATE INDEX idx_bl_lang_year ON book_languages(language, publication_year, ratings_count DESC)")
conn.commit()

print(f"Finished in {time.time()-t0:.1f}s! Total non-English books indexed: {inserted:,}", flush=True)
print("Language breakdown:", flush=True)
for lang, cnt in sorted(lang_stats.items(), key=lambda x: -x[1]):
    print(f"  {lang:12s}: {cnt:,}", flush=True)

conn.close()
