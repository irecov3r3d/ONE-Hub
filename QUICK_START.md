# 🚀 QUICK START - NO API KEYS NEEDED

## Get It Running in 3 Steps (100% Free Demo Mode)

### Step 1: Install Dependencies
```bash
npm install
```
This downloads all the code libraries needed (takes ~2 minutes).

### Step 2: Start the App
```bash
npm run dev
```
This starts your local server. Wait until you see:
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

### Step 3: Open Your Browser
Go to: **http://localhost:3000**

That's it! You're running!

---

## 🎵 What Works WITHOUT API Keys (Demo Mode)

When you don't have API keys, the app uses **free demo music samples** from soundhelix.com.

### ✅ WORKS (100% Free):
- **Song Generator** - Enter prompts, pick genre/mood, generate songs
  - Returns pre-made samples based on genre (Pop, Rock, Jazz, etc.)
  - 6 different sample tracks to try
  - Works immediately, no setup

- **Audio Player** - Play/pause, seek, volume control
- **Song Library** - See all your generated songs
- **Download** - Save the demo tracks

### ❌ DOESN'T WORK (Needs API Keys):
- Real AI generation (would need $5-20/month Replicate account)
- Stem separation (needs paid service)
- AI lyrics generation (needs OpenAI/Anthropic)
- Album art generation (needs DALL-E or Stable Diffusion)
- Professional mastering (needs LANDR)

---

## 🎭 How Demo Mode Works

**What happens when you click "Generate":**

1. You type: "upbeat summer song", genre: Pop, mood: Happy
2. App waits 3 seconds (simulates AI thinking)
3. App returns a pre-made Pop song from soundhelix.com
4. Player loads it and you can listen/download

**It's not AI-generated music, but it lets you test the entire UI and workflow for FREE.**

---

## 🔧 Common Issues

**"npm: command not found"**
- You need to install Node.js first: https://nodejs.org/

**Port 3000 already in use**
- Something else is using that port
- Kill it: `npx kill-port 3000`
- Or use different port: `npm run dev -- -p 3001`

**Can't access localhost:3000**
- Make sure npm run dev is still running
- Try http://127.0.0.1:3000 instead

---

## 💰 Want Real AI Music Generation?

If you want ACTUAL AI music (not just demos), you need:

**Minimum Setup ($5 to start):**
1. Sign up at https://replicate.com (they give $5 free credit)
2. Get your API token from account settings
3. Create `.env.local` file in this folder
4. Add this line:
   ```
   REPLICATE_API_TOKEN=r8_your_actual_token_here
   ```
5. Restart the app (`Ctrl+C` then `npm run dev` again)

**Cost:** ~$0.05 per song generation with real AI

But for now, just enjoy the free demo mode!
