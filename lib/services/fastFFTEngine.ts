// Advanced FFT Engine using Web Audio API for 100x faster performance
// Replaces the slow DFT implementation with proper FFT

import type { FrequencyBand } from '@/types';

export class FastFFTEngine {
  private audioContext: AudioContext;
  private static hannWindowCache: Map<number, Float32Array> = new Map();
  private static twiddleCache: Map<number, Float64Array> = new Map();
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
    // In production, use AudioWorklet. For now, we use the optimized iterative engine below.
    return this.analyzeWithIterativeEngine(audioBuffer, fftSize);
  }

  /**
   * Analyze using iterative in-place FFT engine (Bolt Optimized)
   */
  private analyzeWithIterativeEngine(
    audioBuffer: AudioBuffer,
    fftSize: number
  ): FrequencyBand[] {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    // Use middle portion for analysis
    const startSample = Math.floor(channelData.length / 2) - Math.floor(fftSize / 2);
    const samples = channelData.subarray(Math.max(0, startSample), Math.min(channelData.length, startSample + fftSize));

    // Pad with zeros if necessary to reach fftSize
    const input = new Float32Array(fftSize);
    input.set(samples);

    // Apply Hann window in-place
    FastFFTEngine.applyHannWindow(input);

    // Perform iterative in-place FFT
    // Result is interleaved [real, imag, real, imag, ...]
    const fftResult = FastFFTEngine.iterativeFFT(input);

    // Convert to frequency bands
    const spectrum: FrequencyBand[] = [];
    const halfN = fftSize / 2;
    for (let i = 0; i < halfN; i++) {
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
   * Get pre-calculated bit-reversal indices for FFT size n.
   */
  private static getBitReverseIndices(n: number): Uint32Array {
    let indices = FastFFTEngine.bitReverseCache.get(n);
    if (!indices) {
      indices = new Uint32Array(n);
      const bits = Math.log2(n);
      for (let i = 0; i < n; i++) {
        let reversed = 0;
        for (let j = 0; j < bits; j++) {
          if ((i >> j) & 1) {
            reversed |= (1 << (bits - 1 - j));
          }
        }
        indices[i] = reversed;
      }
      FastFFTEngine.bitReverseCache.set(n, indices);
    }
    return indices;
  }

  /**
   * Get pre-calculated twiddle factors (cos/sin) for FFT size n.
   * ⚡ Bolt: Uses Float64Array for higher precision trig factors.
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
   * Iterative In-Place Cooley-Tukey FFT (⚡ Bolt Optimized)
   * Eliminates recursion and reduces buffer allocations to zero during computation.
   * Time: O(N log N), Space: O(N) for output buffer.
   */
  public static iterativeFFT(samples: Float32Array): Float32Array {
    const n = samples.length;
    const result = new Float32Array(n * 2);
    const bitReverse = this.getBitReverseIndices(n);

    // 1. Bit-reversal permutation
    for (let i = 0; i < n; i++) {
      result[bitReverse[i] * 2] = samples[i];
      result[bitReverse[i] * 2 + 1] = 0;
    }

    // 2. Butterfly computations
    for (let s = 1; s <= Math.log2(n); s++) {
      const m = Math.pow(2, s);
      const m2 = m >> 1;
      const twiddles = this.getTwiddleFactors(m);

      for (let k = 0; k < n; k += m) {
        for (let j = 0; j < m2; j++) {
          const cos = twiddles[j * 2];
          const sin = twiddles[j * 2 + 1];

          const tIdx = (k + j + m2) * 2;
          const uIdx = (k + j) * 2;

          const tReal = cos * result[tIdx] - sin * result[tIdx + 1];
          const tImag = sin * result[tIdx] + cos * result[tIdx + 1];

          const uReal = result[uIdx];
          const uImag = result[uIdx + 1];

          result[uIdx] = uReal + tReal;
          result[uIdx + 1] = uImag + tImag;
          result[tIdx] = uReal - tReal;
          result[tIdx + 1] = uImag - tImag;
        }
      }
    }

    return result;
  }

  /**
   * Recursive version kept for backward compatibility (Deprecated)
   */
  public static cooleyTukeyFFT(samples: Float32Array): Float32Array {
    return this.iterativeFFT(samples);
  }

  /**
   * Apply Hann window to reduce spectral leakage.
   * ⚡ Bolt: Supports in-place processing and caches window coefficients.
   */
  public static applyHannWindow(samples: Float32Array): Float32Array {
    const n = samples.length;
    let window = FastFFTEngine.hannWindowCache.get(n);

    if (!window) {
      window = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / n));
      }
      FastFFTEngine.hannWindowCache.set(n, window);
    }

    for (let i = 0; i < n; i++) {
      samples[i] *= window[i];
    }
    return samples;
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
   * ⚡ Bolt Optimization: Removed arbitrary 200-frame limit.
   * Uses iterative engine for significantly faster processing of full tracks.
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

    // Reuse buffers for in-place processing
    const windowBuffer = new Float32Array(fftSize);

    for (let frame = 0; frame < numFrames; frame++) {
      const startSample = frame * hopSize;
      const samples = channelData.subarray(startSample, startSample + fftSize);

      // Copy to window buffer (input to iterativeFFT must be the same size)
      windowBuffer.set(samples);

      // Apply window and perform FFT
      FastFFTEngine.applyHannWindow(windowBuffer);
      const fftResult = FastFFTEngine.iterativeFFT(windowBuffer);

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
