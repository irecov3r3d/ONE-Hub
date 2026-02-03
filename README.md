# 🎵 Song Generator Pro - Complete AI Music Creation Platform

A comprehensive, Suno-inspired web application for creating AI-powered music. Generate songs from text, upload and edit audio, separate stems, create lyrics, generate album art, and export in multiple formats - all in one powerful platform.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

---

## ✨ Core Features

### 🎵 AI Song Generation
- **Text-to-Music** - Generate complete songs from descriptions
- **12+ Genres** - Pop, Rock, Hip Hop, Electronic, Jazz, Classical, R&B, Country, Metal, Indie, Folk, Latin
- **12+ Moods** - Happy, Sad, Energetic, Chill, Romantic, Angry, Peaceful, Dark, Uplifting, Mysterious, Nostalgic, Epic
- **Duration Control** - 30 seconds to 5 minutes
- **AI Integration Ready** - Designed to work with Suno, MusicGen, Riffusion

### 📤 File Upload System
- **Drag & Drop Interface** - Easy file uploads
- **Multiple File Types** - Vocals, instrumentals, samples, reference tracks, lyrics
- **Format Support** - MP3, WAV, OGG, M4A, FLAC
- **File Management** - View, organize, and manage uploaded files
- **Auto-Detection** - Automatic audio duration and metadata extraction

### ✍️ AI Lyrics Generator & Editor
- **AI Lyric Generation** - Generate lyrics based on theme, genre, and mood
- **Multi-Language Support** - English, Spanish, French, German, Italian, Portuguese, Japanese, Korean
- **Smart Editor** - Real-time lyric editing with section detection
- **Song Structure Analysis** - Automatic detection of verse, chorus, bridge, etc.
- **Rhyme Scheme Analysis** - Analyze and display rhyme patterns
- **Statistics** - Line count, word count, section breakdown
- **Export** - Download lyrics as text files

### 🌊 Waveform Audio Editor
- **Visual Waveform** - Interactive waveform visualization
- **Trim & Cut** - Precise audio trimming with visual feedback
- **Playback Controls** - Play, pause, seek, volume control
- **Region Selection** - Select and edit specific portions
- **Time Display** - Precise timestamp display
- **Click-to-Seek** - Click waveform to jump to position

### ✂️ Stem Separation
- **AI-Powered Separation** - Isolate vocals, drums, bass, and other instruments
- **Individual Playback** - Listen to each stem separately
- **Download Stems** - Export stems as WAV files
- **Visual Progress** - Real-time processing progress
- **Ready for Integration** - Supports Spleeter, Demucs, Lalal.ai, Moises

### 🎨 Album Art Generator
- **AI Image Generation** - Create stunning cover art
- **5 Art Styles** - Abstract, Realistic, Minimalist, Vintage, Modern
- **Custom Prompts** - Add specific details for customization
- **Auto-Generation** - Based on song title, genre, and mood
- **Download** - Save as high-quality images
- **Preview & Regenerate** - Iterate until perfect

### 📦 Advanced Export System
- **Multiple Formats** - MP3, WAV, FLAC, OGG, M4A
- **Quality Options** - 128kbps to 320kbps (or lossless)
- **Sample Rate Control** - 44.1kHz, 48kHz, 96kHz
- **Include Stems** - Option to export separated stems
- **Include Lyrics** - Attach lyrics file
- **Video Visualizer** - Generate animated waveform videos
- **Batch Export** - Export multiple files at once

### 🎬 Video Visualizer
- **Waveform Animation** - Animated audio visualizations
- **Multiple Styles** - Waveform, spectrum, bars, particles, circular
- **HD Resolution** - 720p, 1080p, 4K options
- **Color Customization** - Custom color schemes
- **Social Media Ready** - Optimized for Instagram, TikTok, YouTube

### 🎛️ Audio Effects
- **Reverb** - Add spatial depth
- **Echo/Delay** - Create echo effects
- **Bass Boost** - Enhance low frequencies
- **Normalize** - Balance audio levels
- **EQ** - Frequency equalization
- **Compression** - Dynamic range control

### 📚 Song Library
- **Organized Display** - View all your creations
- **Metadata Display** - Genre, mood, duration tags
- **Inline Playback** - Play songs directly in library
- **Quick Actions** - Download, edit, delete

---

## 🚀 Getting Started

### 🐧 Linux Mint Desktop Environment
See [LINUX_MINT_ENVIRONMENT.md](LINUX_MINT_ENVIRONMENT.md) for a Linux Mint desktop setup tailored to building and running ONE-Hub locally.

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/irecov3r3d/ONE-Hub.git
   cd ONE-Hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🎯 How to Use

### Generate Tab
1. Enter a description of your song (e.g., "An upbeat summer anthem about friendship")
2. Select genre and mood
3. Choose duration
4. Click "Generate Song"
5. Wait for AI to create your music

