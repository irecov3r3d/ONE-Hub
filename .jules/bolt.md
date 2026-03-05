# Bolt's Journal - Song Generator Pro

## 2025-03-05 - Hub Analysis & Performance Audit

**Learning:** The repository is currently a "monorepo" of unrelated projects. The "Song Generator Pro" hub consists of audio processing, AI generation, and visualization tools. Several branches (extensions, desktop environments, food market apps) are out of scope and should be migrated to separate repositories.

**Hub Ecosystem:**
- **Core:** `audioService.ts`, `audioAnalysisService.ts`, `trackStore.ts`
- **Generative:** `lyricsService.ts`, `visualService.ts` (Album Art)
- **Advanced:** `audioMasteringService.ts`, `advancedKeyDetection.ts`, `fastFFTEngine.ts`
- **Collaboration:** `AudioAnalysisService` provides the spectral and temporal data required by `AudioMasteringService` and `AdvancedKeyDetection`.

**Performance Bottleneck:** `AudioAnalysisService.performFFT` uses a naive O(N²) DFT implementation. This blocks the main thread for ~200-500ms on a standard 8192 FFT size, causing UI jank during audio analysis.

**Action:** Replace DFT with O(N log N) FFT using `FastFFTEngine`.

**Performance Impact (8192 FFT Size):**
- **Old DFT Implementation:** ~1896ms (blocks UI)
- **New FFT Implementation:** ~31ms
- **Improvement:** ~60x faster
- **Time Saved:** ~1.8 seconds per analysis call

---

### Branch Audit

#### ✅ Stay (Song Generator Hub)
- `claude/song-generator-T7GUx`
- `claude/audio-analysis-mastering-tool-ySQzQ`
- `bolt/optimize-audio-analysis-fft-7040104896038862947`
- `claude/auto-split-video-clips-gwIQz`
- `claude/beat-maker-app-Fhpg2`
- `claude/music-vault-app-DNlEb`
- `codex/create-advanced-voice-recorder-app`
- `codex/add-mvp-features-for-voice-recorder`

#### 🚫 Move (Separate Repositories)
- `LemmeGitDat--Modular-build-for-local-areas-to-track-through-community-whats-popping-near-them`
- `claude/chrome-extension-replica-4L8Ec`
- `claude/firefox-teach-repeat-extension-gRNKL`
- `claude/keyboard-window-splitter-fCMem`
- `claude/multi-tab-ai-automation-X7gEG`
- `codex/build-linux-mint-desktop-environment*`
- `codex/build-mvp-for-foodmarket-app`
- `codex/create-gemini-sidebar-extension-replica*`
- `codex/simulated-experiences-demographic-impact-review`
- `codex/start-ios-build-for-voice-control-studio`
