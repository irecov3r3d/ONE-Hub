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

## 2024-05-21 - Iterative In-Place FFT Performance
**Learning:** Replacing recursive Cooley-Tukey FFT with an iterative, in-place implementation (using bit-reversal permutation and twiddle caching) achieved an ~8.5x speedup and eliminated (N \log N)$ intermediate array allocations. Recursive calls in JavaScript are expensive due to stack overhead and constant memory churn, which can trigger frequent GC pauses during long audio analysis.
**Action:** For heavy numerical processing, prioritize iterative algorithms that operate on a single pre-allocated buffer or support zero-allocation via an output buffer.

## 2026-03-27 - Block-Based Loudness Analysis Speedup
**Learning:** Sliding window algorithms (like loudness over time) often involve redundant calculations if the window overlaps significantly with the hop size. By pre-calculating metrics (energy, peaks) for non-overlapping blocks equal to the hop size, and then aggregating these blocks for the window, we reduce complexity from O(N * W) to O(N). For this app's 400ms window and 100ms hop, this achieved a verified ~3.9x speedup.
**Action:** When implementing sliding window algorithms with high overlap, use a block-based pre-calculation approach to minimize redundant buffer traversals.

## 2026-05-03 - Fused FFT Windowing
**Learning:** Applying a windowing function (like Hann) separately before an FFT involves an extra O(N) traversal and usually a temporary buffer allocation. By fusing the window application into the bit-reversal/permutation phase of the FFT, we eliminate the extra pass and allocation entirely.
**Action:** In signal processing pipelines, look for opportunities to fuse element-wise operations (windowing, gain, etc.) into the first or last pass of complex transformations like FFT to reduce memory bandwidth and GC pressure.

## 2026-05-04 - TypedArray vs DataView in High-Frequency Loops
**Learning:** `DataView.setInt16` (and other `set` methods) are significantly slower than direct `TypedArray` access in high-frequency loops (e.g., millions of iterations). For WAV export, switching to a direct `Int16Array` view of the destination `ArrayBuffer` on little-endian hosts achieved a measurable ~1.6x speedup. Unrolling the loop for common channel counts (like stereo) provides additional performance gains by reducing indexing overhead and improving JIT optimization.
**Action:** When performing millions of writes to an `ArrayBuffer`, check host endianness and prefer direct `TypedArray` views over `DataView` whenever possible.

## 2026-05-05 - Spectral Analysis Redundancy and Hot Loop Indexing
**Learning:** Even with an optimized FFT, downstream spectral analysis (Centroid, Rolloff, Flatness) can become a bottleneck if each feature performs redundant (N)$ traversals and millions of `Math.pow` calls to convert decibels to linear magnitudes. Additionally, using `Math.floor` for block indexing inside a hot (N)$ loop (millions of iterations) adds measurable CPU overhead compared to local counters.
**Action:** Lift common mathematical transformations (like Decibel to Linear) into a pre-calculation pass before feature extraction, and use local counters for window/block indexing in high-frequency audio loops.

## 2026-05-06 - Zero-Copy Polymorphic Segment Analysis
**Learning:** Extracting audio segments for iterative sub-analysis (e.g., chord progression detection over rolling time windows) via nested loops, `OfflineAudioContext`, and temporary `AudioBuffer` objects creates extreme memory pressure, high garbage collection overhead, and slow execution. By refactoring processing methods polymorphically to accept both `AudioBuffer` and `Float32Array`, we can use `Float32Array.subarray()` to pass a zero-copy slice of the main audio channel directly to our downstream FFT/DSP components.
**Action:** Always write analysis and DSP functions polymorphically to accept raw `Float32Array` buffers alongside full `AudioBuffer` objects, enabling high-performance, zero-allocation sliding window analysis.

## 2026-05-07 - Waveform Editor Canvas rendering using Path2D
**Learning:** Rendering complex waveforms in React canvas components iteratively changes `fillStyle` and calls `fillRect` for every single sample/bar, leading to substantial canvas state-change and draw overhead (O(N) operations). By categorizing samples into state-dependent arrays (e.g. Played, Unplayed, Trimmed, Selected) and constructing separate `Path2D` objects, we can draw the entire canvas in O(1) fill calls per color group.
**Action:** In dynamic HTML5 Canvas rendering loops, group drawing segments by state and use `Path2D` to batch render multiple shapes in a single draw call.
