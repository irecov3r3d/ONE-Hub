// Audio Quality Analysis Service
// Analyzes generated audio for quality metrics

import type { QualityMetrics } from '@/lib/config/aiModels';
import { FastFFTEngine } from './fastFFTEngine';

export class AudioAnalyzer {
  /**
   * Analyze audio file and return quality metrics
   */
  static async analyzeAudio(audioUrl: string): Promise<QualityMetrics> {
    try {
      // Fetch audio file
      const audioBuffer = await this.loadAudioBuffer(audioUrl);

      // Calculate various metrics
      const spectralClarity = await this.calculateSpectralClarity(audioBuffer);
      const dynamicRange = this.calculateDynamicRange(audioBuffer);
      const stereoWidth = this.calculateStereoWidth(audioBuffer);
      const frequencyBalance = this.calculateFrequencyBalance(audioBuffer);
      const { rms, peak } = this.calculateLevels(audioBuffer);
      const coherence = this.calculateCoherence(audioBuffer);

      // Calculate overall score
      const overallScore = this.calculateOverallScore({
        spectralClarity,
        dynamicRange,
        stereoWidth,
        frequencyBalance,
        rmsLevel: rms,
        peakLevel: peak,
        coherence,
        promptAdherence: 0.8, // This requires AI analysis
      });

      return {
        spectralClarity,
        dynamicRange,
        stereoWidth,
        frequencyBalance,
        rmsLevel: rms,
        peakLevel: peak,
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
  private static async calculateSpectralClarity(audioBuffer: AudioBuffer): Promise<number> {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    // Perform FFT analysis on a segment from the middle of the track
    const fftSize = 2048;
    const frequencyBins = this.performFFT(channelData, fftSize, sampleRate);

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
   * Calculate dynamic range (difference between loudest and softest parts)
   */
  private static calculateDynamicRange(audioBuffer: AudioBuffer): number {
    const channelData = this.getMonoData(audioBuffer);

    // Split into windows and calculate RMS for each
    const windowSize = audioBuffer.sampleRate; // 1 second windows
    const rmsValues: number[] = [];

    for (let i = 0; i < channelData.length; i += windowSize) {
      // ⚡ Bolt: Use .subarray() to avoid expensive buffer copies
      const window = channelData.subarray(i, i + windowSize);
      const rms = this.calculateRMS(window);
      if (rms > 0) rmsValues.push(rms);
    }

    if (rmsValues.length === 0) return 0;

    // Sort RMS values
    rmsValues.sort((a, b) => a - b);

    // Dynamic range = difference between 95th and 5th percentile
    const p5 = rmsValues[Math.floor(rmsValues.length * 0.05)];
    const p95 = rmsValues[Math.floor(rmsValues.length * 0.95)];

    const dynamicRange = 20 * Math.log10(p95 / p5);

    return dynamicRange;
  }

  /**
   * Calculate stereo width (how wide the stereo image is)
   */
  private static calculateStereoWidth(audioBuffer: AudioBuffer): number {
    if (audioBuffer.numberOfChannels < 2) return 0;

    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);

    let correlation = 0;
    let leftPower = 0;
    let rightPower = 0;

    for (let i = 0; i < left.length; i++) {
      correlation += left[i] * right[i];
      leftPower += left[i] * left[i];
      rightPower += right[i] * right[i];
    }

    // Pearson correlation coefficient
    const denominator = Math.sqrt(leftPower * rightPower);
    if (denominator === 0) return 0;

    correlation = correlation / denominator;

    // Convert correlation to width
    // -1 = fully out of phase (max width)
    //  0 = uncorrelated (good width)
    //  1 = mono (no width)
    const width = (1 - correlation) / 2;

    return width;
  }

  /**
   * Calculate frequency balance (how balanced the spectrum is)
   */
  private static calculateFrequencyBalance(audioBuffer: AudioBuffer): number {
    const sampleRate = audioBuffer.sampleRate;
    const fftSize = 2048;
    const channelData = audioBuffer.getChannelData(0);

    const frequencyBins = this.performFFT(channelData, fftSize, sampleRate);

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
   * Calculate RMS and peak levels
   * ⚡ Bolt: Consolidated Peak and RMS detection into a single O(N) loop.
   */
  private static calculateLevels(audioBuffer: AudioBuffer): { rms: number; peak: number } {
    const channelData = audioBuffer.getChannelData(0);
    const length = channelData.length;

    let sumSquares = 0;
    let peak = 0;

    for (let i = 0; i < length; i++) {
      const sample = channelData[i];
      const abs = sample < 0 ? -sample : sample;

      // Peak detection
      if (abs > peak) peak = abs;

      // RMS accumulation
      sumSquares += sample * sample;
    }

    const rms = Math.sqrt(sumSquares / length);

    // Convert to dB
    const rmsDb = 20 * Math.log10(rms + 1e-10);
    const peakDb = 20 * Math.log10(peak + 1e-10);

    // LUFS estimation (simplified) per ITU-R BS.1770
    const lufs = -0.691 + rmsDb;

    return {
      rms: lufs,
      peak: peakDb,
    };
  }

  /**
   * Calculate coherence (how consistent the audio quality is)
   */
  private static calculateCoherence(audioBuffer: AudioBuffer): number {
    const channelData = this.getMonoData(audioBuffer);
    const windowSize = audioBuffer.sampleRate; // 1 second windows

    const rmsValues: number[] = [];

    for (let i = 0; i < channelData.length; i += windowSize) {
      // ⚡ Bolt: Use .subarray() to avoid expensive buffer copies
      const window = channelData.subarray(i, i + windowSize);
      const rms = this.calculateRMS(window);
      rmsValues.push(rms);
    }

    if (rmsValues.length < 2) return 1;

    // Calculate standard deviation
    const mean = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length;
    const variance = rmsValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / rmsValues.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation
    const cv = stdDev / mean;

    // Convert to 0-1 score (less variation = more coherent)
    const coherence = 1 - Math.min(1, cv);

    return coherence;
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
   * Helper: Get mono data from audio buffer
   */
  private static getMonoData(audioBuffer: AudioBuffer): Float32Array {
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    const mono = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      mono[i] = (left[i] + right[i]) / 2;
    }
    return mono;
  }

  /**
   * Helper: Calculate RMS of audio samples
   */
  private static calculateRMS(samples: Float32Array): number {
    let sum = 0;
    const len = samples.length;
    for (let i = 0; i < len; i++) {
      const sample = samples[i];
      sum += sample * sample;
    }
    return Math.sqrt(sum / len);
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

    // Apply Hann window
    const windowed = FastFFTEngine.applyHannWindow(paddedSamples);

    // Perform FFT
    const fftResult = FastFFTEngine.cooleyTukeyFFT(windowed);

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
