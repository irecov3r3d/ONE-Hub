# ⚡ Song Generator Pro: Performance Synergy Analysis

## 🎯 Optimization Objective
The goal is to eliminate massive memory churn and redundant computations in the **Refinement** phase of the Song Generator Pro Hub, specifically within the chord progression and key detection pipeline.

## 🔄 Synergy Workflow
1.  **Generation Phase**: Produces a high-fidelity `AudioBuffer`.
2.  **Refinement Phase**:
    - `AudioAnalysisService` initiates analysis.
    - `AdvancedKeyDetection` is called for chord progression detection.
    - **Current Bottleneck**: `detectChordProgression` extracts 2-second segments by creating new `OfflineAudioContext` and `AudioBuffer` objects for every segment. For a 4-minute track, this is 120 buffer allocations and context initializations.
    - **Bolt Solution**: Implement **Zero-Copy Subarray Analysis**. Instead of copying samples into new buffers, we pass `Float32Array.subarray()` views directly to the FFT engine.

## 🛠️ Performance Improvements
- **Allocation-Free Segmenting**: Use `Float32Array.subarray()` to provide a view of the original buffer samples.
- **Polymorphic FFT**: Update `FastFFTEngine.performFFT` to support raw `Float32Array` inputs, bypassing `AudioBuffer` overhead.
- **Pitch Class Mapping Cache**: Pre-calculate the mapping from FFT bin to Pitch Class (0-11) based on the sample rate. This eliminates thousands of `Math.log2` and `Math.round` calls per analysis frame.

## 📊 Expected Impact
- **Memory**: Reduced GC pressure by eliminating ~120 `AudioBuffer` allocations per track analysis.
- **Speed**: Estimated 2x - 5x speedup for chord progression detection.
- **Responsiveness**: Improved UI fluidness during long track analysis as the main thread spends less time in allocation/GC.
