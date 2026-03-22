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

## 2025-05-15 - [Consolidated Global Stats vs. Helper Traversals]
**Learning:** Even after implementing a single-pass statistics loop, downstream analysis functions (Stereo, Musical Features) may still perform their own $O(N)$ traversals for metrics like Phase Correlation or Pan Balance. These can almost always be derived in $O(1)$ from global accumulated sums (e.g., $\sum L \cdot R$ and $\sum |L|$).
**Action:** Always audit private helper methods for hidden $O(N)$ complexity and refactor them to consume the results of the primary statistics pass.

## 2025-05-15 - [FFT Trigonometric Caching]
**Learning:** Recomputing Hann window coefficients using `Math.cos` across thousands of FFT frames is a significant CPU bottleneck. Since FFT window sizes are deterministic (powers of 2), a static `Map` cache provides a measurable speedup with minimal memory overhead.
**Action:** Implement static caches for window coefficients and trigonometric twiddle factors in DSP engines.

## 2025-05-15 - [Sliding Window Limiter Optimization]
**Learning:** Audio limiters with lookahead often use a naive nested loop ($O(N \cdot L)$) to find peaks in future samples. For standard sample rates and lookahead windows, this creates a massive processing bottleneck that scales poorly with track length.
**Action:** Implement an $O(N)$ sliding window maximum algorithm using a monotonic deque (with a head pointer for true $O(1)$ amortized performance in JS) to handle lookahead peak detection.

## 2025-05-15 - [In-place EQ Processing]
**Learning:** Naive implementations of mastering chains often allocate fresh buffers for every processing stage (EQ, Compression, etc.). For EQ particularly, if each band creates a new buffer, a 10-band EQ on a 5-minute track can allocate gigabytes of transient memory, causing massive GC pressure.
**Action:** Refactor signal processing methods to operate in-place on existing channel buffers whenever possible. Ensure the Direct Form I biquad implementation captures the current input sample before modification to maintain recurrence relation integrity.