### Upload Tab
1. Drag and drop audio files or click to browse
2. Upload vocals, instrumentals, samples, or reference tracks
3. Files appear in your uploaded list
4. Use in other features (waveform editor, stems, etc.)

### Lyrics Tab
1. Click "Generate Lyrics with AI" for auto-generated lyrics
2. Or write/paste your own lyrics
3. Edit in the text editor
4. View automatic section detection
5. See rhyme scheme analysis
6. Download or copy lyrics

### Waveform Editor Tab
1. Generate or upload a song first
2. View interactive waveform
3. Click to seek to specific positions
4. Use trim controls to cut audio
5. Apply audio effects
6. Save edited version

### Stems Tab
1. Select a song from library or upload
2. Click "Separate Stems"
3. Wait for AI processing
4. Listen to isolated vocals, drums, bass, other
5. Download individual stems

### Album Art Tab
1. Generate a song first
2. Select art style (Abstract, Realistic, etc.)
3. Optionally add custom prompt
4. Click "Generate Art"
5. Download or regenerate

### Export Tab
1. Select audio format (MP3, WAV, FLAC, etc.)
2. Choose quality settings
3. Select sample rate
4. Optionally include stems or lyrics
5. Click "Export Audio"
6. Or generate visualizer video

### Library Tab
- View all generated songs
- Play directly from library
- Access metadata and controls
- Manage your collection

---

## 🏗️ Project Structure

```
ONE-Hub/
├── app/
│   ├── api/
│   │   ├── audio/
│   │   │   ├── effects/route.ts      # Audio effects API
│   │   │   ├── stems/route.ts        # Stem separation API
│   │   │   └── trim/route.ts         # Audio trimming API
│   │   ├── visual/
│   │   │   ├── album-art/route.ts    # Album art generation
│   │   │   └── visualizer/route.ts   # Video visualizer
│   │   ├── export/route.ts           # Export handler
│   │   ├── generate/route.ts         # Song generation
│   │   └── upload/route.ts           # File upload handler
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Main application
├── components/
│   ├── AlbumArtGenerator.tsx         # Album art UI
│   ├── AudioPlayer.tsx               # Audio playback
│   ├── ExportPanel.tsx               # Export options
│   ├── FileUpload.tsx                # File upload UI
│   ├── LyricEditor.tsx               # Lyrics editor
│   ├── SongGenerator.tsx             # Song creation form
│   ├── SongLibrary.tsx               # Song list
│   ├── StemSeparator.tsx             # Stem separation UI
│   └── WaveformEditor.tsx            # Waveform editor
├── lib/
│   └── services/
│       ├── audioService.ts           # Audio processing logic
│       ├── lyricsService.ts          # Lyrics generation
│       └── visualService.ts          # Visual generation
├── types/
│   └── index.ts                      # TypeScript types
├── public/
│   └── uploads/                      # Uploaded files
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind config
└── package.json                      # Dependencies
```

---

## 🤖 AI Service Integration

The platform is designed with a modular service layer for easy AI integration. Currently uses mock implementations - replace with actual APIs:

### Song Generation

**Option 1: Suno API** (Recommended if available)
```typescript
// In app/api/generate/route.ts
const response = await fetch('https://api.suno.ai/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
  },
  body: JSON.stringify({ prompt, genre, duration }),
});
```

**Option 2: MusicGen (Meta)**
```typescript
// Via Replicate
const response = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
  },
  body: JSON.stringify({
    version: 'facebook/musicgen-large',
    input: { prompt, duration },
  }),
});
```

**Option 3: Riffusion**
```typescript
const response = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  body: JSON.stringify({
    version: 'riffusion/riffusion',
    input: { prompt_a: prompt },
  }),
});
```

### Stem Separation

**Option 1: Spleeter** (Free, self-hosted)
- Python library by Deezer
- Best free option
- Requires GPU for speed

**Option 2: Demucs** (Free, self-hosted)
- Meta's newer model
- Better quality than Spleeter
- GPU recommended

**Option 3: Lalal.ai API** (Paid)
- Commercial service
- High quality, easy integration

**Option 4: Moises API** (Paid)
- Good quality
- Multiple instrument separation

### Lyrics Generation

**Option 1: OpenAI GPT-4**
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{
    role: "system",
    content: "You are a professional songwriter..."
  }, {
    role: "user",
    content: `Write ${genre} lyrics about ${theme}`
  }]
});
```

**Option 2: Anthropic Claude**
```typescript
const response = await anthropic.messages.create({
  model: "claude-3-opus-20240229",
  messages: [{
    role: "user",
    content: `Write song lyrics...`
  }]
});
```

### Album Art Generation

**Option 1: DALL-E 3**
```typescript
const response = await openai.images.generate({
  model: "dall-e-3",
  prompt: "Album cover art...",
  size: "1024x1024",
  quality: "hd"
});
```

**Option 2: Stable Diffusion XL**
Via Replicate or Stability AI API

**Option 3: Midjourney**
Via unofficial API wrappers

### Video Visualizer

**Option 1: ffmpeg** (Free, server-side)
```bash
ffmpeg -i audio.mp3 -filter_complex \
  "[0:a]showwaves=s=1920x1080:mode=cline" \
  output.mp4
