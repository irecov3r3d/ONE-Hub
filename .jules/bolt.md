## 2025-05-15 - [Initial Performance Audit]
**Learning:** The `AudioAnalysisService` uses a naive $O(N^2)$ DFT implementation for frequency analysis, which is a major bottleneck for any audio longer than a few seconds. A Cooley-Tukey FFT ($O(N \log N)$) implementation exists in `FastFFTEngine.ts` but is currently unused in the main analysis pipeline.
**Action:** Replace the naive DFT in `AudioAnalysisService.ts` with the `FastFFTEngine` implementation.

## 2025-05-15 - [Branch Audit]
**Learning:** The repository contains many branches that appear to be independent projects (e.g., Firefox extensions, Linux Mint desktop environment, various separate apps).
**Action:** Identified branches to be moved to separate repositories to maintain "Song Generator Pro" focus.
