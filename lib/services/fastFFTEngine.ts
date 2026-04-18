// Advanced FFT Engine using Web Audio API for 100x faster performance
// Replaces the slow DFT implementation with proper FFT

import type { FrequencyBand } from '@/types';

export class FastFFTEngine {
  private audioContext: AudioContext;
  private static hannWindowCache: Map<number, Float32Array> = new Map();
  private static twiddleCache: Map<number, Float64Array> = new Map();
  private static bitReverseCache: Map<number, Int32Array> = new Map();

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
    return this.analyzeWithIterativeFFT(audioBuffer, fftSize);
  }

  /**
   * Analyze using iterative in-place FFT (O(N log N))
   * ⚡ Bolt Optimization: Iterative implementation avoids recursive overhead and array allocations.
   */
  private analyzeWithIterativeFFT(
    audioBuffer: AudioBuffer,
    fftSize: number
  ): FrequencyBand[] {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    // Use middle portion for analysis
    const startSample = Math.floor(channelData.length / 2) - Math.floor(fftSize / 2);
    const segment = channelData.subarray(Math.max(0, startSample), Math.min(channelData.length, startSample + fftSize));

    // Pad with zeros if necessary to reach fftSize
    const samples = new Float32Array(fftSize);
    samples.set(segment);

    // Apply Hann window in-place
    FastFFTEngine.applyHannWindow(samples, true);

    // Perform FFT using iterative Cooley-Tukey algorithm
    const fftResult = FastFFTEngine.cooleyTukeyFFT(samples);

    // Convert to frequency bands
    const spectrum: FrequencyBand[] = [];
    const numBins = fftSize / 2;
    for (let i = 0; i < numBins; i++) {
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
   */
  private static getTwiddleFactors(n: number): Float64Array {
    let factors = FastFFTEngine.twiddleCache.get(n);
    if (!factors) {
      factors = new Float64Array(n);
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
   * Get bit-reversal permutation indices for size n.
   */
  private static getBitReverseIndices(n: number): Int32Array {
    let indices = FastFFTEngine.bitReverseCache.get(n);
    if (!indices) {
      indices = new Int32Array(n);
      let j = 0;
      for (let i = 0; i < n; i++) {
        indices[i] = j;
        let m = n >> 1;
        while (m >= 1 && j >= m) {
          j -= m;
          m >>= 1;
        }
        j += m;
      }
      FastFFTEngine.bitReverseCache.set(n, indices);
    }
    return indices;
  }

  /**
   * Iterative In-Place Cooley-Tukey FFT algorithm
   * ⚡ Bolt Optimization: Iterative implementation with O(1) extra memory.
   * Supports an optional output buffer to allow zero-allocation operation during loops.
   */
  public static cooleyTukeyFFT(samples: Float32Array, output?: Float32Array): Float32Array {
    const n = samples.length;
    const result = output || new Float32Array(n * 2);

    // 1. Bit-reversal permutation
    const revIndices = FastFFTEngine.getBitReverseIndices(n);
    for (let i = 0; i < n; i++) {
      result[i * 2] = samples[revIndices[i]];
      result[i * 2 + 1] = 0;
    }

    // 2. Iterative FFT
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

          // Butterfly: t = odd * twiddle
          const tReal = cos * rOdd - sin * iOdd;
          const tImag = sin * rOdd + cos * iOdd;

          result[evenIdx] = rEven + tReal;
          result[evenIdx + 1] = iEven + tImag;
          result[oddIdx] = rEven - tReal;
          result[oddIdx + 1] = iEven - tImag;
        }
      }
    }

    return result;
  }

  /**
   * Apply Hann window to reduce spectral leakage.
   * @param inPlace If true, modifies the input array. Otherwise returns a new one.
   * ⚡ Bolt: Supports in-place operation to avoid memory allocation.
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
   * ⚡ Bolt: Restored method to maintain API compatibility.
   */
  getRealTimeFrequencyData(analyser: AnalyserNode): Float32Array {
    const frequencyData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(frequencyData);
    return frequencyData;
  }

  /**
   * Get real-time time domain data (for waveform visualization)
   * ⚡ Bolt: Restored method to maintain API compatibility.
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
   * ⚡ Bolt Optimization: Uses instance-level buffer reuse for FFT results to minimize GC pressure.
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

    // Reuse buffers to minimize GC
    const windowBuffer = new Float32Array(fftSize);
    const fftOutputBuffer = new Float32Array(fftSize * 2);

    for (let frame = 0; frame < numFrames; frame++) {
      const startSample = frame * hopSize;
      const samples = channelData.subarray(startSample, startSample + fftSize);

      // Copy to windowBuffer for in-place windowing
      windowBuffer.set(samples);
      FastFFTEngine.applyHannWindow(windowBuffer, true);

      // ⚡ Bolt: Reuse fftOutputBuffer to eliminate per-frame allocations
      FastFFTEngine.cooleyTukeyFFT(windowBuffer, fftOutputBuffer);

      const frameMagnitudes: number[] = [];
      for (let i = 0; i < fftSize / 2; i++) {
        const real = fftOutputBuffer[i * 2];
        const imag = fftOutputBuffer[i * 2 + 1];
        const magnitude = Math.sqrt(real * real + imag * imag) / fftSize;
        const magnitudeDB = magnitude > 0 ? 20 * Math.log10(magnitude) : -100;
        frameMagnitudes.push(magnitudeDB);
      }

      times.push((startSample / sampleRate));
      magnitudes.push(frameMagnitudes);

      // Yield every 100 frames to prevent UI blocking for long tracks
      if (frame % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return { times, frequencies, magnitudes };
  }
}

export default FastFFTEngine;