```

**Option 2: Canvas API + MediaRecorder** (Free, client-side)
Browser-based recording, no server needed

---

## 🔧 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Music Generation
SUNO_API_KEY=your_suno_key
# OR
REPLICATE_API_TOKEN=your_replicate_token

# Lyrics Generation
OPENAI_API_KEY=your_openai_key
# OR
ANTHROPIC_API_KEY=your_anthropic_key

# Image Generation (Album Art)
# Uses same OPENAI_API_KEY or REPLICATE_API_TOKEN

# Stem Separation (if using cloud service)
LALAL_AI_API_KEY=your_lalal_key
# OR
MOISES_API_KEY=your_moises_key

# Storage (optional)
AWS_S3_BUCKET=your_bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

---

## 🎨 Customization

### Add New Genres
Edit `components/SongGenerator.tsx`:
```typescript
const genres = [
  'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz',
  // Add your genres here
  'Reggae', 'Blues', 'Gospel',
];
```

### Add New Moods
Edit `components/SongGenerator.tsx`:
```typescript
const moods = [
  'Happy', 'Sad', 'Energetic', 'Chill',
  // Add your moods here
  'Melancholic', 'Triumphant',
];
```

### Change Color Scheme
Edit `tailwind.config.ts`:
```typescript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
      secondary: '#your-color',
    },
  },
}
```

### Add New Audio Effects
Edit `lib/services/audioService.ts` and add effect handlers.

---

## 📦 Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start

# Or deploy to Vercel (recommended)
vercel
```

---

## 🚢 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Other Platforms
- **Netlify** - Connect Git repository
- **Railway** - One-click deploy
- **AWS/GCP** - Deploy as container

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **Audio Processing**: Web Audio API
- **File Upload**: Native FormData API
- **State Management**: React Hooks
- **Runtime**: Node.js 18+

---

## 📝 API Reference

### POST /api/generate
Generate a new song
```json
{
  "prompt": "An upbeat summer song",
  "genre": "Pop",
  "mood": "Happy",
  "duration": 120
}
```

### POST /api/upload
Upload audio file
```
FormData with 'file' and 'type' fields
```

### POST /api/audio/stems
Separate stems
```json
{
  "audioUrl": "/uploads/song.mp3"
}
```

### POST /api/audio/trim
Trim audio
```json
{
  "audioUrl": "/uploads/song.mp3",
  "startTime": 10,
  "endTime": 60
}
```

### POST /api/audio/effects
Apply effects
```json
{
  "audioUrl": "/uploads/song.mp3",
  "effect": "reverb",
  "parameters": {}
}
```

### POST /api/visual/album-art
Generate album art
```json
{
  "songTitle": "My Song",
  "genre": "Pop",
  "mood": "Happy",
  "settings": {
    "style": "modern",
    "aspectRatio": "1:1"
  }
}
```

### POST /api/visual/visualizer
Generate video visualizer
```json
{
  "audioUrl": "/uploads/song.mp3",
  "settings": {
    "type": "waveform",
    "resolution": "1080p",
    "fps": 30
  }
}
```

### POST /api/export
Export audio
```json
{
  "audioUrl": "/uploads/song.mp3",
  "songTitle": "My Song",
  "settings": {
    "format": "mp3",
    "quality": "320",
    "sampleRate": 44100
  }
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🙏 Acknowledgments

- Inspired by [Suno AI](https://suno.ai)
- Icons by [Lucide](https://lucide.dev)
- Built with [Next.js](https://nextjs.org)
- Styled with [Tailwind CSS](https://tailwindcss.com)

---

## 📧 Support

For questions, issues, or feature requests, please open an issue on GitHub.

---

## 🗺️ Roadmap

### Planned Features
- [ ] Real-time collaboration
- [ ] User authentication and accounts
- [ ] Cloud project storage
- [ ] Social sharing features
- [ ] Playlist creation
- [ ] Advanced audio effects
- [ ] MIDI export
- [ ] Mobile app (iOS/Android)
- [ ] VST/AU plugin for DAWs
- [ ] AI voice cloning
- [ ] Style transfer
- [ ] Song extension/continuation
- [ ] Multi-language lyrics translation
- [ ] Automated mixing and mastering

---

Built with ❤️ using Next.js and TypeScript

**Ready to create amazing music? Run `npm run dev` and start your musical journey!** 🎶
