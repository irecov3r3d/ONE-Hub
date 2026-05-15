// Audio Quality Analysis Service
// Analyzes generated audio for quality metrics

import type { QualityMetrics } from '@/lib/config/aiModels';
import { FastFFTEngine } from './fastFFTEngine';

export class AudioAnalyzer {
  /**
   * Analyze audio file and return quality metrics
   * ⚡ Bolt Optimization:
   * 1. Consolidated mono conversion, peak, RMS, and stereo width into a single O(N) pass.
   * 2. Pre-calculated windowed RMS values for Dynamic Range and Coherence to avoid redundant traversals.
   * 3. Eliminated multiple Float32Array allocations for mono data.
   */
  static async analyzeAudio(audioUrl: string): Promise<QualityMetrics> {
    try {
      // Fetch audio file
      const audioBuffer = await this.loadAudioBuffer(audioUrl);

      // ⚡ Bolt: Single-pass stats collection
      const stats = this.analyzeBasicStats(audioBuffer);

      // Calculate various metrics using pre-calculated stats
      const spectralClarity = await this.calculateSpectralClarity(stats.mono, audioBuffer.sampleRate);
      const dynamicRange = this.calculateDynamicRangeFromRMS(stats.windowRMS);
      const frequencyBalance = this.calculateFrequencyBalance(stats.mono, audioBuffer.sampleRate);
      const coherence = this.calculateCoherenceFromRMS(stats.windowRMS);

      // Calculate overall score
      const overallScore = this.calculateOverallScore({
        spectralClarity,
        dynamicRange,
        stereoWidth: stats.stereoWidth,
        frequencyBalance,
        rmsLevel: stats.rms,
        peakLevel: stats.peak,
        coherence,
        promptAdherence: 0.8, // This requires AI analysis
      });

      return {
        spectralClarity,
        dynamicRange,
        stereoWidth: stats.stereoWidth,
        frequencyBalance,
        rmsLevel: stats.rms,
        peakLevel: stats.peak,
        coherence,
        promptAdherence: 0.8, // Placeholder - needs AI
        overallScore,
      };
    } catch (error) {
      console.error('Error analyzing audio:', error);

      // Return default metrics on error
      return {
        spectralClarity: 0.7,
        dynamicRange: 10,
        stereoWidth: 0.7,
        frequencyBalance: 0.7,
        rmsLevel: -14,
        peakLevel: -1,
        coherence: 0.7,
        promptAdherence: 0.7,
        overallScore: 0.7,
      };
    }
  }

