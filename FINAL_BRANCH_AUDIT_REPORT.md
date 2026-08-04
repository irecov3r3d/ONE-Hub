# ⚡ Final Branch Audit Report: Song Generator Pro Hub

This report categorizes the existing branches into those that belong to the **Song Generator Pro Hub** and those that should be relocated to their own repositories. It also defines the synergistic workflow that enables professional AI-driven music production.

## 🎵 Song Generator Pro Hub (Keep)
These branches are essential to the mission of creating an integrated AI-driven music production ecosystem.

### Core Application & UI
- `main` / `claude/song-generator-T7GUx`
- `claude/initial-setup-*`
- `main-*`
- `usability-improvements-*`

### Audio Analysis & Mastering (Refinement)
- `claude/audio-analysis-mastering-tool-ySQzQ`
- `audio-analyzer-rms-optimization-*`
- `add-mastering-presets-tests-*`
- `cleanup-mastering-logs-*`
- `improve-music-quality-*`

### Generation & Rhythmic Foundation
- `claude/beat-maker-app-Fhpg2`

### Organic Capture & Recording
- `codex/add-mvp-features-for-voice-recorder`
- `codex/create-advanced-voice-recorder-app*`
- `codex/start-ios-build-for-voice-control-studio`

### Asset Management & Storage
- `claude/music-vault-app-DNlEb`
- `feature-save-to-library-*`
- `implement-file-deletion-*`

### Visual Presentation
- `claude/auto-split-video-clips-gwIQz`
- `perf-optimize-waveform-generation-*`

### Performance & Maintenance (Bolt)
- `bolt/*` (All performance optimization branches)
- `security-fix-*`
- `fix-insecure-randomness-upload-*`
- `fix-startup-and-upgrades-*`
- `claude/add-error-handling-*`
- `claude/analyze-prioritize-improvements-*`
- `claude/review-changes-*`
- `codex/organize-file-folders-neatly`
- `monorepo-extraction-script-fix-*`

---

## 🤝 Hub Synergy & Functional Workflow
The Song Generator Pro Hub is designed as a synergistic pipeline where specialized services collaborate to take a musical idea from inception to distribution.

### The Pipeline
1.  **Capture Phase**: Organic musical ideas are captured via the **Voice Memo Recorder** (Organic Capture) or rhythmic foundations are laid in the **Beat Maker** (Rhythmic Foundation).
2.  **Generation Phase**: The **Core AI Ensemble** (Generation) uses these inputs as "seeds" or reference tracks to generate multi-instrumental, high-fidelity compositions.
3.  **Refinement Phase**: Generated tracks are automatically analyzed by the **Audio Analysis Service** for quality metrics (spectral clarity, dynamic range, musical key). The **Audio Mastering Service** then applies professional-grade processing (EQ, Compression, Limiting) based on these analysis suggestions.
4.  **Storage Phase**: Finalized masters and their metadata are archived and managed within the **Music Vault**, ensuring all assets are searchable and version-controlled.
5.  **Presentation Phase**: To reach audiences, the **Visual Service** generates album art and the **Auto Video Splitter** creates synchronized visual content optimized for social media platforms.

### Data Flow & Dependencies
- **Capture -> Generation**: `VoiceMemoRecorder` exports PCM/WAV data that serves as the `referenceTrack` for the `MultiModelService`.
- **Generation -> Refinement**: `SongGenerator` outputs raw `AudioBuffer` objects which are the direct input for `AudioAnalysisService.analyzeAudio`.
- **Refinement -> Storage**: Optimized assets from `AudioMasteringService` are persisted to `TrackStore` via `StorageUtils`.
- **Storage -> Presentation**: `VisualService` retrieves stored audio to generate frequency-reactive visualizers and album art based on track metadata.

---

## 📦 Relocations (Move to separate repositories)
These branches are unrelated to music production and clutter the Hub ecosystem.

### Browser Extensions
- `claude/chrome-extension-replica-4L8Ec`
- `claude/firefox-teach-repeat-extension-gRNKL`
- `codex/create-gemini-sidebar-extension-replica*`
- `feat/gemini-chrome-assistant-*`

### System & AI Productivity Tools
- `claude/keyboard-window-splitter-fCMem` (System utility)
- `claude/multi-tab-ai-automation-X7gEG` (General AI automation)
- `codex/create-gpt-studio-with-testing-tools` (Development tool)

### Standalone Apps & Research
- `remotes/origin/LemmeGitDat...` (Community/Social app)
- `codex/build-linux-mint-desktop-environment*` (OS customization)
- `codex/build-mvp-for-foodmarket-app` (E-commerce)
- `codex/simulated-experiences-demographic-impact-review` (Research/Review tool)
