# 🎵 Local Music Generation Server

100% FREE AI music generation using Meta's MusicGen.
No API keys, no credits, no limits!

## Quick Start

### 1. Install Dependencies

```bash
cd music-gen-server
pip install -r requirements.txt
```

**Note:** First install will download ~2GB model files. This happens once.

### 2. Start Server

```bash
python server.py
```

Server runs at: `http://localhost:8000`

### 3. Test It

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "upbeat electronic dance music", "duration": 10}'
```

Or visit: `http://localhost:8000/docs` for interactive API docs

## Model Sizes

Choose based on your hardware:

| Model  | Size  | Speed (CPU) | Quality |
|--------|-------|-------------|---------|
| small  | 300MB | ~2 min/song | Good    |
| medium | 1.5GB | ~5 min/song | Better  |
| large  | 3.3GB | ~10min/song | Best    |

**Default:** `small` (best balance for CPU)

## API Endpoints

### POST /generate
Generate music from text prompt

**Request:**
```json
{
  "prompt": "relaxing piano jazz",
  "duration": 10,
  "model_size": "small"
}
```

**Response:**
```json
{
  "id": "abc123",
  "status": "completed",
  "audio_url": "/outputs/song_abc123.wav",
  "progress": 1.0
}
```

### GET /outputs/{filename}
Download generated audio file

## Integration with Next.js App

Update your `.env`:

```bash
LOCAL_MUSIC_SERVER=http://localhost:8000
```

The Next.js app will automatically use the local server instead of Replicate!

## Tips

- **First run:** Model download takes 5-10 mins (one-time)
- **Generation:** 2-10 mins per song on CPU
- **GPU:** If you have NVIDIA GPU, 10x faster (~30 sec)
- **Keep running:** Leave server running while using the app

## Troubleshooting

### Out of Memory?
Use smaller model:
```python
model_size = "small"  # instead of medium/large
```

### Too Slow?
- Reduce duration: 10s instead of 30s
- Use Google Colab for free GPU (coming soon!)

### Import Errors?
```bash
pip install --upgrade audiocraft torch torchaudio
```

## GPU Support (Optional)

If you have NVIDIA GPU:

```bash
# Uninstall CPU torch
pip uninstall torch torchaudio

# Install GPU version
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

10x faster generation! 🚀
