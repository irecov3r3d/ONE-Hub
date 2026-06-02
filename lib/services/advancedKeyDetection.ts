// Advanced Key Detection using Chromagram and Krumhansl-Schmuckler Algorithm
// Much more accurate than simple autocorrelation

import FastFFTEngine from './fastFFTEngine';

// Krumhansl-Schmuckler key profiles
const KEY_PROFILES = {
  major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
  minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export class AdvancedKeyDetection {
  private fftEngine: FastFFTEngine;
  private static pitchClassCache: Map<string, Int8Array> = new Map();

  constructor(audioContext: AudioContext) {
    this.fftEngine = new FastFFTEngine(audioContext);
  }

  /**
   * Detect musical key using chromagram and template matching
   * ⚡ Bolt Optimization: Accept pre-calculated linear magnitudes to bypass redundant FFT.
   */
  async detectKey(
    audioBufferOrMagnitudes: AudioBuffer | Float32Array,
    sampleRate?: number
  ): Promise<{
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  }> {
    // Calculate chromagram (pitch class distribution)
    const chromagram = await this.calculateChromagram(audioBufferOrMagnitudes, sampleRate);

    // Normalize chromagram
    const normalizedChroma = this.normalizeChromagram(chromagram);

    // Correlate with key profiles
    const correlations = this.correlateWithKeyProfiles(normalizedChroma);

    // Find best match
    const bestMatch = correlations[0];

    // Generate alternatives
    const alternatives = correlations.slice(1, 4).map(match => ({
      key: match.key,
      confidence: match.correlation,
    }));

    return {
      key: bestMatch.key,
      scale: bestMatch.scale,
      confidence: bestMatch.correlation,
      alternatives,
    };
  }

  /**
   * Calculate chromagram (12-bin pitch class histogram)
   * ⚡ Bolt Optimization:
   * 1. Uses pre-calculated linear magnitudes if provided.
   * 2. Pre-calculates FFT bin to pitch class mapping to eliminate Math.log2 in hot loop.
   */
  private async calculateChromagram(
    audioBufferOrMagnitudes: AudioBuffer | Float32Array,
    sampleRate?: number
  ): Promise<number[]> {
    const chromagram = new Array(12).fill(0);
    let linearMagnitudes: Float32Array;
    let actualSampleRate: number;
    const fftSize = 8192;

    if (audioBufferOrMagnitudes instanceof Float32Array) {
      linearMagnitudes = audioBufferOrMagnitudes;
      actualSampleRate = sampleRate || 44100;
    } else {
      const result = await this.fftEngine.performFFT(audioBufferOrMagnitudes, fftSize);
      linearMagnitudes = result.linearMagnitudes;
      actualSampleRate = audioBufferOrMagnitudes.sampleRate;
    }

    // Get or create pitch class mapping cache
    const cacheKey = `${fftSize}_${actualSampleRate}`;
    let pitchClasses = AdvancedKeyDetection.pitchClassCache.get(cacheKey);

    if (!pitchClasses) {
      pitchClasses = new Int8Array(linearMagnitudes.length);
      const binFreqFactor = actualSampleRate / fftSize;
      for (let i = 0; i < pitchClasses.length; i++) {
        const freq = i * binFreqFactor;
        if (freq < 80 || freq > 5000) {
          pitchClasses[i] = -1;
        } else {
          pitchClasses[i] = this.frequencyToPitchClass(freq);
        }
      }
      AdvancedKeyDetection.pitchClassCache.set(cacheKey, pitchClasses);
    }

    // Accumulate magnitudes into pitch classes (O(M))
    for (let i = 0; i < linearMagnitudes.length; i++) {
      const pc = pitchClasses[i];
      if (pc !== -1) {
        chromagram[pc] += linearMagnitudes[i];
      }
    }

    return chromagram;
  }

  /**
   * Map frequency to pitch class (0-11)
   */
  private frequencyToPitchClass(frequency: number): number {
    if (frequency <= 0) return -1;

    // MIDI note number: 69 + 12 * log2(freq / 440)
    const midiNote = 69 + 17.312340490667562 * Math.log(frequency / 440);

    // Pitch class (C=0, C#=1, ..., B=11)
    let pitchClass = Math.round(midiNote) % 12;
    if (pitchClass < 0) pitchClass += 12;

    return pitchClass;
  }

  /**
   * Normalize chromagram to sum to 1
   */
  private normalizeChromagram(chromagram: number[]): number[] {
    const sum = chromagram.reduce((a, b) => a + b, 0);
    if (sum === 0) return chromagram;
    const invSum = 1 / sum;
    return chromagram.map(val => val * invSum);
  }

  /**
   * Correlate chromagram with all 24 key profiles
   */
  private correlateWithKeyProfiles(chromagram: number[]): Array<{
    key: string;
    scale: string;
    correlation: number;
  }> {
    const results: Array<{ key: string; scale: string; correlation: number }> = [];

    // Try all 12 major keys
    for (let tonic = 0; tonic < 12; tonic++) {
      const rotatedProfile = this.rotateArray(KEY_PROFILES.major, tonic);
      const correlation = this.pearsonCorrelation(chromagram, rotatedProfile);

      results.push({
        key: `${NOTE_NAMES[tonic]} Major`,
        scale: 'Major',
        correlation,
      });
    }

    // Try all 12 minor keys
    for (let tonic = 0; tonic < 12; tonic++) {
      const rotatedProfile = this.rotateArray(KEY_PROFILES.minor, tonic);
      const correlation = this.pearsonCorrelation(chromagram, rotatedProfile);

      results.push({
        key: `${NOTE_NAMES[tonic]} Minor`,
        scale: 'Minor',
        correlation,
      });
    }

    // Sort by correlation (highest first)
    results.sort((a, b) => b.correlation - a.correlation);

    // Normalize correlations to 0-1 range
    const maxCorr = results[0].correlation;
    const minCorr = results[results.length - 1].correlation;
    const range = maxCorr - minCorr;

    if (range > 0) {
      const invRange = 1 / range;
      results.forEach(r => {
        r.correlation = (r.correlation - minCorr) * invRange;
      });
    }

    return results;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
    }
    const meanX = sumX / n;
    const meanY = sumY / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Rotate array (for transposition)
   */
  private rotateArray(arr: number[], n: number): number[] {
    const len = arr.length;
    n = n % len;
    const result = new Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = arr[(i + n) % len];
    }
    return result;
  }

  /**
   * Detect mode (Major, Minor, Dorian, etc.)
   */
  detectMode(chromagram: number[]): string {
    const modes = [
      { name: 'Ionian (Major)', profile: KEY_PROFILES.major },
      { name: 'Aeolian (Minor)', profile: KEY_PROFILES.minor },
    ];

    let bestMode = 'Major';
    let bestCorr = -1;

    for (const mode of modes) {
      const corr = this.pearsonCorrelation(chromagram, mode.profile);
      if (corr > bestCorr) {
        bestCorr = corr;
        bestMode = mode.name;
      }
    }

    return bestMode;
  }

  /**
   * Detect chord progressions
   * ⚡ Bolt Optimization: Uses zero-copy .subarray() for segment processing,
   * bypassing the inefficient OfflineAudioContext-based buffer extraction.
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    hopSize: number = 2  // seconds
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const fftSize = 8192;

    // Analyze audio in segments
    const segments = Math.floor(audioBuffer.duration / hopSize);

    for (let i = 0; i < segments; i++) {
      const startTime = i * hopSize;
      const startSample = Math.floor(startTime * sampleRate);

      // Extract segment using zero-copy subarray
      const segmentSamples = channelData.subarray(
        startSample,
        Math.min(startSample + fftSize, channelData.length)
      );

      // Perform FFT on segment
      const paddedSamples = new Float32Array(fftSize);
      paddedSamples.set(segmentSamples);
      const window = FastFFTEngine.getHannWindow(fftSize);
      const fftResult = FastFFTEngine.cooleyTukeyFFT(paddedSamples, undefined, window);

      const linearMagnitudes = new Float32Array(fftSize / 2);
      for (let j = 0; j < fftSize / 2; j++) {
        const real = fftResult[j * 2];
        const imag = fftResult[j * 2 + 1];
        linearMagnitudes[j] = Math.sqrt(real * real + imag * imag) / fftSize;
      }

      // Detect key/chord for this segment using magnitudes directly
      const keyData = await this.detectKey(linearMagnitudes, sampleRate);

      chords.push({
        time: startTime,
        chord: keyData.key.replace(' Major', '').replace(' Minor', 'm'),
        confidence: keyData.confidence,
      });
    }

    return chords;
  }
}

export default AdvancedKeyDetection;
