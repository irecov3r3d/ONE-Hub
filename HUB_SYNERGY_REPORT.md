# ⚡ HUB SYNERGY REPORT: Song Generator Pro Hub

This report outlines the strategic categorization of branches into the core **Song Generator Pro Hub** ecosystem and identifies candidates for relocation to maintain project focus.

## 🎵 Song Generator Pro Hub (Core Ecosystem)

The Hub is an integrated AI-driven music production pipeline where components collaborate to transform a concept into a polished, shareable asset.

### 🔄 Collaborative Workflow
1.  **Capture (Voice Recorder / Beat Maker)**: Organic ideas and rhythmic foundations are captured.
2.  **Generation (Ensemble AI)**: Multi-model AI generates arrangements and stems from prompts or recordings.
3.  **Refinement (Audio Analysis & Mastering)**: The `AudioAnalysisService` validates quality metrics, and the `AudioMasteringService` applies professional processing.
4.  **Storage (Music Vault)**: Finalized tracks and stems are stored in a central library.
5.  **Presentation (Video Visualizers)**: High-quality visual representations are generated for social sharing.

### ✅ Core Branches (Keep)
- `main` / `claude/song-generator-T7GUx` (Core UI/UX)
- `claude/audio-analysis-mastering-tool-ySQzQ` (Refinement)
- `claude/beat-maker-app-Fhpg2` (Rhythmic Foundation)
- `codex/add-mvp-features-for-voice-recorder` (Organic Capture)
- `claude/music-vault-app-DNlEb` (Asset Management)
- `claude/auto-split-video-clips-gwIQz` (Visual Presentation)
- `bolt/*` (Performance Optimizations)

---

## 📦 Relocation Candidates (Move to separate repos)

These branches represent standalone tools or utilities that do not directly contribute to the music production workflow.

### 🌐 Browser Extensions
- `claude/chrome-extension-replica-4L8Ec`
- `claude/firefox-teach-repeat-extension-gRNKL`
- `codex/create-gemini-sidebar-extension-replica`
- `feat/gemini-chrome-assistant`

### 🛠️ System & Productivity Utilities
- `claude/keyboard-window-splitter-fCMem`
- `claude/multi-tab-ai-automation-X7gEG`
- `codex/create-gpt-studio-with-testing-tools`

### 🧪 Standalone Research & Apps
- `LemmeGitDat` (Community App)
- `codex/build-linux-mint-desktop-environment` (OS Customization)
- `codex/build-mvp-for-foodmarket-app` (E-commerce)
- `codex/simulated-experiences-demographic-impact-review` (Research Tool)
