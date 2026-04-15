# ⚡ Song Generator Pro: Hub Audit & Relocation Strategy

## 🎯 Hub Mission: Song Generator Pro
The Song Generator Pro Hub is an integrated AI-driven music production ecosystem. It enables users to capture ideas, generate professional-grade tracks using multi-model AI, refine them with automated mastering/analysis, and manage their music library.

---

## 🎵 Song Generator Pro Hub (KEEP)
These branches are essential components of the integrated ecosystem. They collaborate through shared types and services (e.g., `AudioAnalysisService`, `AudioMasteringService`).

| Branch Name | Component | Role in Hub |
| :--- | :--- | :--- |
| `main` / `claude/song-generator-T7GUx` | **Core Platform** | Central hub UI, AI generation orchestration, and project management. |
| `claude/audio-analysis-mastering-tool-ySQzQ` | **Mastering & Analysis** | Quality metrics and professional finishing. Essential for "Song Generator" quality. |
| `claude/music-vault-app-DNlEb` | **Music Vault** | Long-term asset storage, versioning, and library management for generated tracks. |
| `claude/beat-maker-app-Fhpg2` | **Beat Maker** | Rhythmic foundation generation. Provides MIDI/Audio loops for the generator. |
| `codex/create-advanced-voice-recorder-app` | **Voice Recorder** | Organic capture. Allows users to record vocals/instruments to be used as AI seeds. |
| `claude/auto-split-video-clips-gwIQz` | **Video Visualizer** | Marketing/Presentation layer. Generates visualizers for finished tracks. |
| `bolt/*` | **Optimization** | Performance enhancements that make the entire ecosystem faster and more efficient. |

### Hub Collaboration Flow:
1.  **Ideation**: Capture raw audio (`Voice Recorder`) or generate a rhythmic base (`Beat Maker`).
2.  **Generation**: The `Core Platform` uses AI to expand ideas into full tracks.
3.  **Refinement**: `AudioAnalysisService` validates quality; `AudioMasteringService` applies professional finishing.
4.  **Storage**: Finished assets are committed to the `Music Vault`.
5.  **Distribution**: `Video Visualizer` creates social-media-ready content for the track.

---

## 📦 Unrelated Branches (RELOCATE)
The following branches are standalone applications or utilities that do not contribute to the music production workflow and clutter the repository. They should be moved to separate repositories.

### 🌐 Browser Extensions
- `claude/chrome-extension-replica-4L8Ec`
- `claude/firefox-teach-repeat-extension-gRNKL`
- `codex/create-gemini-sidebar-extension-replica`
- `feat/gemini-chrome-assistant-*`

### 💻 System & Productivity Utilities
- `claude/keyboard-window-splitter-fCMem` (Windows management)
- `claude/multi-tab-ai-automation-X7gEG` (General AI automation)
- `codex/create-gpt-studio-with-testing-tools` (Generic LLM tool)

### 🛒 Standalone Apps
- `codex/build-mvp-for-foodmarket-app` (E-commerce)
- `remotes/origin/LemmeGitDat--Modular-build...` (Community/Social)

### 🔬 Research & Specialized Tools
- `codex/build-linux-mint-desktop-environment` (OS Customization)
- `codex/simulated-experiences-demographic-impact-review` (Sociological Analysis)

---

## ⚡ Bolt Optimization: Stable Loudness Analysis
To improve the efficiency of the `AudioAnalysisService`, I am implementing a memory-efficient, numerically stable $O(N)$ sliding-window loudness analysis. This makes the "Refinement" stage of the hub workflow significantly faster for long tracks without risking memory overflow or precision drift.
