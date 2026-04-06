// Advanced FFT Engine using Web Audio API for 100x faster performance
// Replaces the slow DFT implementation with proper FFT

import type { FrequencyBand } from '@/types';

export class FastFFTEngine {
  private audioContext: AudioContext;
  private static hannWindowCache: Map<number, Float32Array> = new Map();
  private static twiddleCache: Map<number, Float64Array> = new Map();
  private static bitReversalCache: Map<number, Uint32Array> = new Map();

  // Reusable buffers to minimize GC pressure during batch processing
  private fftBuffer: Float32Array | null = null;
  private windowBuffer: Float32Array | null = null;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  /**
   * Perform FFT using Web Audio API's AnalyserNode (100x faster than DFT)
   */
  async performFFT(
    audioBuffer: AudioBuffer,
    fftSize: number = 8192
  ): Promise<FrequencyBand[]> {
    // For now, analyze middle of track using direct buffer manipulation
    return this.analyzeWithScriptProcessor(audioBuffer, fftSize);
  }

  /**
   * Analyze using direct buffer manipulation (fastest approach)
   * ⚡ Bolt Optimization: Uses reusable buffers to eliminate O(F) allocations per frame.
   */
  private analyzeWithScriptProcessor(
    audioBuffer: AudioBuffer,
    fftSize: number
  ): FrequencyBand[] {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    // Use middle portion for analysis
    const startSample = Math.max(0, Math.floor(channelData.length / 2) - Math.floor(fftSize / 2));
    const samples = channelData.subarray(startSample, Math.min(channelData.length, startSample + fftSize));

    // Pad with zeros if necessary
    const paddedSamples = new Float32Array(fftSize);
    paddedSamples.set(samples);

    // Initialize reusable buffers
    if (!this.fftBuffer || this.fftBuffer.length !== fftSize * 2) {
      this.fftBuffer = new Float32Array(fftSize * 2);
    }
    if (!this.windowBuffer || this.windowBuffer.length !== fftSize) {
      this.windowBuffer = new Float32Array(fftSize);
    }

    // Apply Hann window in-place to our reusable windowBuffer
    FastFFTEngine.applyHannWindow(paddedSamples, this.windowBuffer);

    // Prepare interleaved real/imag data for in-place FFT
    for (let i = 0; i < fftSize; i++) {
      this.fftBuffer[i * 2] = this.windowBuffer[i];
      this.fftBuffer[i * 2 + 1] = 0;
    }

    // Perform FFT using iterative in-place algorithm
    FastFFTEngine.inplaceFFT(this.fftBuffer);

    // Convert to frequency bands
    const spectrum: FrequencyBand[] = [];
    const scale = 1.0 / fftSize;
    for (let i = 0; i < fftSize / 2; i++) {
      const real = this.fftBuffer[i * 2];
      const imag = this.fftBuffer[i * 2 + 1];
      const magnitude = Math.sqrt(real * real + imag * imag) * scale;
      const phase = Math.atan2(imag, real);
      const magnitudeDB = magnitude > 0 ? 20 * Math.log10(magnitude) : -100;

      spectrum.push({
        frequency: (i * sampleRate) / fftSize,
        magnitude: magnitudeDB,
        phase,
      });
    }

    return spectrum;
  }

  /**
   * Get pre-calculated twiddle factors (cos/sin) for FFT size n.
   * Interleaved as [cos(0), sin(0), cos(angle), sin(angle), ...]
   * ⚡ Bolt: Uses Float64Array for twiddles to maintain better precision during intermediate products.
   */
  private static getTwiddleFactors(n: number): Float64Array {
    let factors = FastFFTEngine.twiddleCache.get(n);
    if (!factors) {
      factors = new Float64Array(n); // n/2 * 2 (real, imag)
      for (let k = 0; k < n / 2; k++) {
        const angle = -2 * Math.PI * k / n;
        factors[k * 2] = Math.cos(angle);
        factors[k * 2 + 1] = Math.sin(angle);
      }
      FastFFTEngine.twiddleCache.set(n, factors);
    }
    return factors;
  }

  /**
   * Get pre-calculated bit-reversal indices for FFT size n.
   */
  private static getBitReversalIndices(n: number): Uint32Array {
    let indices = FastFFTEngine.bitReversalCache.get(n);
    if (!indices) {
      indices = new Uint32Array(n);
      const bits = Math.round(Math.log2(n));
      for (let i = 0; i < n; i++) {
        let j = 0;
        for (let b = 0; b < bits; b++) {
          if ((i >> b) & 1) {
            j |= (1 << (bits - 1 - b));
          }
        }
        indices[i] = j;
      }
      FastFFTEngine.bitReversalCache.set(n, indices);
    }
    return indices;
  }

