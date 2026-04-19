## 2024-05-20 - Consolidated Audio Analysis Pipeline
**Learning:** The previous audio analysis pipeline performed multiple O(N) traversals for mono conversion, peak detection, DC offset, and RMS calculation. By consolidating these into a single-pass loop in `analyzeBasicStats`, we reduce CPU overhead and cache misses significantly.
**Action:** Always look for opportunities to merge buffer traversals in audio processing services.

## 2024-05-20 - Memory Efficiency in FFT Windowing
**Learning:** Using `.slice()` on large typed arrays like `Float32Array` during windowing (e.g., for FFTs or spectrograms) creates expensive copies. Switching to `.subarray()` provides a view of the existing memory, which is much faster and reduces GC pressure, provided the receiving function is non-mutating.
**Action:** Prefer `.subarray()` over `.slice()` for read-only windowing operations on TypedArrays.

## 2026-03-25 - In-Place Mastering Chain Performance
**Learning:** The previous `AudioMasteringService` processing chain created new `Float32Array` buffers for every effect stage (Compression, Saturation, Exciter, Limiting, Dithering). For a 4-minute stereo track at 44.1kHz, each allocation is ~42MB. 8+ such allocations per mastering pass caused significant GC pressure and potentially hundreds of megabytes of overhead. Refactoring these to be in-place eliminates this overhead entirely.
**Action:** In high-throughput audio pipelines, prioritize in-place buffer mutation over functional-style immutability to minimize memory churn.

## 2026-03-26 - In-Place Mid/Side Processing
**Learning:** Even after optimizing the main mastering chain, secondary processing like Mid/Side was still performing redundant `Float32Array` allocations. For a 4-minute stereo track, this was an extra ~84MB of memory churn. Refactoring this to use local stack variables for the MS encode before overwriting the channel buffers in-place eliminates this overhead.
**Action:** Always verify that every stage of a signal processing chain is optimized for buffer reuse, especially when dealing with multi-channel interdependency.

## 2026-03-27 - Block-Based Sliding Window Optimization
**Learning:** Sliding window algorithms with high overlap (e.g., 75% overlap in loudness analysis) often re-calculate energy for the same samples repeatedly, leading to $O(N \cdot W)$ complexity. By pre-calculating sum-of-squares and peaks for each hop-sized block, we can combine these blocks to derive window results in $O(N \cdot (W/H))$ time. This resulted in a ~2.2x speedup for a 400ms window and 100ms hop.
**Action:** For sliding window analysis on large audio buffers, prioritize block-based pre-calculation to minimize redundant traversals.
