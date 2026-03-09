## 2025-05-15 - [Localizing Animation Frame Re-renders]
**Learning:** High-frequency state updates (60fps animation frames for spectral analysis and transport progress) at the top-level of a dashboard cause the entire application to re-render. This is a massive performance bottleneck when the dashboard contains many complex, heavy UI sections (Timeline, Mixer, Vault).
**Action:** Always isolate state that updates frequently into its own `React.memo` component. Pass only the minimum required refs or callbacks down.

## 2025-05-15 - [SharedArrayBuffer Type Mismatch]
**Learning:** Modern TypeScript compilers and Web Audio API environments may distinguish between `ArrayBuffer` and `ArrayBufferLike` (which includes `SharedArrayBuffer`). `Float32Array<ArrayBuffer>` is NOT directly assignable from `Float32Array<ArrayBufferLike>`.
**Action:** Instead of direct assignment or simple casting, create a new `Float32Array` of the target length and use `.set(sourceData)` to copy the values. This ensures the output buffer is a standard `ArrayBuffer`.
## 2025-05-15 - [Initial Performance Audit]
**Learning:** The `AudioAnalysisService` uses a naive $O(N^2)$ DFT implementation for frequency analysis, which is a major bottleneck for any audio longer than a few seconds. A Cooley-Tukey FFT ($O(N \log N)$) implementation exists in `FastFFTEngine.ts` but is currently unused in the main analysis pipeline.
**Action:** Replace the naive DFT in `AudioAnalysisService.ts` with the `FastFFTEngine` implementation.

## 2025-05-15 - [Single-Pass Audio Processing]
**Learning:** Traversing a million-sample audio buffer multiple times (mono conversion, peak detection, RMS calculation, DC offset) is a major hidden bottleneck in audio services. Consolidating these into a single loop significantly reduces memory bandwidth usage and CPU cycles.
**Action:** Use an `analyzeBasicStats` helper to perform all O(N) buffer operations in a single pass.

## 2025-05-15 - [Sampled Percentile Optimization]
**Learning:** Standard $O(N \log N)$ sorting of full audio buffers for dynamic range or noise floor analysis causes massive memory spikes and slow execution. Sorting a sampled subset (e.g., 10,000 points) provides near-identical results for these specific metrics at a fraction of the cost.
**Action:** Use TypedArray.sort() on a sampled subset for statistical audio metrics.

## 2025-05-15 - [Branch Audit]
**Learning:** The repository contains many branches that appear to be independent projects (e.g., Firefox extensions, Linux Mint desktop environment, various separate apps).
**Action:** Identified branches to be moved to separate repositories to maintain "Song Generator Pro" focus.
