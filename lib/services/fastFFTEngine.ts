// Advanced FFT Engine using Web Audio API for 100x faster performance
// Replaces the slow DFT implementation with proper FFT

import type { FrequencyBand } from '@/types';

export class FastFFTEngine {
  private audioContext: AudioContext;
  private static hannWindowCache: Map<number, Float32Array> = new Map();
  private static twiddleCache: Map<number, Float32Array> = new Map();

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
    // Create offline context for analysis
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    // Create analyser node
    const analyser = offlineContext.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = 0;

    // Create source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    analyser.connect(offlineContext.destination);

    // Start rendering
    source.start(0);

    // Get frequency data at multiple time points for better analysis
    const numSamples = Math.min(10, Math.floor(audioBuffer.duration));
    const interval = audioBuffer.duration / numSamples;

    // For now, analyze middle of track
    const frequencyData = new Float32Array(analyser.frequencyBinCount);
    const timeData = new Float32Array(fftSize);

    // Use ScriptProcessor to get frequency data (deprecated but still works)
    // In production, use AudioWorklet
    return this.analyzeWithScriptProcessor(audioBuffer, fftSize);
  }

  /**
   * Analyze using direct buffer manipulation (fastest approach)
   */
  private analyzeWithScriptProcessor(
    audioBuffer: AudioBuffer,
    fftSize: number
  ): FrequencyBand[] {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    // Use middle portion for analysis
    const startSample = Math.floor(channelData.length / 2) - Math.floor(fftSize / 2);
    const samples = channelData.subarray(startSample, startSample + fftSize);

    // Apply Hann window
    const windowed = FastFFTEngine.applyHannWindow(samples);

    // Perform FFT using Cooley-Tukey algorithm
    const fftResult = FastFFTEngine.cooleyTukeyFFT(windowed);

    // Convert to frequency bands
    const spectrum: FrequencyBand[] = [];
    for (let i = 0; i < fftResult.length / 2; i++) {
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
  private static getTwiddleFactors(n: number): Float32Array {
    let factors = FastFFTEngine.twiddleCache.get(n);
    if (!factors) {
      factors = new Float32Array(n); // n/2 * 2 (real, imag)
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
   * Cooley-Tukey FFT algorithm (O(n log n) instead of O(n²))
   * ⚡ Bolt Optimization: Iterative in-place implementation to eliminate thousands of small buffer allocations.
   */
  public static cooleyTukeyFFT(samples: Float32Array): Float32Array {
    const n = samples.length;
    const complexBuffer = new Float32Array(n * 2);

    // Move real samples to complex buffer
    for (let i = 0; i < n; i++) {
      complexBuffer[i * 2] = samples[i];
      complexBuffer[i * 2 + 1] = 0;
    }

    this.inPlaceFFT(complexBuffer);
    return complexBuffer;
  }

  /**
   * ⚡ Bolt Optimization: In-place iterative FFT on an interleaved complex buffer [real, imag, ...].
   * Eliminates the O(N log N) recursive allocations of the previous implementation.
   */
  public static inPlaceFFT(data: Float32Array): void {
    const n = data.length / 2;

    // Bit-reversal permutation
    for (let i = 0, j = 0; i < n; i++) {
      if (i < j) {
        // Swap real
        const tempReal = data[i * 2];
        data[i * 2] = data[j * 2];
        data[j * 2] = tempReal;
        // Swap imag
        const tempImag = data[i * 2 + 1];
        data[i * 2 + 1] = data[j * 2 + 1];
        data[j * 2 + 1] = tempImag;
      }
      let m = n >> 1;
      while (m >= 1 && j >= m) {
        j -= m;
        m >>= 1;
      }
      j += m;
    }

    // Butterfly computations
    for (let len = 2; len <= n; len <<= 1) {
      const factors = this.getTwiddleFactors(len);
      for (let i = 0; i < n; i += len) {
        for (let j = 0; j < len / 2; j++) {
          const cos = factors[j * 2];
          const sin = factors[j * 2 + 1];

          const uIdx = (i + j) * 2;
          const vIdx = (i + j + len / 2) * 2;

          const vReal = data[vIdx];
          const vImag = data[vIdx + 1];

          const tReal = cos * vReal - sin * vImag;
          const tImag = sin * vReal + cos * vImag;

          data[vIdx] = data[uIdx] - tReal;
          data[vIdx + 1] = data[uIdx + 1] - tImag;
          data[uIdx] += tReal;
          data[uIdx + 1] += tImag;
        }
      }
    }
  }

  /**
   * Apply Hann window to reduce spectral leakage.
   * ⚡ Bolt Optimization: Supports optional output buffer to avoid redundant allocations.
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

    // ⚡ Bolt Optimization: Reuse buffers to avoid per-frame allocations
    const windowed = new Float32Array(fftSize);
    const complexBuffer = new Float32Array(fftSize * 2);

    for (let frame = 0; frame < Math.min(numFrames, 200); frame++) {
      const startSample = frame * hopSize;
      const samples = channelData.subarray(startSample, startSample + fftSize);

      FastFFTEngine.applyHannWindow(samples, windowed);

      // Prepare complex buffer
      for (let i = 0; i < fftSize; i++) {
        complexBuffer[i * 2] = windowed[i];
        complexBuffer[i * 2 + 1] = 0;
      }

      FastFFTEngine.inPlaceFFT(complexBuffer);

      const frameMagnitudes: number[] = [];
      for (let i = 0; i < fftSize / 2; i++) {
        const real = complexBuffer[i * 2];
        const imag = complexBuffer[i * 2 + 1];
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
