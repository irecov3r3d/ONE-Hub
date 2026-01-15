#!/usr/bin/env python3
"""
Local Music Generation Server
Runs MusicGen (Meta) for FREE AI music generation
No API keys needed!
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torchaudio
from audiocraft.models import MusicGen
import uuid
import os
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor
from database import MusicDatabase
import time

app = FastAPI(title="Local Music Generator")

# Enable CORS for Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model cache
model = None
executor = ThreadPoolExecutor(max_workers=1)

# Database for caching songs
db = MusicDatabase()

# Output directory
OUTPUT_DIR = Path("./outputs")
OUTPUT_DIR.mkdir(exist_ok=True)


class GenerationRequest(BaseModel):
    prompt: str
    genre: str = ""
    mood: str = ""
    duration: int = 10  # seconds
    model_size: str = "small"  # small, medium, large


class GenerationResponse(BaseModel):
    id: str
    status: str
    audio_url: str = None
    progress: float = 0.0
    cached: bool = False
    generation_time: float = 0.0


def load_model(model_size: str = "small"):
    """Load MusicGen model (cached)"""
    global model

    if model is None:
        print(f"Loading MusicGen model ({model_size})...")

        # Choose model size
        # small: 300M params, fastest, OK quality
        # medium: 1.5B params, balanced
        # large: 3.3B params, best quality, slowest

        if model_size == "large":
            model = MusicGen.get_pretrained('facebook/musicgen-large')
        elif model_size == "medium":
            model = MusicGen.get_pretrained('facebook/musicgen-medium')
        else:
            model = MusicGen.get_pretrained('facebook/musicgen-small')

        # Use CPU if no GPU available
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        model.to(device)

        print(f"✅ Model loaded on {device}")

    return model


def generate_music_sync(prompt: str, duration: int, model_size: str, output_path: str):
    """
    Synchronous music generation (runs in thread pool)
    """
    try:
        # Load model
        gen_model = load_model(model_size)

        # Set generation parameters
        gen_model.set_generation_params(
            duration=duration,
            temperature=1.0,
            top_k=250,
            top_p=0.0,
            cfg_coef=3.0,
        )

        print(f"Generating: '{prompt}' ({duration}s)")

        # Generate audio
        wav = gen_model.generate([prompt])

        # Save to file
        audio_write(
            output_path,
            wav[0].cpu(),
            gen_model.sample_rate,
            strategy="loudness",
            loudness_compressor=True
        )

        print(f"✅ Generated: {output_path}.wav")
        return True

    except Exception as e:
        print(f"❌ Generation failed: {e}")
        raise


def audio_write(stem_name, wav, sample_rate, strategy="loudness", loudness_compressor=False):
    """Write audio file with normalization"""
    from audiocraft.data.audio_utils import normalize_audio

    # Normalize
    if strategy == "loudness":
        wav = normalize_audio(wav, strategy="loudness", peak_clip_headroom_db=1, loudness_compressor=loudness_compressor)

    # Save as WAV
    output_path = f"{stem_name}.wav"
    torchaudio.save(output_path, wav, sample_rate)


@app.on_event("startup")
async def startup_event():
    """Preload small model on startup"""
    print("🎵 Starting Local Music Generation Server...")
    print("Preloading model (this may take a minute)...")

    # Preload small model in background
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(executor, load_model, "small")

    print("✅ Server ready!")


@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Local Music Generation API",
        "models": ["small", "medium", "large"],
        "device": "cuda" if torch.cuda.is_available() else "cpu"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/generate", response_model=GenerationResponse)
async def generate(request: GenerationRequest):
    """
    Generate music from text prompt (with caching!)
    """
    try:
        start_time = time.time()

        # Check if we've generated this before
        cached_song = db.find_cached_song(
            prompt=request.prompt,
            genre=request.genre,
            mood=request.mood,
            duration=request.duration,
            model_size=request.model_size
        )

        if cached_song:
            # Return cached result instantly!
            audio_filename = os.path.basename(cached_song['audio_path'])
            audio_url = f"/outputs/{audio_filename}"

            elapsed = time.time() - start_time

            return GenerationResponse(
                id=cached_song['id'],
                status="completed",
                audio_url=audio_url,
                progress=1.0,
                cached=True,
                generation_time=elapsed
            )

        # Not cached - generate new music
        gen_id = str(uuid.uuid4())[:8]
        output_path = OUTPUT_DIR / f"song_{gen_id}"

        # Run generation in thread pool (blocking operation)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            executor,
            generate_music_sync,
            request.prompt,
            request.duration,
            request.model_size,
            str(output_path)
        )

        # Return audio URL
        audio_url = f"/outputs/song_{gen_id}.wav"
        audio_file_path = f"{output_path}.wav"

        # Get file size
        file_size = 0
        if os.path.exists(audio_file_path):
            file_size = os.path.getsize(audio_file_path)

        elapsed = time.time() - start_time

        # Save to database for future use
        db.save_song(
            prompt=request.prompt,
            audio_path=audio_file_path,
            genre=request.genre,
            mood=request.mood,
            duration=request.duration,
            model_size=request.model_size,
            generation_time=elapsed,
            file_size=file_size
        )

        return GenerationResponse(
            id=gen_id,
            status="completed",
            audio_url=audio_url,
            progress=1.0,
            cached=False,
            generation_time=elapsed
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/outputs/{filename}")
async def get_audio(filename: str):
    """Serve generated audio files"""
    from fastapi.responses import FileResponse

    file_path = OUTPUT_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path, media_type="audio/wav")


@app.get("/stats")
async def get_stats():
    """Get cache statistics"""
    stats = db.get_stats()
    return {
        "total_songs_cached": stats['total_songs'],
        "cache_hits": stats['cache_hits'],
        "cache_misses": stats['cache_misses'],
        "hit_rate_percent": round(stats['hit_rate'], 2),
        "total_generations": stats['total_generations'],
        "total_generation_time_seconds": round(stats['total_generation_time'], 1),
        "time_saved_seconds": round(stats['time_saved'], 1),
        "message": f"You've saved {round(stats['time_saved'] / 60, 1)} minutes by using cache!"
    }


@app.get("/library")
async def get_library(limit: int = 20):
    """Get recently generated songs"""
    songs = db.list_recent_songs(limit)
    return {
        "songs": songs,
        "total": len(songs)
    }


@app.get("/similar/{song_id}")
async def get_similar_songs(song_id: int, limit: int = 5):
    """Find similar songs to a given song"""
    # Get the original song
    conn = db.conn
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM songs WHERE id = ?", (song_id,))
    song = cursor.fetchone()

    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    # Find similar songs
    similar = db.find_similar_songs(song['prompt'], song['genre'], limit)

    return {
        "original": dict(song),
        "similar": similar
    }


if __name__ == "__main__":
    import uvicorn

    print("=" * 50)
    print("🎵 LOCAL MUSIC GENERATION SERVER")
    print("=" * 50)
    print("Running on: http://localhost:8000")
    print("Docs: http://localhost:8000/docs")
    print("=" * 50)

    uvicorn.run(app, host="0.0.0.0", port=8000)
