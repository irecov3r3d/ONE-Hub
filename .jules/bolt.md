## 2025-05-15 - [Localizing Animation Frame Re-renders]
**Learning:** High-frequency state updates (60fps animation frames for spectral analysis and transport progress) at the top-level of a dashboard cause the entire application to re-render. This is a massive performance bottleneck when the dashboard contains many complex, heavy UI sections (Timeline, Mixer, Vault).
**Action:** Always isolate state that updates frequently into its own `React.memo` component. Pass only the minimum required refs or callbacks down.

## 2025-05-15 - [SharedArrayBuffer Type Mismatch]
**Learning:** Modern TypeScript compilers and Web Audio API environments may distinguish between `ArrayBuffer` and `ArrayBufferLike` (which includes `SharedArrayBuffer`). `Float32Array<ArrayBuffer>` is NOT directly assignable from `Float32Array<ArrayBufferLike>`.
**Action:** Instead of direct assignment or simple casting, create a new `Float32Array` of the target length and use `.set(sourceData)` to copy the values. This ensures the output buffer is a standard `ArrayBuffer`.
## 2025-05-15 - [Initial Performance Audit]
**Learning:** The `AudioAnalysisService` uses a naive $O(N^2)$ DFT implementation for frequency analysis, which is a major bottleneck for any audio longer than a few seconds. A Cooley-Tukey FFT ($O(N \log N)$) implementation exists in `FastFFTEngine.ts` but is currently unused in the main analysis pipeline.
**Action:** Replace the naive DFT in `AudioAnalysisService.ts` with the `FastFFTEngine` implementation.

## 2025-05-15 - [Single-Pass Audio Analysis Optimization]
**Learning:** Traversing large audio buffers multiple times for different metrics (Peak, RMS, DC Offset, Mono conversion) creates significant CPU overhead and cache misses. Additionally, $O(N \log N)$ operations like full-buffer sorting for Dynamic Range or Noise Floor calculations on 5-minute audio files ($N > 13M$ samples) can lead to memory spikes and multi-second delays.
**Action:** Consolidate multiple traversals into a single-pass `analyzeBasicStats` method. Use representative sampling ($M=10,000$) for percentile-based calculations to reduce complexity to $O(M \log M)$ without sacrificing perceptual accuracy.

## 2025-05-15 - [Branch Audit]
**Learning:** The repository contains many branches that appear to be independent projects (e.g., Firefox extensions, Linux Mint desktop environment, various separate apps).
**Action:** Identified branches to be moved to separate repositories to maintain "Song Generator Pro" focus.
