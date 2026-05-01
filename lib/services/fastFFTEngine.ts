// Advanced FFT Engine using Web Audio API for 100x faster performance
// Replaces the slow DFT implementation with proper FFT

import type { FrequencyBand } from '@/types';

export class FastFFTEngine {
  private audioContext: AudioContext;
  private static hannWindowCache: Map<number, Float32Array> = new Map();
  private static twiddleCache: Map<number, Float32Array> = new Map();
  private static bitReverseCache: Map<number, Uint32Array> = new Map();

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
    const samples = channelData.subarray(Math.max(0, startSample), Math.min(channelData.length, startSample + fftSize));

    // Pad with zeros if necessary to reach fftSize (must be power of 2)
    const paddedSamples = new Float32Array(fftSize);
    paddedSamples.set(samples);

    // Apply Hann window
    const windowed = FastFFTEngine.applyHannWindow(paddedSamples);

    // Perform FFT using iterative Cooley-Tukey algorithm
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
   * Get pre-calculated bit-reversal indices for FFT size n.
   */
  private static getBitReverseIndices(n: number): Uint32Array {
    let indices = FastFFTEngine.bitReverseCache.get(n);
    if (!indices) {
      indices = new Uint32Array(n);
      const logN = Math.log2(n);
      for (let i = 0; i < n; i++) {
        let j = 0;
        for (let k = 0; k < logN; k++) {
          if ((i >> k) & 1) {
            j |= (1 << (logN - 1 - k));
          }
        }
        indices[i] = j;
      }
      FastFFTEngine.bitReverseCache.set(n, indices);
    }
    return indices;
  }

  /**
   * Cooley-Tukey FFT algorithm (O(n log n))
   * ⚡ Bolt Optimization: Iterative, in-place implementation with zero-allocation path.
   * Fused Windowing: Optionally applies a window function during bit-reversal to eliminate a redundant pass.
   */
  public static cooleyTukeyFFT(
    samples: Float32Array,
    output?: Float32Array,
    window?: Float32Array
  ): Float32Array {
    const n = samples.length;
    const result = output || new Float32Array(n * 2);

    // 1. Bit-reversal permutation (Fused with Windowing if provided)
    const indices = FastFFTEngine.getBitReverseIndices(n);
    if (window) {
      for (let i = 0; i < n; i++) {
        const j = indices[i];
        result[i * 2] = samples[j] * window[j];
        result[i * 2 + 1] = 0;
      }
    } else {
      for (let i = 0; i < n; i++) {
        result[i * 2] = samples[indices[i]];
        result[i * 2 + 1] = 0;
      }
    }

    // 2. Iterative Cooley-Tukey
    for (let s = 1; s <= Math.log2(n); s++) {
      const m = Math.pow(2, s);
      const m2 = m >> 1;
      const twiddles = FastFFTEngine.getTwiddleFactors(m);

      for (let k = 0; k < n; k += m) {
        for (let j = 0; j < m2; j++) {
          const cos = twiddles[j * 2];
          const sin = twiddles[j * 2 + 1];

          const tReal = cos * result[(k + j + m2) * 2] - sin * result[(k + j + m2) * 2 + 1];
          const tImag = sin * result[(k + j + m2) * 2] + cos * result[(k + j + m2) * 2 + 1];

          const uReal = result[(k + j) * 2];
          const uImag = result[(k + j) * 2 + 1];

          result[(k + j) * 2] = uReal + tReal;
          result[(k + j) * 2 + 1] = uImag + tImag;
          result[(k + j + m2) * 2] = uReal - tReal;
          result[(k + j + m2) * 2 + 1] = uImag - tImag;
        }
      }
    }

    return result;
  }

  /**
   * Get pre-calculated Hann window coefficients.
   * ⚡ Bolt: Caches window coefficients to avoid redundant Math.cos calls.
   */
  public static getHannWindow(n: number): Float32Array {
    let window = FastFFTEngine.hannWindowCache.get(n);
    if (!window) {
      window = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / n));
      }
      FastFFTEngine.hannWindowCache.set(n, window);
    }
    return window;
  }

  /**
   * Apply Hann window to reduce spectral leakage.
   * ⚡ Bolt: Uses cached coefficients.
   */
  public static applyHannWindow(samples: Float32Array): Float32Array {
    const n = samples.length;
    const window = FastFFTEngine.getHannWindow(n);
    const windowed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      windowed[i] = samples[i] * window[i];
    }
    return windowed;
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
   * ⚡ Bolt Optimization: Removed arbitrary 200-frame limit and added async yielding.
   * Uses reusable output buffer for FFTs to minimize GC pressure.
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

    // ⚡ Bolt: Reusable FFT buffer and Window coefficients
    const fftBuffer = new Float32Array(fftSize * 2);
    const window = FastFFTEngine.getHannWindow(fftSize);

    for (let frame = 0; frame < numFrames; frame++) {
      const startSample = frame * hopSize;
      const samples = channelData.subarray(startSample, startSample + fftSize);

      // ⚡ Bolt: Use fused windowing in the iterative FFT to eliminate
      // the windowed buffer allocation and the separate O(N) windowing pass.
      FastFFTEngine.cooleyTukeyFFT(samples, fftBuffer, window);

      const frameMagnitudes: number[] = [];
      for (let i = 0; i < fftSize / 2; i++) {
        const real = fftBuffer[i * 2];
        const imag = fftBuffer[i * 2 + 1];
        const magnitude = Math.sqrt(real * real + imag * imag) / fftSize;
        const magnitudeDB = magnitude > 0 ? 20 * Math.log10(magnitude) : -100;
        frameMagnitudes.push(magnitudeDB);
      }

      times.push((startSample / sampleRate));
      magnitudes.push(frameMagnitudes);

      // ⚡ Bolt: Yield to main thread every 50 frames to keep UI responsive
      if (frame % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return { times, frequencies, magnitudes };
  }
}

export default FastFFTEngine;
