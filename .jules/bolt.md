## 2024-05-20 - Consolidated Audio Analysis Pipeline
**Learning:** The previous audio analysis pipeline performed multiple O(N) traversals for mono conversion, peak detection, DC offset, and RMS calculation. By consolidating these into a single-pass loop in `analyzeBasicStats`, we reduce CPU overhead and cache misses significantly.
**Action:** Always look for opportunities to merge buffer traversals in audio processing services.

## 2024-05-20 - Memory Efficiency in FFT Windowing
**Learning:** Using `.slice()` on large typed arrays like `Float32Array` during windowing (e.g., for FFTs or spectrograms) creates expensive copies. Switching to `.subarray()` provides a view of the existing memory, which is much faster and reduces GC pressure, provided the receiving function is non-mutating.
**Action:** Prefer `.subarray()` over `.slice()` for read-only windowing operations on TypedArrays.
