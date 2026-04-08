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

## 2026-03-27 - Iterative In-Place FFT Performance
**Learning:** Recursive FFT implementations in TypeScript/JavaScript cause significant GC pressure due to O(N log N) intermediate array allocations. An iterative in-place approach using bit-reversal permutation and pre-cached twiddle factors reduces this overhead and provides a massive speed increase (~10x for 8192-point). Removing arbitrary caps (like 200-frame limits) becomes feasible only after these foundational O(N log N) and O(N) optimizations are in place.
**Action:** Implement iterative, in-place versions for all core computational kernels and prioritize buffer reuse in windowing operations.