  /**
   * ⚡ Bolt Optimization: Iterative In-place Cooley-Tukey FFT.
   * Eliminates the recursion depth and thousands of Float32Array allocations.
   * @param data Interleaved real/imaginary values [r0, i0, r1, i1, ...]
   */
  public static inplaceFFT(data: Float32Array): void {
    const n = data.length >> 1;
    const indices = this.getBitReversalIndices(n);

    // 1. Bit-reversal permutation
    for (let i = 0; i < n; i++) {
      const j = indices[i];
      if (i < j) {
        const i2 = i << 1;
        const j2 = j << 1;
        // Swap real
        let temp = data[i2];
        data[i2] = data[j2];
        data[j2] = temp;
        // Swap imag
        temp = data[i2 + 1];
        data[i2 + 1] = data[j2 + 1];
        data[j2 + 1] = temp;
      }
    }

    // 2. Iterative butterflies
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const twiddles = this.getTwiddleFactors(len);

      for (let i = 0; i < n; i += len) {
        for (let j = 0; j < halfLen; j++) {
          const j2 = j << 1;
          const evenIdx = (i + j) << 1;
          const oddIdx = evenIdx + len;

          const cos = twiddles[j2];
          const sin = twiddles[j2 + 1];

          const rOdd = data[oddIdx];
          const iOdd = data[oddIdx + 1];

          // Complex multiplication: (rOdd + iOdd*i) * (cos + sin*i)
          const tr = rOdd * cos - iOdd * sin;
          const ti = rOdd * sin + iOdd * cos;

          const rEven = data[evenIdx];
          const iEven = data[evenIdx + 1];

          data[oddIdx] = rEven - tr;
          data[oddIdx + 1] = iEven - ti;
          data[evenIdx] = rEven + tr;
          data[evenIdx + 1] = iEven + ti;
        }
      }
    }
  }

  /**
   * Deprecated recursive implementation for backwards compatibility.
   * @deprecated Use inplaceFFT instead.
   */
  public static cooleyTukeyFFT(samples: Float32Array): Float32Array {
    const n = samples.length;
    const data = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      data[i * 2] = samples[i];
      data[i * 2 + 1] = 0;
    }
    this.inplaceFFT(data);
    return data;
  }

  /**
   * Apply Hann window to reduce spectral leakage.
   * ⚡ Bolt Optimization: Supports in-place processing and caches coefficients.
   */
  public static applyHannWindow(samples: Float32Array, output?: Float32Array): Float32Array {
    const n = samples.length;
    let window = FastFFTEngine.hannWindowCache.get(n);

    if (!window) {
      window = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / n));
      }
      FastFFTEngine.hannWindowCache.set(n, window);
    }

    const result = output || new Float32Array(n);
    for (let i = 0; i < n; i++) {
      result[i] = samples[i] * window[i];
    }
    return result;
  }

  /**
   * Get real-time frequency data (for live visualization)
   */
  getRealTimeFrequencyData(analyser: AnalyserNode): Float32Array {
    const frequencyData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(frequencyData);
    return frequencyData;
  }

  /**
   * Get real-time time domain data (for waveform visualization)
   */
  getRealTimeWaveformData(analyser: AnalyserNode): Float32Array {
    const waveformData = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(waveformData);
    return waveformData;
  }

  /**
   * Ensure FFT size is power of 2
   */
  static getValidFFTSize(desiredSize: number): number {
    const sizes = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
    return sizes.find(size => size >= desiredSize) || 8192;
  }

  /**
   * Calculate spectrogram (time-frequency representation)
   * ⚡ Bolt Optimization: Uses reusable buffers to eliminate allocations in the inner loop.
   */
  async calculateSpectrogram(
    audioBuffer: AudioBuffer,
    fftSize: number = 2048,
    hopSize: number = 512
  ): Promise<{
    times: number[];
    frequencies: number[];
    magnitudes: number[][];
  }> {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const times: number[] = [];
    const frequencies: number[] = [];
    const magnitudes: number[][] = [];

    // Generate frequency axis
    for (let i = 0; i < fftSize / 2; i++) {
      frequencies.push((i * sampleRate) / fftSize);
    }

    // Initialize reusable buffers
    if (!this.fftBuffer || this.fftBuffer.length !== fftSize * 2) {
      this.fftBuffer = new Float32Array(fftSize * 2);
    }
    if (!this.windowBuffer || this.windowBuffer.length !== fftSize) {
      this.windowBuffer = new Float32Array(fftSize);
    }

    // Process audio in overlapping windows
    const numFrames = Math.floor((channelData.length - fftSize) / hopSize);

    const scale = 1.0 / fftSize;
    for (let frame = 0; frame < numFrames; frame++) {
      const startSample = frame * hopSize;
      const samples = channelData.subarray(startSample, startSample + fftSize);

      // ⚡ Bolt: Use reusable windowBuffer
      FastFFTEngine.applyHannWindow(samples, this.windowBuffer);

      // ⚡ Bolt: Prepare reusable fftBuffer
      for (let i = 0; i < fftSize; i++) {
        this.fftBuffer[i * 2] = this.windowBuffer[i];
        this.fftBuffer[i * 2 + 1] = 0;
      }

      // ⚡ Bolt: Perform in-place FFT
      FastFFTEngine.inplaceFFT(this.fftBuffer);

      const frameMagnitudes: number[] = [];
      for (let i = 0; i < fftSize / 2; i++) {
        const real = this.fftBuffer[i * 2];
        const imag = this.fftBuffer[i * 2 + 1];
        const magnitude = Math.sqrt(real * real + imag * imag) * scale;
        const magnitudeDB = magnitude > 0 ? 20 * Math.log10(magnitude) : -100;
        frameMagnitudes.push(magnitudeDB);
      }

      times.push((startSample / sampleRate));
      magnitudes.push(frameMagnitudes);
    }

    return { times, frequencies, magnitudes };
  }
}

export default FastFFTEngine;
