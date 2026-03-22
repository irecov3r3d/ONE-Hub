# ⚡ Bolt Branch Audit: Song Generator Pro

Based on the mission to identify branches that do not belong to the "Song Generator Pro" hub and need to be moved to their own repositories.

## 🎵 Song Generator Pro Hub (Keep)
These branches are core features, improvements, or related services for the Song Generator platform.

- `main` / `claude/song-generator-T7GUx` (Core application and UI)
- `claude/audio-analysis-mastering-tool-ySQzQ` (Audio Analysis & Mastering)
- `claude/auto-split-video-clips-gwIQz` (Video Visualizer features)
- `claude/beat-maker-app-Fhpg2` (Beat creation integration)
- `claude/music-vault-app-DNlEb` (Song library/vault)
- `codex/add-mvp-features-for-voice-recorder` (Voice recording feature)
- `codex/create-advanced-voice-recorder-app` (Advanced voice recording)
- `codex/start-ios-build-for-voice-control-studio` (Mobile integration)
- `bolt/*` (Performance optimizations)
- `feature-save-to-library-*` (User library features)
- `usability-improvements-*` (UX enhancements)
- `security-fix-*` (Security maintenance)
- `claude/add-error-handling-*` (General maintenance)
- `claude/initial-setup-*` (Infrastructure)
- `codex/organize-file-folders-neatly` (Maintenance)
- `audio-analyzer-rms-optimization-*` (Performance maintenance)
- `improve-analyzer-accuracy-*` (Quality maintenance)
- `add-mastering-presets-tests-*` (Testing maintenance)
- `cleanup-mastering-logs-*` (Maintenance)
- `fix-startup-and-upgrades-*` (Maintenance)
- `improve-music-quality-*` (Quality maintenance)
- `monorepo-extraction-script-fix-*` (Infrastructure maintenance)

## 📦 Relocate (Move to own Repo)
These branches are unrelated projects or standalone prototypes that clutter the main Song Generator Pro codebase.

- `remotes/origin/LemmeGitDat--Modular-build-for-local-areas-to-track-through-community-whats-popping-near-them` (Community/Social app)
- `claude/chrome-extension-replica-4L8Ec` (Browser extension)
- `claude/firefox-teach-repeat-extension-gRNKL` (Browser extension)
- `claude/keyboard-window-splitter-fCMem` (System utility)
- `claude/multi-tab-ai-automation-X7gEG` (AI Automation tool)
- `codex/build-linux-mint-desktop-environment` (OS customization)
- `codex/build-mvp-for-foodmarket-app` (E-commerce/Food app)
- `codex/create-gemini-sidebar-extension-replica` (Browser extension)
- `codex/create-gpt-studio-with-testing-tools` (Development tool)
- `codex/simulated-experiences-demographic-impact-review` (Review/Analysis tool)
- `feat/gemini-chrome-assistant-*` (Browser extension)

## ⚡ Bolt Optimization Target
The **Song Generator Pro Hub** currently suffers from redundant memory allocations and multiple buffer traversals during audio mastering and analysis. I am implementing the following optimizations:

1.  **Single-Pass Audio Normalization**: Refactoring `AudioMasteringService.normalizeToLUFS` to calculate RMS energy directly from input channels and apply gain in-place, eliminating $O(N)$ allocations and a redundant mono conversion pass.
2.  **Consolidated Level Analysis**: Refactoring `AudioAnalyzer.calculateLevels` to perform Peak and RMS detection in a single $O(N)$ loop, reducing buffer traversals and CPU overhead.
