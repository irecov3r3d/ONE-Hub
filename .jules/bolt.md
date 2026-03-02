## 2025-05-14 - [O(N^2) Audio Processing Bottleneck]
**Learning:** The `AudioAnalysisService` was using a manual Discrete Fourier Transform (DFT) with $O(N^2)$ complexity for spectral analysis. With an `fftSize` of 8192, this was performing ~33 million complex multiplications and additions, causing significant blocking of the main thread during audio analysis. Switching to a Cooley-Tukey Fast Fourier Transform (FFT) with $O(N \log N)$ complexity reduced the work to ~106 thousand iterations.

**Action:** Always check mathematical algorithms for complexity bottlenecks. In audio processing, never use DFT when FFT is applicable. Use Cooley-Tukey or better for any $N$ that is a power of 2.

## 2025-05-14 - [Redundant Calculations in Multi-Module Analysis]
**Learning:** Different analysis modules (Frequency, Harmonics, Spectral) were independently calling `performFFT` with the same parameters on the same audio data. This resulted in redundant expensive calculations.

**Action:** Implement a transient cache for expensive derived data (like FFT results) within a single processing context to ensure "calculate once, use many" efficiency.
