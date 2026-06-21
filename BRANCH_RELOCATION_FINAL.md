# ⚡ Final Branch Relocation & Hub Synergy Report

This document confirms the definitive categorization of branches within the **Song Generator Pro Hub** and identifies unrelated projects for relocation.

## 🎵 Song Generator Pro Hub (Core Assets)
The following branches form the synergistic pipeline of the Song Generator Pro Hub. They are organized by their functional role in the music production lifecycle.

### 🎙️ Phase 1: Capture (Organic Inspiration)
- `codex/add-mvp-features-for-voice-recorder`: Initial voice capture capabilities.
- `codex/create-advanced-voice-recorder-app*`: High-fidelity organic recording.
- `claude/beat-maker-app-Fhpg2`: Rhythmic foundation and MIDI sketching.
- `codex/start-ios-build-for-voice-control-studio`: Mobile capture extension.

### 🧠 Phase 2: Generation (AI Engine)
- `main` / `claude/song-generator-T7GUx`: Core multi-model AI ensemble for music generation.
- `claude/initial-setup-*`: Core project infrastructure.

### 🎚️ Phase 3: Refinement (The Studio)
- `claude/audio-analysis-mastering-tool-ySQzQ`: Deep spectral and technical analysis.
- `audio-analyzer-rms-optimization-*`: Performance-optimized basic stats.
- `bolt/*`: All performance-focused branches (FFT, In-place mastering, etc.).
- `add-mastering-presets-tests-*`: Mastering quality assurance.
- `improve-music-quality-*`: Refinement logic updates.

### 📁 Phase 4: Storage (The Vault)
- `claude/music-vault-app-DNlEb`: Asset indexing, management, and retrieval.
- `feature-save-to-library-*`: Integration between Generation and Storage.
- `implement-file-deletion-*`: Library management.

### 📺 Phase 5: Presentation (Visuals)
- `claude/auto-split-video-clips-gwIQz`: Social-media ready visual generation.
- `perf-optimize-waveform-generation-*`: High-performance waveform rendering.

---

## 📦 Relocation List (Non-Core Branches)
These branches do not belong to the Song Generator Pro Hub and are targeted for relocation to standalone repositories.

### 🧩 Browser Extensions
- `claude/chrome-extension-replica-4L8Ec`
- `claude/firefox-teach-repeat-extension-gRNKL`
- `codex/create-gemini-sidebar-extension-replica*`
- `feat/gemini-chrome-assistant-*`

### 🛠️ System & Productivity Utilities
- `claude/keyboard-window-splitter-fCMem` (OS Layout tool)
- `claude/multi-tab-ai-automation-X7gEG` (General productivity)
- `codex/create-gpt-studio-with-testing-tools` (Generic LLM testing)

### 🧪 Standalone Research & Apps
- `remotes/origin/LemmeGitDat...` (Community/Social concept)
- `codex/build-linux-mint-desktop-environment*` (OS Configuration)
- `codex/build-mvp-for-foodmarket-app` (E-commerce)
- `codex/simulated-experiences-demographic-impact-review` (Research tool)

## ⚡ Bolt Optimization Strategy
By isolating the Song Generator Pro Hub, we can focus performance efforts on the high-throughput audio pipeline. Future optimizations will continue to leverage spectral reuse (sharing FFT results across services) and in-place processing to minimize latency and memory churn.
