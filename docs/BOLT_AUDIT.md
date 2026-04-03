# ⚡ Bolt: Branch Audit & Performance Strategy

## 📦 Relocation Analysis
The following branches have been identified as outside the "Song Generator Pro Hub" and are slated for relocation to separate repositories. These projects are either standalone system utilities, unrelated apps, or browser extensions that clutter the core musical ecosystem.

### Browser Extensions
- `claude/chrome-extension-replica-4L8Ec`
- `claude/firefox-teach-repeat-extension-gRNKL`
- `codex/create-gemini-sidebar-extension-replica*`
- `feat/gemini-chrome-assistant-9328924754254525612`

### System & AI Utilities
- `claude/keyboard-window-splitter-fCMem` (System window management)
- `claude/multi-tab-ai-automation-X7gEG` (General AI automation)
- `codex/build-linux-mint-desktop-environment*` (OS customization)
- `codex/create-gpt-studio-with-testing-tools` (General Dev Tools)

### Unrelated Applications
- `remotes/origin/LemmeGitDat--Modular-build-for-local-areas...` (Social/Community)
- `codex/build-mvp-for-foodmarket-app` (E-commerce)
- `codex/simulated-experiences-demographic-impact-review` (Social Science/Analysis)

---

## 🎵 Hub Analysis (Stay)
The Song Generator Pro Hub is a collaborative ecosystem of AI-driven music creation and processing tools.

- **Core Application**: `main`, `claude/song-generator-T7GUx`
- **Audio Intelligence**: `claude/audio-analysis-mastering-tool-ySQzQ`, `bolt/*`
- **User Ecosystem**: `claude/music-vault-app-DNlEb`, `feature-save-to-library-*`
- **Creation Tools**: `claude/beat-maker-app-Fhpg2`, `codex/create-advanced-voice-recorder-app`
- **Visuals**: `claude/auto-split-video-clips-gwIQz`

**Synergy**: These branches share a common `AudioContext` and `AudioBuffer` pipeline. Optimizing the underlying `FastFFTEngine` or `AudioMasteringService` provides immediate performance gains across the entire hub, from real-time analysis to final mastering exports.

---

## ⚡ Bolt Performance Target: FFT Engine Refactor
**Problem**: `FastFFTEngine.cooleyTukeyFFT` is currently recursive and performs $O(N \log N)$ allocations of `Float32Array`. For an 8192-point FFT, this triggers thousands of small allocations, causing significant Garbage Collection (GC) pressure and CPU overhead.
**Solution**: Implement an iterative, in-place FFT algorithm with bit-reversal permutation and pre-calculated twiddle factor lookups.
**Expected Impact**: ~5-10x speedup in FFT computation and near-zero memory allocation during the core loop.
