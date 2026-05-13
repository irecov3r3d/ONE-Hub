# ⚡ Final Branch Audit Report: Song Generator Pro Hub

This report defines the definitive categorization of branches for the **Song Generator Pro Hub** and identifies non-core projects for relocation.

## 🎵 Song Generator Pro Hub: The Synergistic Pipeline

The Song Generator Pro Hub is an integrated ecosystem for AI-driven music production. The core components collaborate in a linear yet iterative workflow:

1.  **Capture (Voice Recorder / Beat Maker)**:
    - Organic ideas and rhythmic foundations are captured.
    - *Branches*: `codex/add-mvp-features-for-voice-recorder`, `claude/beat-maker-app-Fhpg2`.
2.  **Generation (Ensemble AI)**:
    - AI models transform prompts and captured ideas into full audio tracks.
    - *Branches*: `main`, `claude/song-generator-T7GUx`.
3.  **Refinement (Analysis & Mastering)**:
    - Technical validation and professional finishing.
    - `AudioAnalysisService` provides metrics (LUFS, spectrum, BPM) and `AudioMasteringService` applies professional processing.
    - *Branches*: `claude/audio-analysis-mastering-tool-ySQzQ`, `bolt/*`.
4.  **Storage (Music Vault)**:
    - Assets are managed and stored in a searchable library.
    - *Branches*: `claude/music-vault-app-DNlEb`.
5.  **Presentation (Video Clips)**:
    - Finished tracks are prepared for social media sharing.
    - *Branches*: `claude/auto-split-video-clips-gwIQz`.

---

## ✅ Core Hub Branches (KEEP)
These branches are essential to the music production mission:

- `main` / `claude/song-generator-T7GUx`
- `claude/audio-analysis-mastering-tool-ySQzQ`
- `claude/beat-maker-app-Fhpg2`
- `codex/add-mvp-features-for-voice-recorder`
- `codex/create-advanced-voice-recorder-app`
- `claude/music-vault-app-DNlEb`
- `claude/auto-split-video-clips-gwIQz`
- `bolt/*` (All performance optimizations)
- `audio-analyzer-rms-optimization-*`
- `add-mastering-presets-tests-*`
- `perf-optimize-waveform-generation-*`

---

## 📦 Relocation Candidates (MOVE)
These branches are unrelated to music production and should be moved to separate repositories:

### 🌐 Browser Extensions
- `claude/chrome-extension-replica-4L8Ec`
- `claude/firefox-teach-repeat-extension-gRNKL`
- `codex/create-gemini-sidebar-extension-replica`
- `feat/gemini-chrome-assistant-9328924754254525612`

### 🛠️ System & AI Productivity
- `claude/keyboard-window-splitter-fCMem` (System window management)
- `claude/multi-tab-ai-automation-X7gEG` (General purpose AI automation)
- `codex/create-gpt-studio-with-testing-tools` (IDE/Development tool)

### 🚀 Standalone Apps & Research
- `remotes/origin/LemmeGitDat...` (Community/Social discovery)
- `codex/build-linux-mint-desktop-environment` (OS customization)
- `codex/build-mvp-for-foodmarket-app` (E-commerce)
- `codex/simulated-experiences-demographic-impact-review` (Research/Analytics)
