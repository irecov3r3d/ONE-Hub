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

# Output directory
OUTPUT_DIR = Path("./outputs")
OUTPUT_DIR.mkdir(exist_ok=True)


class GenerationRequest(BaseModel):
    prompt: str
    duration: int = 10  # seconds
    model_size: str = "small"  # small, medium, large


class GenerationResponse(BaseModel):
    id: str
    status: str
    audio_url: str = None
    progress: float = 0.0


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
    Generate music from text prompt
    """
    try:
        # Generate unique ID
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

        return GenerationResponse(
            id=gen_id,
            status="completed",
            audio_url=audio_url,
            progress=1.0
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


if __name__ == "__main__":
    import uvicorn

    print("=" * 50)
    print("🎵 LOCAL MUSIC GENERATION SERVER")
    print("=" * 50)
    print("Running on: http://localhost:8000")
    print("Docs: http://localhost:8000/docs")
    print("=" * 50)

    uvicorn.run(app, host="0.0.0.0", port=8000)
