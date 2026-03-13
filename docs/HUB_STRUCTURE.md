# Song Generator Pro Hub Structure

This document outlines the branches that constitute the Song Generator Pro ecosystem and those that are slated for relocation to independent repositories.

## 🎵 Song Generator Pro Hub Branches

The following branches are integrated parts of the Song Generator Pro platform, collaborating to provide a comprehensive AI music creation and mastering experience.

| Branch | Role | Integration |
|--------|------|-------------|
| `claude/song-generator-T7GUx` | **Core Platform** | The central Next.js application coordinating all features. |
| `claude/audio-analysis-mastering-tool-ySQzQ` | **Audio Engine** | Provides advanced analysis and automated mastering logic. |
| `claude/music-vault-app-DNlEb` | **Storage & Library** | Manages song persistence, metadata, and user collections. |
| `claude/beat-maker-app-Fhpg2` | **Creative Tool** | Integrated beat sequencer and rhythm generation component. |
| `claude/auto-split-video-clips-gwIQz` | **Visualizer** | Generates video content synchronized with audio output. |
| `codex/create-advanced-voice-recorder-app` | **Input Source** | Captures high-quality vocal samples for the generator. |
| `codex/start-ios-build-for-voice-control-studio` | **Mobile Hub** | Expo-based mobile companion for on-the-go creation. |
| `bolt/optimize-audio-analysis-*` | **Performance** | Critical engine optimizations (FFT, memory management). |

### Collaborative Flow
1. **Input:** Users capture audio via the **Voice Recorder** or generate prompts in the **Core Platform**.
2. **Generation:** The **Core Platform** utilizes the **Audio Engine** for synthesis and initial processing.
3. **Refinement:** The **Beat Maker** allows for rhythmic adjustments, while the **Audio Engine** performs final mastering.
4. **Visualization:** The **Visualizer** creates a music video for the final track.
5. **Persistence:** All results are stored and managed within the **Music Vault**.

---

## 📦 Relocation List (Non-Hub Projects)

The following branches represent independent projects and should be moved to their own dedicated repositories to maintain the focus of the Song Generator Pro hub.

- **Browser Extensions:**
  - `claude/chrome-extension-replica-4L8Ec`
  - `claude/firefox-teach-repeat-extension-gRNKL`
  - `codex/create-gemini-sidebar-extension-replica`
- **System & Development Utilities:**
  - `claude/keyboard-window-splitter-fCMem`
  - `codex/build-linux-mint-desktop-environment`
  - `codex/create-gpt-studio-with-testing-tools`
  - `claude/multi-tab-ai-automation-X7gEG`
- **Standalone Apps:**
  - `codex/build-mvp-for-foodmarket-app`
  - `remotes/origin/LemmeGitDat--Modular-build-for-local-areas-to-track-through-community-whats-popping-near-them`
- **Research/Analysis:**
  - `codex/simulated-experiences-demographic-impact-review`
