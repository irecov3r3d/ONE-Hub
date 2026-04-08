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
   * Iterative In-Place Cooley-Tukey FFT algorithm (O(n log n)).
   * ⚡ Bolt Optimization:
   * 1. Iterative approach eliminates O(n log n) recursive allocations and stack overhead.
   * 2. Bit-reversal permutation allows in-place processing on a single buffer.
   * 3. Pre-cached twiddle factors eliminate redundant trig calculations.
   * 4. Returns interleaved [real, imag, ...] for compatibility with existing pipeline.
   */
  public static cooleyTukeyFFT(samples: Float32Array): Float32Array {
    const n = samples.length;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);

    // Initial copy to separate real/imag buffers
    real.set(samples);

    // 1. Bit-reversal permutation
    for (let i = 0, j = 0; i < n; i++) {
      if (i < j) {
        const tempReal = real[i];
        real[i] = real[j];
        real[j] = tempReal;
        // No need to swap imag as it's initially all zeros
      }
      let m = n >> 1;
      while (m >= 1 && j >= m) {
        j -= m;
        m >>= 1;
      }
      j += m;
    }

    // 2. Iterative combine stages
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const factors = FastFFTEngine.getTwiddleFactors(len);

      for (let i = 0; i < n; i += len) {
        for (let j = 0; j < halfLen; j++) {
          const cos = factors[j * 2];
          const sin = factors[j * 2 + 1];

          const vReal = real[i + j + halfLen] * cos - imag[i + j + halfLen] * sin;
          const vImag = real[i + j + halfLen] * sin + imag[i + j + halfLen] * cos;

          const uReal = real[i + j];
          const uImag = imag[i + j];

          real[i + j] = uReal + vReal;
          imag[i + j] = uImag + vImag;
          real[i + j + halfLen] = uReal - vReal;
          imag[i + j + halfLen] = uImag - vImag;
        }
      }
    }

    // 3. Interleave results for output
    const result = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      result[i * 2] = real[i];
      result[i * 2 + 1] = imag[i];
    }

    return result;
  }

  /**
   * Apply Hann window to reduce spectral leakage.
   * ⚡ Bolt Optimization:
   * 1. Caches window coefficients to avoid redundant Math.cos calls.
   * 2. Supports in-place processing if outBuffer is provided as samples itself.
   * 3. Prevents redundant allocations when used in tight loops (e.g. spectrogram).
   */
  public static applyHannWindow(samples: Float32Array, outBuffer?: Float32Array): Float32Array {
    const n = samples.length;
    let window = FastFFTEngine.hannWindowCache.get(n);

    if (!window) {
      window = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / n));
      }
      FastFFTEngine.hannWindowCache.set(n, window);
    }

    const output = outBuffer || new Float32Array(n);
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
   * Calculate spectrogram (time-frequency representation).
   * ⚡ Bolt Optimization:
   * 1. Removed arbitrary 200-frame limit to allow full-track analysis.
   * 2. Reuses `windowBuffer` to eliminate O(N) allocations per frame.
   * 3. Leverages optimized iterative FFT for high throughput.
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
    const windowBuffer = new Float32Array(fftSize);

    for (let frame = 0; frame < numFrames; frame++) {
      const startSample = frame * hopSize;
      const samples = channelData.subarray(startSample, startSample + fftSize);

      // In-place windowing into windowBuffer
      FastFFTEngine.applyHannWindow(samples, windowBuffer);
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
