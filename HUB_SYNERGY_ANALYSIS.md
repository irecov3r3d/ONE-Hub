# ⚡ Song Generator Pro Hub: Synergy Analysis & Branch Relocation

## 📦 Non-Core Branch Relocation Audit
The following branches do not belong to the Song Generator Pro Hub and are identified for relocation to maintain a cohesive mission focus:

### 1. Browser Extensions
- `claude/chrome-extension-replica-4L8Ec`
- `claude/firefox-teach-repeat-extension-gRNKL`
- `codex/create-gemini-sidebar-extension-replica*`
- `feat/gemini-chrome-assistant-*`

### 2. System & AI Productivity Tools
- `claude/keyboard-window-splitter-fCMem`
- `claude/multi-tab-ai-automation-X7gEG`
- `codex/create-gpt-studio-with-testing-tools`

### 3. Standalone Apps & Research
- `remotes/origin/LemmeGitDat...`
- `codex/build-linux-mint-desktop-environment*`
- `codex/build-mvp-for-foodmarket-app`
- `codex/simulated-experiences-demographic-impact-review`

---

## 🤝 Functional Synergy: Refinement Phase
The **Refinement Phase** consists of `AudioAnalysisService`, `AdvancedKeyDetection`, and `AudioMasteringService`.

### Current Bottleneck: Redundant Spectral Analysis
`AudioAnalysisService` performs a high-resolution 8192-point FFT to analyze frequency bands and harmonics. `AdvancedKeyDetection` also requires an 8192-point FFT to accurately map frequencies to pitch classes (chromagram). In the current state, these are disconnected, leading to redundant O(N log N) computations.

### Synergistic Optimization: Spectral Reuse
By integrating `AdvancedKeyDetection` directly into the `AudioAnalysisService` pipeline:
1. **FFT Elimination**: `AdvancedKeyDetection` will consume the pre-calculated linear magnitudes from `AudioAnalysisService`.
2. **Integrated Musicality**: Key and Scale detection will move from a random placeholder to a scientifically accurate Krumhansl-Schmuckler implementation with zero additional FFT overhead.
3. **Zero-Copy Flow**: `AdvancedKeyDetection` will be refactored to support direct `Float32Array` analysis, eliminating the overhead of `OfflineAudioContext` and `AudioBuffer` copies during segment analysis (chord progressions).
