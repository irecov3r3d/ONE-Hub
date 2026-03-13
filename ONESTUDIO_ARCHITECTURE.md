# 🎵 OnEstudiO Architecture

**AI-Powered Music Production Suite with Full Voice Interaction**

## Vision

OnEstudiO is a comprehensive, AI-assisted music production platform that combines:
- Multi-model AI music generation
- Real-time beat making and sequencing
- Full voice control and interaction
- Stem separation and editing
- Lyric generation and editing
- Professional mastering and export

All accessible through voice commands and an intuitive UI.

---

## Core Features

### 1. Voice Interaction System
**Complete hands-free production workflow**

#### Voice Commands:
- **Generation**: "Generate a chill lo-fi beat at 85 BPM"
- **Beat Maker**: "Add a kick on the 1 and 3", "Increase the BPM to 140"
- **Editing**: "Trim from 30 seconds to 2 minutes", "Add reverb to the vocals"
- **Navigation**: "Open the beat maker", "Go to export"
- **Playback**: "Play the song", "Stop", "Loop this section"
- **AI Assistance**: "What do you think about this mix?", "Suggest improvements"

#### Implementation:
- Web Speech API for voice recognition
- Claude/GPT-4 for natural language understanding
- Text-to-speech for AI responses
- Real-time command processing
- Context-aware suggestions

### 2. Beat Maker (Tone.js)
**Real-time programmable beat sequencer**

#### Features:
- Multiple synths (kick, snare, hi-hat, bass, melody, pads, plucks)
- Complex pattern sequencing
- Dynamic sections (verse, chorus, bridge)
- BPM control (80-180)
- Volume mixing
- Pattern export to AI generation
- MIDI export

#### Integration:
- Voice control: "Make the hi-hats faster", "Add a bass drop"
- AI pattern generation: Generate patterns from text
- Export patterns as training data for AI models
- Sync with generated tracks

### 3. Multi-Model AI Generation
**Ensemble approach for best quality**

#### Current Models:
- MusicGen (Meta) - Best for melody and structure
- AudioCraft (Meta) - Best for atmosphere
- Riffusion - Best for experimental sounds

#### Enhanced with:
- Beat maker pattern injection
- Voice-to-music generation
- Style transfer from references
- Real-time generation preview

### 4. Unified Production Interface

