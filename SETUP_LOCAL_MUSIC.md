# 🎵 FREE Local Music Generation Setup

Generate unlimited AI music with **ZERO COST** using your own computer!

## What You Get

- ✅ **100% FREE** - No API keys, no credits, no limits
- ✅ **Unlimited songs** - Generate as many as you want
- ✅ **Same AI model** - Meta's MusicGen (same as Replicate uses)
- ✅ **Full privacy** - Everything runs on your machine
- ✅ **No internet required** - After initial setup

## Quick Start (5 minutes)

### Step 1: Install Python Dependencies

```bash
cd music-gen-server
pip install -r requirements.txt
```

**Note:** First install downloads ~2GB of model files (one-time).

**Troubleshooting:**
- If `pip` not found, try `pip3`
- If permission error, try `pip install --user -r requirements.txt`

### Step 2: Start Music Generation Server

```bash
python server.py
```

You should see:
```
🎵 LOCAL MUSIC GENERATION SERVER
Running on: http://localhost:8000
```

**Keep this terminal open!** The server needs to run while you use the app.

### Step 3: Start Web App (New Terminal)

```bash
# In a NEW terminal window
cd ..
npm install
npm run dev
```

Visit: http://localhost:3000

### Step 4: Generate Music! 🎉

1. Enter a prompt: "upbeat electronic dance music"
2. Choose genre, mood, duration
3. Click "Generate"
4. Wait ~2 minutes (first generation)
5. Enjoy your FREE AI-generated music!

## How It Works

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Next.js    │  HTTP   │   Python     │  Local  │  MusicGen   │
│  Web App    ├────────►│   FastAPI    ├────────►│  AI Model   │
│ (Port 3000) │         │  Server      │         │  (Meta)     │
└─────────────┘         │ (Port 8000)  │         └─────────────┘
                        └──────────────┘
```

1. You type a prompt in the web app
2. Web app sends request to local Python server
3. Python server runs MusicGen AI model
4. Generated audio is saved and returned
5. Web app plays your song!

## Performance

### CPU (What you probably have):
- **Small model:** ~2 min per 10-second song
- **Medium model:** ~5 min per 10-second song
- **Large model:** ~10 min per 10-second song

### GPU (If you have NVIDIA graphics card):
- **Any model:** ~30 seconds per song! 🚀

To enable GPU (if you have one):
```bash
pip uninstall torch torchaudio
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## Model Comparison

| Model  | Quality | Speed (CPU) | Size  | Memory |
|--------|---------|-------------|-------|--------|
| Small  | Good    | 2 min       | 300MB | 2GB    |
| Medium | Better  | 5 min       | 1.5GB | 4GB    |
| Large  | Best    | 10 min      | 3.3GB | 8GB    |

**Default:** Small (recommended for most users)

## Configuration

### Change Model Size

Edit `music-gen-server/server.py`:

```python
# Line 39 - Change "small" to "medium" or "large"
model_size: str = "small"
```

### Adjust Duration

Longer songs = more time:
- 10 seconds = 2 min
- 30 seconds = 6 min
- 60 seconds = 12 min (on CPU)

## Troubleshooting

### "Local music server not running"
**Solution:** Make sure the Python server is running in a separate terminal:
```bash
cd music-gen-server
python server.py
```

### Out of Memory Error
**Solutions:**
1. Use small model instead of medium/large
2. Close other programs
3. Generate shorter durations (10s instead of 30s)

### "ModuleNotFoundError: No module named 'audiocraft'"
**Solution:**
```bash
cd music-gen-server
pip install -r requirements.txt
```

### Slow Generation
**Normal!** CPU generation takes time. Options:
1. Use small model (fastest)
2. Generate shorter songs
3. Get a computer with NVIDIA GPU for 10x speed
4. Be patient and grab a coffee ☕

### Server won't start
**Check Python version:**
```bash
python --version  # Should be 3.8+
```

If too old, install newer Python from python.org

## Advanced: Google Colab (Free GPU!)

Want faster generation without buying a GPU?

1. Open `music-gen-server/colab_notebook.ipynb` (coming soon)
2. Click "Run All" in Google Colab
3. Get a public URL for your server
4. Update `.env`: `LOCAL_MUSIC_SERVER=https://your-colab-url.ngrok.io`

Now you have FREE GPU-powered generation! (~30 sec per song)

## FAQ

**Q: Is this really free?**
A: Yes! The model runs on your computer. No API calls, no charges.

**Q: How is the quality compared to Suno or Replicate?**
A: Same model as Replicate MusicGen. Quality is identical.

**Q: Can I use this commercially?**
A: Yes! MusicGen is MIT licensed for commercial use.

**Q: Why is it slow?**
A: AI music generation is computationally intensive. Your CPU has to do millions of calculations. This is normal!

**Q: Will this damage my computer?**
A: No! It's just using CPU like any other program. Your computer will get warm but that's normal.

**Q: Can I run this on a Raspberry Pi?**
A: Technically yes, but it would be VERY slow (30+ min per song). Not recommended.

**Q: Does it need internet?**
A: Only for initial setup (downloading model files). After that, 100% offline!

## Tips for Best Results

1. **Be specific in prompts:**
   - ❌ "music"
   - ✅ "upbeat electronic dance music with heavy bass"

2. **Start with short durations** (10s) to test quickly

3. **Use genre + mood + style:**
   - "jazzy lounge music, relaxed, piano-focused"
   - "aggressive rock metal, distorted guitars, fast drums"

4. **Keep server running** - Restarting loses warmup time

5. **First generation is slowest** - Model needs to load

## Comparison: Local vs Cloud

| Feature        | Local (FREE)    | Replicate ($)   |
|----------------|-----------------|-----------------|
| Cost           | $0              | $0.05/song      |
| Speed (CPU)    | 2-10 min        | 30 sec          |
| Speed (GPU)    | 30 sec          | 30 sec          |
| Limit          | Unlimited       | Pay per use     |
| Privacy        | 100% private    | Sent to cloud   |
| Internet       | Not needed      | Required        |
| Setup          | 5 min           | Get API key     |

## Next Steps

- Generate your first song!
- Experiment with different prompts
- Try different genres and moods
- Share your creations!

## Support

Having issues?

1. Check troubleshooting section above
2. Ensure Python 3.8+ installed
3. Ensure enough RAM (2GB+ free)
4. Check server logs for error messages

---

**🎉 Enjoy making unlimited FREE AI music!**
