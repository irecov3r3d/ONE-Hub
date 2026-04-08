# ⚡ Bolt: Branch Relocation & Hub Collaboration Report

## 🎵 Song Generator Pro Hub (Keep)
These branches are core features, improvements, or related services for the Song Generator platform. They collaborate to provide a complete AI-driven music production ecosystem.

- **Core & UI**: `main` / `claude/song-generator-T7GUx`
- **Mastering & Analysis**: `claude/audio-analysis-mastering-tool-ySQzQ` (Professional finishing and quality metrics)
- **Library Management**: `claude/music-vault-app-DNlEb` (Asset storage and user library)
- **Rhythmic Generation**: `claude/beat-maker-app-Fhpg2` (Beat and MIDI generation)
- **Organic Capture**: `codex/add-mvp-features-for-voice-recorder`, `codex/create-advanced-voice-recorder-app` (Vocal and instrument recording)
- **Visuals**: `claude/auto-split-video-clips-gwIQz` (Automated video/visualizer generation)
- **Optimization**: `bolt/*` (Performance-focused enhancements across all services)

**⚡ Collaborative Ecosystem**:
The Song Generator Pro Hub operates as an integrated AI-driven music production pipeline:
1. **Capture & Creation**: Vocal/Organic inputs are captured via `Voice Recorder` (`codex/create-advanced-voice-recorder-app`), while rhythmic foundations are laid by `Beat Maker` (`claude/beat-maker-app-Fhpg2`).
2. **AI Ensemble Generation**: The core application (`claude/song-generator-T7GUx`) orchestrates multiple AI models to generate high-fidelity audio based on these inputs.
3. **Technical Analysis**: `AudioAnalysisService` (`claude/audio-analysis-mastering-tool-ySQzQ`) performs a deep technical dive into the generated audio, providing metrics like LUFS, peak, dynamic range, and frequency distribution.
4. **Professional Mastering**: Based on analysis results, `AudioMasteringService` applies a professional finishing chain (EQ, Compression, Limiting, Stereo Enhancement) to prepare the track for release.
5. **Vaulting & Storage**: Mastered assets are indexed and stored in the `Music Vault` (`claude/music-vault-app-DNlEb`) for user management.
6. **Visual Presentation**: `Video Visualizer` features (`claude/auto-split-video-clips-gwIQz`) generate synchronized visuals for the final mastered tracks.

## 📦 Relocations (Move to separate repositories)
The following branches are unrelated to the Song Generator Pro ecosystem and should be moved to their own repos:

- **Social/Community**: `remotes/origin/LemmeGitDat--Modular-build-for-local-areas-to-track-through-community-whats-popping-near-them`
- **Browser Extensions**:
  - `claude/chrome-extension-replica-4L8Ec`
  - `claude/firefox-teach-repeat-extension-gRNKL`
  - `codex/create-gemini-sidebar-extension-replica*`
  - `feat/gemini-chrome-assistant-*`
- **System Utilities**: `claude/keyboard-window-splitter-fCMem`
- **AI Productivity**: `claude/multi-tab-ai-automation-X7gEG`
- **OS Customization**: `codex/build-linux-mint-desktop-environment*`
- **E-commerce**: `codex/build-mvp-for-foodmarket-app`
- **Development Tools**: `codex/create-gpt-studio-with-testing-tools`
- **Research/Review**: `codex/simulated-experiences-demographic-impact-review`
