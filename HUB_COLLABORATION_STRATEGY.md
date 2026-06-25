# 🤝 HUB COLLABORATION STRATEGY: Song Generator Pro

The Song Generator Pro Hub is a unified ecosystem for AI-driven music production. This document outlines the functional synergy between the core phases of the pipeline.

## 🔄 Functional Synergy Section

The hub operates as an integrated pipeline where specialized services collaborate to take a musical idea from inception to presentation:

1.  **Capture (The Foundation)**
    *   **Branches:** `codex/create-advanced-voice-recorder-app`, `claude/beat-maker-app-Fhpg2`
    *   **Role:** Provides the initial organic or rhythmic input.
    *   **Data Flow:** Raw audio (WAV) from the Voice Recorder or MIDI/patterns from the Beat Maker are passed to the Generation phase.

2.  **Generation (The Engine)**
    *   **Branches:** `claude/song-generator-T7GUx` (Main), `multiModelService.ts`
    *   **Role:** Uses the multi-model AI ensemble to transform captured ideas into fully arranged multi-instrumental tracks.
    *   **Data Flow:** Processes inputs and generates high-fidelity audio buffers for Refinement.

3.  **Refinement (The Studio)**
    *   **Branches:** `claude/audio-analysis-mastering-tool-ySQzQ`, `audioAnalysisService.ts`, `audioMasteringService.ts`
    *   **Role:** Ensures professional quality through spectral analysis, key/chord detection, and automated mastering (Compression, EQ, Limiting).
    *   **Data Flow:** Validates the AI output and produces the "Final Mix" assets.

4.  **Storage (The Vault)**
    *   **Branches:** `claude/music-vault-app-DNlEb`
    *   **Role:** Manages the lifecycle of musical assets, including metadata tagging, cloud storage, and library management.
    *   **Data Flow:** Receives mastered tracks and associated analysis data for long-term storage.

5.  **Presentation (The Stage)**
    *   **Branches:** `claude/auto-split-video-clips-gwIQz`, `visualService.ts`
    *   **Role:** Automates the creation of visual assets, including waveform visualizations and synchronized video clips for social media distribution.
    *   **Data Flow:** Uses mastered audio and analysis timestamps to generate final visual content.

## 📦 Non-Core Branches (Relocation Audit)

The following branches have been identified as unrelated to the Song Generator Pro mission and are marked for relocation to separate repositories:

### Browser Extensions
- `claude/chrome-extension-replica-4L8Ec`
- `claude/firefox-teach-repeat-extension-gRNKL`
- `codex/create-gemini-sidebar-extension-replica*`
- `feat/gemini-chrome-assistant-*`

### System & AI Productivity Tools
- `claude/keyboard-window-splitter-fCMem`
- `claude/multi-tab-ai-automation-X7gEG`
- `codex/create-gpt-studio-with-testing-tools`

### Standalone Apps & Research
- `remotes/origin/LemmeGitDat...`
- `codex/build-linux-mint-desktop-environment*`
- `codex/build-mvp-for-foodmarket-app`
- `codex/simulated-experiences-demographic-impact-review`
