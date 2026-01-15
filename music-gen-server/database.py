#!/usr/bin/env python3
"""
Database service for caching generated songs
Uses SQLite - no extra dependencies needed!
"""

import sqlite3
import hashlib
import json
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime


class MusicDatabase:
    """Cache generated songs to avoid regenerating same prompts"""

    def __init__(self, db_path: str = "./music_cache.db"):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        """Create database tables if they don't exist"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Songs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt TEXT NOT NULL,
                normalized_prompt TEXT NOT NULL,
                prompt_hash TEXT NOT NULL UNIQUE,
                genre TEXT,
                mood TEXT,
                duration INTEGER,
                model_size TEXT,
                audio_path TEXT NOT NULL,
                file_size INTEGER,
                sample_rate INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                access_count INTEGER DEFAULT 1
            )
        """)

        # Index for fast lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_prompt_hash
            ON songs(prompt_hash)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_normalized_prompt
            ON songs(normalized_prompt)
        """)

        # Generation stats table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                total_generations INTEGER DEFAULT 0,
                cache_hits INTEGER DEFAULT 0,
                cache_misses INTEGER DEFAULT 0,
                total_generation_time REAL DEFAULT 0,
                time_saved REAL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Initialize stats if empty
        cursor.execute("SELECT COUNT(*) FROM stats")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO stats (total_generations, cache_hits, cache_misses)
                VALUES (0, 0, 0)
            """)

        conn.commit()
        conn.close()

        print(f"✅ Database initialized: {self.db_path}")

    def normalize_prompt(self, prompt: str, genre: str = "", mood: str = "") -> str:
        """
        Normalize prompt for consistent matching
        - Lowercase
        - Remove extra spaces
        - Sort words for better matching
        """
        combined = f"{prompt} {genre} {mood}".lower()
        # Remove extra whitespace
        combined = " ".join(combined.split())
        return combined

    def hash_prompt(self, normalized_prompt: str, duration: int, model_size: str) -> str:
        """
        Create unique hash for prompt + parameters
        Same prompt with same settings = same hash = cached result
        """
        key = f"{normalized_prompt}|{duration}|{model_size}"
        return hashlib.sha256(key.encode()).hexdigest()

    def find_cached_song(
        self,
        prompt: str,
        genre: str = "",
        mood: str = "",
        duration: int = 10,
        model_size: str = "small"
    ) -> Optional[Dict]:
        """
        Check if we've already generated this exact song
        Returns cached audio path if found, None otherwise
        """
        normalized = self.normalize_prompt(prompt, genre, mood)
        prompt_hash = self.hash_prompt(normalized, duration, model_size)

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM songs
            WHERE prompt_hash = ?
        """, (prompt_hash,))

        row = cursor.fetchone()

        if row:
            # Update access stats
            cursor.execute("""
                UPDATE songs
                SET last_accessed = CURRENT_TIMESTAMP,
                    access_count = access_count + 1
                WHERE id = ?
            """, (row['id'],))

            # Update global stats - cache hit!
            cursor.execute("""
                UPDATE stats
                SET cache_hits = cache_hits + 1,
                    updated_at = CURRENT_TIMESTAMP
            """)

            conn.commit()

            result = dict(row)
            conn.close()

            print(f"🎉 Cache HIT! Found existing song: {result['audio_path']}")
            return result

        conn.close()

        # Cache miss
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE stats
            SET cache_misses = cache_misses + 1,
                updated_at = CURRENT_TIMESTAMP
        """)
        conn.commit()
        conn.close()

        print(f"❌ Cache MISS - will generate new song")
        return None

    def save_song(
        self,
        prompt: str,
        audio_path: str,
        genre: str = "",
        mood: str = "",
        duration: int = 10,
        model_size: str = "small",
        generation_time: float = 0,
        file_size: int = 0,
        sample_rate: int = 32000
    ):
        """Save generated song to database"""
        normalized = self.normalize_prompt(prompt, genre, mood)
        prompt_hash = self.hash_prompt(normalized, duration, model_size)

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO songs (
                    prompt, normalized_prompt, prompt_hash,
                    genre, mood, duration, model_size,
                    audio_path, file_size, sample_rate
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                prompt, normalized, prompt_hash,
                genre, mood, duration, model_size,
                audio_path, file_size, sample_rate
            ))

            # Update global stats
            cursor.execute("""
                UPDATE stats
                SET total_generations = total_generations + 1,
                    total_generation_time = total_generation_time + ?,
                    updated_at = CURRENT_TIMESTAMP
            """, (generation_time,))

            conn.commit()
            print(f"💾 Saved to database: {audio_path}")

        except sqlite3.IntegrityError:
            # Already exists (shouldn't happen but just in case)
            print(f"⚠️  Song already in database")

        conn.close()

    def find_similar_songs(
        self,
        prompt: str,
        genre: str = "",
        limit: int = 5
    ) -> List[Dict]:
        """
        Find similar songs based on prompt keywords
        Useful for "you might also like" suggestions
        """
        normalized = self.normalize_prompt(prompt, genre)
        keywords = normalized.split()[:5]  # First 5 words

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Build LIKE query for keyword matching
        conditions = " OR ".join(["normalized_prompt LIKE ?" for _ in keywords])
        params = [f"%{kw}%" for kw in keywords]
        params.append(limit)

        cursor.execute(f"""
            SELECT * FROM songs
            WHERE {conditions}
            ORDER BY access_count DESC, created_at DESC
            LIMIT ?
        """, params)

        results = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return results

    def get_stats(self) -> Dict:
        """Get cache statistics"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM stats LIMIT 1")
        stats = dict(cursor.fetchone())

        # Calculate cache hit rate
        total_requests = stats['cache_hits'] + stats['cache_misses']
        if total_requests > 0:
            stats['hit_rate'] = stats['cache_hits'] / total_requests * 100
        else:
            stats['hit_rate'] = 0

        # Get total songs in cache
        cursor.execute("SELECT COUNT(*) as total_songs FROM songs")
        stats['total_songs'] = cursor.fetchone()['total_songs']

        # Calculate space saved
        if stats['cache_hits'] > 0:
            avg_time = stats['total_generation_time'] / max(stats['total_generations'], 1)
            stats['time_saved'] = stats['cache_hits'] * avg_time
        else:
            stats['time_saved'] = 0

        conn.close()

        return stats

    def list_recent_songs(self, limit: int = 20) -> List[Dict]:
        """Get recently generated songs"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM songs
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,))

        results = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return results

    def clear_cache(self):
        """Clear all cached songs (use with caution!)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM songs")
        cursor.execute("""
            UPDATE stats
            SET total_generations = 0,
                cache_hits = 0,
                cache_misses = 0,
                total_generation_time = 0,
                time_saved = 0,
                updated_at = CURRENT_TIMESTAMP
        """)

        conn.commit()
        conn.close()

        print("🗑️  Cache cleared")


if __name__ == "__main__":
    # Test the database
    db = MusicDatabase()

    # Simulate a generation
    test_prompt = "upbeat electronic dance music"
    cached = db.find_cached_song(test_prompt, "Electronic", "Happy", 10, "small")

    if not cached:
        print("Would generate new song...")
        db.save_song(
            prompt=test_prompt,
            audio_path="./outputs/test_song.wav",
            genre="Electronic",
            mood="Happy",
            duration=10,
            model_size="small",
            generation_time=120.5
        )

    # Check stats
    stats = db.get_stats()
    print("\n📊 Cache Statistics:")
    print(f"  Total songs in cache: {stats['total_songs']}")
    print(f"  Cache hits: {stats['cache_hits']}")
    print(f"  Cache misses: {stats['cache_misses']}")
    print(f"  Hit rate: {stats['hit_rate']:.1f}%")
    print(f"  Time saved: {stats['time_saved']:.1f} seconds")
