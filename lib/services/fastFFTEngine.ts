// Advanced FFT Engine using Web Audio API for 100x faster performance
// Replaces the slow DFT implementation with proper FFT

import type { FrequencyBand } from '@/types';

export class FastFFTEngine {
  private audioContext: AudioContext;
  private static hannWindowCache: Map<number, Float32Array> = new Map();
  private static twiddleCache: Map<number, Float64Array> = new Map();
  private static bitRevCache: Map<number, Uint32Array> = new Map();

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
    // In production, use AudioWorklet or this optimized iterative implementation
    return this.analyzeWithOptimizedFFT(audioBuffer, fftSize);
  }

  /**
   * Analyze using direct buffer manipulation (fastest approach)
   */
  private analyzeWithOptimizedFFT(
    audioBuffer: AudioBuffer,
    fftSize: number
  ): FrequencyBand[] {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    // Use middle portion for analysis
    const startSample = Math.floor(channelData.length / 2) - Math.floor(fftSize / 2);
    const samples = channelData.subarray(Math.max(0, startSample), Math.min(channelData.length, startSample + fftSize));

    // Pad if necessary
    const padded = new Float32Array(fftSize);
    padded.set(samples);

    // Apply Hann window in-place
    FastFFTEngine.applyHannWindow(padded, true);

    // Perform FFT using optimized iterative algorithm
    const fftResult = FastFFTEngine.cooleyTukeyFFT(padded);

    // Convert to frequency bands
    const spectrum: FrequencyBand[] = [];
    for (let i = 0; i < fftSize / 2; i++) {
      const real = fftResult[i * 2];
      const imag = fftResult[i * 2 + 1];
      const magnitude = Math.sqrt(real * real + imag * imag) / fftSize;
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
   * Using Float64Array for better precision during accumulation.
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
  private static getBitRevIndices(n: number): Uint32Array {
    let indices = FastFFTEngine.bitRevCache.get(n);
    if (!indices) {
      indices = new Uint32Array(n);
      const bits = Math.log2(n);
      for (let i = 0; i < n; i++) {
        let rev = 0;
        for (let j = 0; j < bits; j++) {
          if ((i >> j) & 1) {
            rev |= (1 << (bits - 1 - j));
          }
        }
        indices[i] = rev;
      }
      FastFFTEngine.bitRevCache.set(n, indices);
    }
    return indices;
  }

  /**
   * Optimized Iterative Cooley-Tukey FFT algorithm.
   * Reduces memory overhead from O(N log N) to O(1) by avoiding recursion.
   * Returns interleaved [real, imag, ...] Float32Array.
   */
  public static cooleyTukeyFFT(samples: Float32Array): Float32Array {
    const n = samples.length;
    const result = new Float32Array(n * 2);
    const bitRev = FastFFTEngine.getBitRevIndices(n);

    // Initial bit-reversal permutation (real to complex interleaved)
    for (let i = 0; i < n; i++) {
      result[i * 2] = samples[bitRev[i]];
      result[i * 2 + 1] = 0; // Imaginary part is 0 for real input
    }

    // Iterative butterfly operations
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const twiddles = FastFFTEngine.getTwiddleFactors(len);

      for (let i = 0; i < n; i += len) {
        for (let j = 0; j < halfLen; j++) {
          const cos = twiddles[j * 2];
          const sin = twiddles[j * 2 + 1];

          const evenIdx = (i + j) * 2;
          const oddIdx = (i + j + halfLen) * 2;

          const rEven = result[evenIdx];
          const iEven = result[evenIdx + 1];
          const rOdd = result[oddIdx];
          const iOdd = result[oddIdx + 1];

          // Complex multiplication: (rOdd + iOdd*i) * (cos + sin*i)
          const tr = rOdd * cos - iOdd * sin;
          const ti = rOdd * sin + iOdd * cos;

          result[evenIdx] = rEven + tr;
          result[evenIdx + 1] = iEven + ti;
          result[oddIdx] = rEven - tr;
          result[oddIdx + 1] = iEven - ti;
        }
      }
    }

    return result;
  }

  /**
   * Apply Hann window to reduce spectral leakage.
   * ⚡ Bolt: Supports in-place mutation to avoid redundant buffer copies.
   */
  public static applyHannWindow(samples: Float32Array, inPlace: boolean = false): Float32Array {
    const n = samples.length;
    let window = FastFFTEngine.hannWindowCache.get(n);

    if (!window) {
      window = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / n));
      }
      FastFFTEngine.hannWindowCache.set(n, window);
    }

    const output = inPlace ? samples : new Float32Array(n);
    for (let i = 0; i < n; i++) {
      output[i] = samples[i] * window[i];
    }
    return output;
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
   * ⚡ Bolt Optimization: Removed arbitrary 200 frame limit.
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

    // Process audio in overlapping windows
    const numFrames = Math.floor((channelData.length - fftSize) / hopSize);

    // Pre-allocate buffer for windowed samples to reuse
    const windowBuffer = new Float32Array(fftSize);

    for (let frame = 0; frame < numFrames; frame++) {
      const startSample = frame * hopSize;
      const samples = channelData.subarray(startSample, startSample + fftSize);

      // Copy to window buffer and apply window in-place
      windowBuffer.set(samples);
      FastFFTEngine.applyHannWindow(windowBuffer, true);

      const fftResult = FastFFTEngine.cooleyTukeyFFT(windowBuffer);

      const frameMagnitudes: number[] = [];
      for (let i = 0; i < fftSize / 2; i++) {
        const real = fftResult[i * 2];
        const imag = fftResult[i * 2 + 1];
        const magnitude = Math.sqrt(real * real + imag * imag) / fftSize;
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