  /**
   * Load audio file into AudioBuffer
   */
  private static async loadAudioBuffer(audioUrl: string): Promise<AudioBuffer> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return audioBuffer;
  }

  /**
   * Calculate spectral clarity (high frequency content quality)
   */
  private static async calculateSpectralClarity(mono: Float32Array, sampleRate: number): Promise<number> {
    // Perform FFT analysis on a segment from the middle of the track
    const fftSize = 2048;
    const frequencyBins = this.performFFT(mono, fftSize, sampleRate);

    // Analyze high frequency content (4kHz - 20kHz)
    const hfStart = Math.floor((4000 / sampleRate) * fftSize);
    const hfEnd = Math.floor((20000 / sampleRate) * fftSize);

    let hfEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < frequencyBins.length; i++) {
      const energy = frequencyBins[i] * frequencyBins[i];
      totalEnergy += energy;
      if (i >= hfStart && i < hfEnd) {
        hfEnergy += energy;
      }
    }

    // Spectral clarity: ratio of high frequency energy
    // Good mixes have 15-25% HF energy
    const hfRatio = totalEnergy > 0 ? hfEnergy / totalEnergy : 0;
    const clarity = Math.min(1, hfRatio / 0.25);

    return clarity;
  }

  /**
   * Calculate dynamic range from pre-calculated windowed RMS values
   */
  private static calculateDynamicRangeFromRMS(rmsValues: number[]): number {
    if (rmsValues.length === 0) return 0;

    // Work on a copy to avoid mutating the original array
    const sortedRMS = [...rmsValues].sort((a, b) => a - b);

    // Dynamic range = difference between 95th and 5th percentile
    const p5 = sortedRMS[Math.floor(sortedRMS.length * 0.05)];
    const p95 = sortedRMS[Math.floor(sortedRMS.length * 0.95)];

    if (p5 === 0) return 100; // Guard against division by zero

    return 20 * Math.log10(p95 / p5);
  }

  /**
   * Calculate frequency balance (how balanced the spectrum is)
   */
  private static calculateFrequencyBalance(mono: Float32Array, sampleRate: number): number {
    const fftSize = 2048;

    const frequencyBins = this.performFFT(mono, fftSize, sampleRate);

    // Divide spectrum into 3 bands: bass, mids, highs
    const bassEnd = Math.floor((250 / sampleRate) * fftSize);
    const midEnd = Math.floor((4000 / sampleRate) * fftSize);

    let bassEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;

    for (let i = 0; i < frequencyBins.length; i++) {
      const energy = frequencyBins[i] * frequencyBins[i];
      if (i < bassEnd) {
        bassEnergy += energy;
      } else if (i < midEnd) {
        midEnergy += energy;
      } else {
        highEnergy += energy;
      }
    }

    const totalEnergy = bassEnergy + midEnergy + highEnergy;
    if (totalEnergy === 0) return 0;

    // Ideal balance: ~30% bass, 50% mids, 20% highs
    const bassRatio = bassEnergy / totalEnergy;
    const midRatio = midEnergy / totalEnergy;
    const highRatio = highEnergy / totalEnergy;

    // Calculate deviation from ideal
    const bassDeviation = Math.abs(bassRatio - 0.3);
    const midDeviation = Math.abs(midRatio - 0.5);
    const highDeviation = Math.abs(highRatio - 0.2);

    const avgDeviation = (bassDeviation + midDeviation + highDeviation) / 3;

    // Convert to 0-1 score (less deviation = better)
    const balance = 1 - Math.min(1, avgDeviation * 3);

    return balance;
  }

  /**
   * Calculate coherence from pre-calculated windowed RMS values
   */
  private static calculateCoherenceFromRMS(rmsValues: number[]): number {
    if (rmsValues.length < 2) return 1;

    // Calculate standard deviation
    const mean = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length;
    if (mean === 0) return 0;

    const variance = rmsValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / rmsValues.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation
    const cv = stdDev / mean;

    // Convert to 0-1 score (less variation = more coherent)
    return 1 - Math.min(1, cv);
  }

  /**
   * Calculate overall quality score
   */
  private static calculateOverallScore(metrics: Omit<QualityMetrics, 'overallScore'>): number {
    // Weighted average of all metrics
    const weights = {
      spectralClarity: 0.15,
      dynamicRange: 0.15,
      stereoWidth: 0.10,
      frequencyBalance: 0.20,
      levels: 0.10, // Combined RMS + peak
      coherence: 0.10,
      promptAdherence: 0.20,
    };

    // Normalize dynamic range to 0-1 (assume 6-14 dB is good)
    const normalizedDR = Math.min(1, Math.max(0, (metrics.dynamicRange - 6) / 8));

    // Normalize levels (assume -14 to -8 dBFS RMS is good)
    const normalizedLevels = Math.min(1, Math.max(0, (metrics.rmsLevel + 14) / 6));

    const score =
      metrics.spectralClarity * weights.spectralClarity +
      normalizedDR * weights.dynamicRange +
      metrics.stereoWidth * weights.stereoWidth +
      metrics.frequencyBalance * weights.frequencyBalance +
      normalizedLevels * weights.levels +
      metrics.coherence * weights.coherence +
      metrics.promptAdherence * weights.promptAdherence;

    return score;
  }

  /**
   * ⚡ Bolt Optimization: Consolidated Statistics Collection
   * Performs mono conversion, peak detection, RMS accumulation, stereo correlation,
   * and windowed energy collection in a single O(N) pass.
   */
  private static analyzeBasicStats(audioBuffer: AudioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const mono = new Float32Array(length);

    const left = audioBuffer.getChannelData(0);
    const right = numChannels > 1 ? audioBuffer.getChannelData(1) : left;

    let totalSumSq = 0;
    let maxPeak = 0;
    let correlation = 0;
    let leftPower = 0;
    let rightPower = 0;

    const windowSize = sampleRate; // 1 second windows
    const windowRMS: number[] = [];
    let currentWindowSumSq = 0;
    let windowCount = 0;

    for (let i = 0; i < length; i++) {
      const sL = left[i];
      const sR = right[i];

      // Mono conversion
      const sMono = numChannels > 1 ? (sL + sR) / 2 : sL;
      mono[i] = sMono;

      // Peak & RMS (using mono for consistency)
      const absMono = Math.abs(sMono);
      if (absMono > maxPeak) maxPeak = absMono;
      const sqMono = sMono * sMono;
      totalSumSq += sqMono;

      // Stereo Width (Correlation)
      if (numChannels > 1) {
        correlation += sL * sR;
        leftPower += sL * sL;
        rightPower += sR * sR;
      }

      // Windowed RMS for Dynamic Range/Coherence
      currentWindowSumSq += sqMono;
      windowCount++;
      if (windowCount === windowSize || i === length - 1) {
        windowRMS.push(Math.sqrt(currentWindowSumSq / windowCount));
        currentWindowSumSq = 0;
        windowCount = 0;
      }
    }

    const rms = Math.sqrt(totalSumSq / length);
    const rmsDb = 20 * Math.log10(rms + 1e-10);
    const peakDb = 20 * Math.log10(maxPeak + 1e-10);
    const lufs = -0.691 + rmsDb;

    let stereoWidth = 0;
    if (numChannels > 1) {
      const denominator = Math.sqrt(leftPower * rightPower);
      if (denominator > 0) {
        const corr = correlation / denominator;
        stereoWidth = (1 - corr) / 2;
      }
    }

    return {
      mono,
      rms: lufs,
      peak: peakDb,
      stereoWidth,
      windowRMS
    };
  }

  /**
   * Helper: Perform FFT analysis
   * ⚡ Bolt Optimization: Use real Cooley-Tukey FFT instead of random placeholder
   */
  private static performFFT(samples: Float32Array, fftSize: number, sampleRate: number): Float32Array {
    // Use middle portion for analysis
    const startSample = Math.floor(samples.length / 2) - Math.floor(fftSize / 2);
    // ⚡ Bolt: Use .subarray() to avoid expensive buffer copies
    const segment = samples.subarray(Math.max(0, startSample), Math.min(samples.length, startSample + fftSize));

    // Pad with zeros if necessary to reach fftSize (must be power of 2)
    const paddedSamples = new Float32Array(fftSize);
    paddedSamples.set(segment);

    // Get window for fused application
    const window = FastFFTEngine.getHannWindow(fftSize);

    // Perform FFT using iterative Cooley-Tukey algorithm with fused windowing
    const fftResult = FastFFTEngine.cooleyTukeyFFT(paddedSamples, undefined, window);

    const magnitudes = new Float32Array(fftSize / 2);
    for (let i = 0; i < fftSize / 2; i++) {
      const real = fftResult[i * 2];
      const imag = fftResult[i * 2 + 1];
      magnitudes[i] = Math.sqrt(real * real + imag * imag) / fftSize;
    }

    return magnitudes;
  }
}

/*
 * PRODUCTION IMPROVEMENTS:
 *
 * 1. Use proper FFT library:
 *    - fft.js: https://github.com/indutny/fft.js
 *    - OR Web Audio API AnalyserNode for real-time analysis
 *
 * 2. Add AI-based prompt adherence:
 *    - Use Claude/GPT to compare audio description to prompt
 *    - Music tagging models (MusicNN, etc.)
 *
 * 3. Add more metrics:
 *    - Tempo stability
 *    - Key/scale adherence
 *    - Harmonic complexity
 *    - Rhythmic consistency
 *
 * 4. Implement server-side analysis:
 *    - Use librosa (Python) for detailed analysis
 *    - FFmpeg for quick metrics
 *    - Essentia for comprehensive music analysis
 *
 * 5. Add perceptual quality metrics:
 *    - PEAQ (Perceptual Evaluation of Audio Quality)
 *    - POLQA (Perceptual Objective Listening Quality Assessment)
 */