#### Layout:
```
┌─────────────────────────────────────────────────────┐
│  🎵 OnEstudiO                    🎤 Voice: Active   │
├─────────────────────────────────────────────────────┤
│  [Generate] [Beat Maker] [Edit] [Mix] [Export]      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────┐  ┌────────────────────────┐   │
│  │  AI Assistant   │  │  Main Workspace        │   │
│  │                 │  │                        │   │
│  │  "I'm listening"│  │  [Current Tool UI]     │   │
│  │                 │  │                        │   │
│  │  • Suggestions  │  │                        │   │
│  │  • History      │  │                        │   │
│  └─────────────────┘  └────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  Timeline / Waveform                          │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  [Transport Controls] [BPM: 120] [Key: C]           │
└─────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **Audio**: Tone.js (synthesis, sequencing)
- **Voice**: Web Speech API
- **AI**: Anthropic Claude API / OpenAI GPT-4
- **State**: Zustand / React Context

### Backend Services
- **Audio Generation**: Multi-model ensemble (MusicGen, AudioCraft, Riffusion)
- **Audio Processing**: Web Audio API, FFmpeg
- **Stem Separation**: Demucs (via API)
- **Mastering**: LANDR API or custom chain
- **Storage**: Local + optional S3

### New Components to Build

#### 1. VoiceController (`components/VoiceController.tsx`)
- Speech recognition
- Command parsing
- Visual feedback (waveform, status)
- Context management

#### 2. AIAssistant (`components/AIAssistant.tsx`)
- Natural language processing
- Command execution
- Suggestions and feedback
- Learning from user preferences

#### 3. BeatMaker (`components/BeatMaker.tsx`)
- Tone.js integration
- Pattern sequencer
- Voice-controlled editing
- Export to AI generation

#### 4. UnifiedWorkspace (`components/UnifiedWorkspace.tsx`)
- Central hub for all tools
- Seamless transitions
- Shared state management
- Real-time collaboration ready

#### 5. ProductionTimeline (`components/ProductionTimeline.tsx`)
- Multi-track timeline
- Waveform visualization
- Region editing
- Automation lanes

### API Routes to Add

#### `/api/voice/process` (POST)
- Processes voice commands
- Returns action and parameters
- Handles context

#### `/api/ai/assist` (POST)
- AI production assistance
- Mix feedback
- Suggestions

#### `/api/beat/generate` (POST)
- AI-generated beat patterns
- Based on genre, mood, BPM

#### `/api/beat/export` (POST)
- Export Tone.js patterns to audio
- Export MIDI

---

## Implementation Phases

### Phase 1: Core Integration (Week 1)
- [x] Explore existing codebase
- [ ] Add Tone.js to dependencies
- [ ] Create BeatMaker component
- [ ] Integrate into main app
- [ ] Add routing and navigation

### Phase 2: Voice System (Week 1-2)
- [ ] Implement VoiceController
- [ ] Add speech recognition
- [ ] Create command parser
- [ ] Integrate with existing features
- [ ] Add voice feedback (TTS)

### Phase 3: AI Assistant (Week 2)
- [ ] Create AIAssistant component
- [ ] Integrate Claude/GPT-4 API
- [ ] Natural language command processing
- [ ] Production suggestions
- [ ] Mix feedback

### Phase 4: Unified Interface (Week 2-3)
- [ ] Design unified workspace
- [ ] Create production timeline
- [ ] Integrate all tools
- [ ] Add keyboard shortcuts
- [ ] Polish UI/UX

### Phase 5: Advanced Features (Week 3-4)
- [ ] Real-time collaboration
- [ ] Cloud project storage
- [ ] Advanced AI features
- [ ] Mobile optimization
- [ ] Performance optimization

### Phase 6: Polish & Launch (Week 4)
- [ ] Testing and bug fixes
- [ ] Documentation
- [ ] Tutorial system
- [ ] Performance optimization
- [ ] Deploy MVP

---

## Voice Command Examples

### Generation
- "Generate a trap beat at 140 BPM"
- "Create a sad piano ballad"
- "Make something like [reference track]"
- "Continue this track for 2 more minutes"

### Beat Maker
- "Start the beat maker"
- "Set BPM to 128"
- "Add a kick on beats 1 and 3"
- "Make the hi-hats roll"
- "Switch to chorus pattern"
- "Export this beat"

### Editing
- "Trim from 30 to 90 seconds"
- "Add reverb to the vocals"
- "Boost the bass"
- "Separate the stems"
- "Make it louder"

### Mixing
- "Pan the guitar to the left"
- "Lower the drums by 3dB"
- "Add compression to the master"
- "What do you think of this mix?"

### Export
- "Export as WAV"
- "Create a visualizer video"
- "Download with stems"
- "Export to Spotify quality"

---

## AI Assistant Capabilities

### Production Advice
- "This mix sounds muddy in the low-mids. Try cutting 200-400Hz on the bass."
- "The vocals are getting lost. Try boosting 3-5kHz and adding compression."
- "The kick and bass are clashing. Consider sidechaining."

### Creative Suggestions
- "Try adding a bridge before the final chorus for more dynamics"
- "The energy drops here - maybe add a riser or build-up?"
- "This would sound great with some vocal harmonies"

### Technical Help
- "Your track is peaking at -0.3dB, you should leave more headroom"
- "The stereo image is too wide on the bass - mono below 100Hz"
- "Your LUFS is at -8, streaming services will turn it down"

---

## Success Metrics

### MVP Goals
- Generate professional-quality music in under 2 minutes
- Complete voice-controlled workflow
- 95%+ voice command accuracy
- Seamless tool integration
- Export-ready tracks

### User Experience
- Intuitive for beginners
- Powerful for professionals
- Fast and responsive
- Minimal learning curve
- Fun and creative

---

## Tech Debt to Address

### Current Codebase
- [ ] Implement actual audio analysis (currently mock)
- [ ] Implement stem separation API integration
- [ ] Add actual mastering service
- [ ] Add error handling and retries
- [ ] Add progress callbacks for UI
- [ ] Optimize API costs with caching

### New Features
- [ ] Add WebSocket for real-time collaboration
- [ ] Implement undo/redo system
- [ ] Add project autosave
- [ ] Implement user authentication
- [ ] Add cloud storage

---

## API Keys Needed

```env
# Music Generation
REPLICATE_API_TOKEN=xxx
STABILITY_API_KEY=xxx
HUGGINGFACE_API_KEY=xxx

# AI Assistant
ANTHROPIC_API_KEY=xxx
OPENAI_API_KEY=xxx

# Audio Processing
LANDR_API_KEY=xxx (for mastering)
LALAL_AI_API_KEY=xxx (for stems, alternative)

# Storage (optional)
AWS_S3_BUCKET=xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

---

## File Structure

```
ONE-Hub/
├── app/
│   ├── api/
│   │   ├── voice/
│   │   │   └── process/route.ts
│   │   ├── ai/
│   │   │   └── assist/route.ts
│   │   ├── beat/
│   │   │   ├── generate/route.ts
│   │   │   └── export/route.ts
│   │   └── ...existing routes
│   └── page.tsx (updated with new features)
├── components/
│   ├── VoiceController.tsx (NEW)
│   ├── AIAssistant.tsx (NEW)
│   ├── BeatMaker.tsx (NEW)
│   ├── UnifiedWorkspace.tsx (NEW)
│   ├── ProductionTimeline.tsx (NEW)
│   └── ...existing components
├── lib/
│   ├── services/
│   │   ├── voiceService.ts (NEW)
│   │   ├── commandParser.ts (NEW)
│   │   ├── aiAssistantService.ts (NEW)
│   │   └── ...existing services
│   └── hooks/
│       ├── useVoice.ts (NEW)
│       ├── useAIAssistant.ts (NEW)
│       └── useBeatMaker.ts (NEW)
└── types/
    └── index.ts (updated with new types)
```

---

## Next Steps

1. **Add Tone.js dependency**
2. **Create BeatMaker component** (using the code you provided)
3. **Implement VoiceController** with Web Speech API
4. **Create AIAssistant** with Claude API
5. **Build unified workspace** that brings everything together
6. **Test, polish, and deploy**

---

Built with 🔥 by the ONE-Hub team
