# 🎯 Smart Caching System

Never generate the same song twice! The music generation server now includes intelligent caching to save massive amounts of time.

## How It Works

### Before (No Cache):
```
User: "upbeat electronic dance music"
Server: *generates for 2 minutes*
User: "upbeat electronic dance music" (again)
Server: *generates for 2 minutes AGAIN* 😓
```

### After (With Cache):
```
User: "upbeat electronic dance music"
Server: *generates for 2 minutes*
Database: *saves song*

User: "upbeat electronic dance music" (again)
Database: *finds match*
Server: *returns instantly* ⚡ (0.1 seconds!)
```

## Cache Key

Songs are cached based on:
- **Prompt** (normalized and lowercased)
- **Genre**
- **Mood**
- **Duration**
- **Model size**

If ANY of these change, it's considered a different song.

### Examples:

**These are CACHED (same):**
```
"Upbeat Electronic Dance Music" == "upbeat electronic dance music"
"EDM  with   spaces" == "EDM with spaces"
```

**These are NOT cached (different):**
```
"upbeat electronic" ≠ "relaxed electronic" (different mood implied)
Duration 10s ≠ Duration 30s
Model "small" ≠ Model "medium"
```

## Database Schema

SQLite database: `music_cache.db`

### Songs Table:
```sql
CREATE TABLE songs (
    id INTEGER PRIMARY KEY,
    prompt TEXT,                    -- Original user prompt
    normalized_prompt TEXT,         -- Normalized for matching
    prompt_hash TEXT UNIQUE,        -- SHA256 hash for fast lookup
    genre TEXT,
    mood TEXT,
    duration INTEGER,
    model_size TEXT,
    audio_path TEXT,                -- Path to WAV file
    file_size INTEGER,              -- Bytes
    sample_rate INTEGER,            -- Hz
    created_at TIMESTAMP,
    last_accessed TIMESTAMP,
    access_count INTEGER            -- How many times served from cache
)
```

### Stats Table:
```sql
CREATE TABLE stats (
    total_generations INTEGER,      -- Songs generated (not cached)
    cache_hits INTEGER,             -- Times cache was used
    cache_misses INTEGER,           -- Times had to generate
    total_generation_time REAL,     -- Seconds spent generating
    time_saved REAL,                -- Seconds saved by cache
    updated_at TIMESTAMP
)
```

## Benefits

### Time Savings:
- **First generation:** 120 seconds (2 minutes)
- **Cached:** 0.1 seconds (instant!)
- **Savings per cache hit:** ~2 minutes

### Real-World Example:
```
10 songs generated = 20 minutes
5 cache hits = 0.5 seconds (saved 10 minutes!)
```

### Storage:
- Each 10-second song: ~5-10 MB
- 100 cached songs: ~500 MB to 1 GB
- Totally worth it for instant access!

## API Usage

### Check Cache Stats:
```bash
curl http://localhost:8000/stats
```

**Response:**
```json
{
  "total_songs_cached": 15,
  "cache_hits": 8,
  "cache_misses": 7,
  "hit_rate_percent": 53.33,
  "time_saved_seconds": 960.4,
  "message": "You've saved 16.0 minutes by using cache!"
}
```

### View Library:
```bash
curl http://localhost:8000/library?limit=10
```

See all your cached songs sorted by most recent.

### Generation Response:
```json
{
  "cached": true,           // ← Was this from cache?
  "generation_time": 0.08   // ← How long it took
}
```

## Cache Management

### Location:
- Database: `music-gen-server/music_cache.db`
- Audio files: `music-gen-server/outputs/`

### Clear Cache (if needed):
```python
from database import MusicDatabase
db = MusicDatabase()
db.clear_cache()
```

**Warning:** This deletes all cached songs!

### Backup Cache:
```bash
# Backup database
cp music_cache.db music_cache.backup.db

# Backup audio files
cp -r outputs outputs.backup
```

## Similarity Matching

The database can also find similar songs based on keywords:

```python
similar = db.find_similar_songs("electronic dance", "Electronic", limit=5)
```

Useful for:
- "You might also like" suggestions
- Finding variations of prompts
- Building playlists

## Performance

### Lookup Speed:
- Hash-based lookup: **< 1ms**
- Normalized prompt search: **< 10ms**
- Similarity search: **< 50ms**

SQLite is incredibly fast for this use case!

### Scalability:
- ✅ **100 songs:** No problem
- ✅ **1,000 songs:** Still fast
- ✅ **10,000 songs:** May want to add more indexes
- ⚠️ **100,000+ songs:** Consider PostgreSQL

For personal use, SQLite is perfect!

## Cache Hit Rate

### What's Good?
- **0-20%:** Just getting started
- **20-50%:** Decent, building library
- **50-70%:** Great! Lots of reuse
- **70%+:** Excellent! Cache is valuable

### Tips to Improve Hit Rate:
1. **Standardize prompts** - Use consistent wording
2. **Favorite prompts** - Keep a list of good ones
3. **Duration consistency** - Stick to 10s, 30s, or 60s
4. **Model consistency** - Use same model size

## FAQ

**Q: What if I run out of disk space?**
A: Delete old songs from `outputs/` folder. Database is tiny (~1 MB).

**Q: Can I share my cache with others?**
A: Yes! Share `music_cache.db` and `outputs/` folder.

**Q: Does cache work across server restarts?**
A: Yes! It's persistent in SQLite database.

**Q: How do I prevent duplicate prompts?**
A: The system automatically checks before generating!

**Q: Can I manually add songs to cache?**
A: Yes! Use `db.save_song()` in Python.

**Q: What if my prompt is slightly different?**
A: It will generate new. Normalization helps but isn't fuzzy matching yet.

## Future Enhancements

Potential additions:
- 🔄 Fuzzy matching for similar prompts
- 🎵 Audio fingerprinting for duplicate detection
- 📊 Usage analytics dashboard
- 🗑️ Auto-cleanup of least-used songs
- ☁️ Cloud sync for cache sharing
- 🔍 Full-text search on prompts

## Technical Details

### Hash Algorithm:
```python
key = f"{normalized_prompt}|{duration}|{model_size}"
hash = hashlib.sha256(key.encode()).hexdigest()
```

SHA256 ensures:
- Consistent hashing
- No collisions (extremely unlikely)
- Fast comparison

### Normalization:
```python
def normalize(prompt, genre, mood):
    combined = f"{prompt} {genre} {mood}".lower()
    return " ".join(combined.split())  # Remove extra spaces
```

This makes:
- "Upbeat EDM" = "upbeat edm"
- "EDM  music" = "edm music"

---

**🎉 Enjoy instant song generation with smart caching!**
