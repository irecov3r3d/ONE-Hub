// Advanced Key Detection using Chromagram and Krumhansl-Schmuckler Algorithm
// Much more accurate than simple autocorrelation

import FastFFTEngine from './fastFFTEngine';

// Krumhansl-Schmuckler key profiles
const KEY_PROFILES = {
  major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
  minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ⚡ Bolt Optimization: Pre-calculated rotated key profiles (12 major, 12 minor).
// Pre-calculating eliminates redundant array allocation and slicing inside correlateWithKeyProfiles.
function rotateArray(arr: number[], n: number): number[] {
  n = n % arr.length;
  return [...arr.slice(n), ...arr.slice(0, n)];
}

const ROTATED_MAJOR_PROFILES: number[][] = Array.from({ length: 12 }, (_, tonic) =>
  rotateArray(KEY_PROFILES.major, tonic)
);

const ROTATED_MINOR_PROFILES: number[][] = Array.from({ length: 12 }, (_, tonic) =>
  rotateArray(KEY_PROFILES.minor, tonic)
);

export class AdvancedKeyDetection {
  // ⚡ Bolt Optimization: Cache FFT bin pitch class maps to eliminate Math.log2 and bounds checks in hot chromagram loops.
  private static pitchClassCache = new Map<string, Int8Array>();

  private static getPitchClassMap(fftSize: number, sampleRate: number, numBins: number): Int8Array {
    const cacheKey = `${fftSize}_${sampleRate}_${numBins}`;
    let map = AdvancedKeyDetection.pitchClassCache.get(cacheKey);
    if (!map) {
      map = new Int8Array(numBins);
      const binFreqFactor = sampleRate / fftSize;
      for (let i = 0; i < numBins; i++) {
        const freq = i * binFreqFactor;
        if (freq < 80 || freq > 5000) {
          map[i] = -1;
        } else {
          const midiNote = 69 + 12 * Math.log2(freq / 440);
          map[i] = Math.round(midiNote) % 12;
        }
      }
      AdvancedKeyDetection.pitchClassCache.set(cacheKey, map);
    }
    return map;
  }
  private fftEngine: FastFFTEngine;

  constructor(audioContext: AudioContext) {
    this.fftEngine = new FastFFTEngine(audioContext);
  }

  /**
   * Detect musical key using chromagram and template matching.
   * Supports both AudioBuffer and raw Float32Array (with optional sampleRateOverride).
   */
  async detectKey(
    audioData: AudioBuffer | Float32Array,
    sampleRateOverride?: number
  ): Promise<{
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  }> {
    // Calculate chromagram (pitch class distribution)
    const chromagram = await this.calculateChromagram(audioData, sampleRateOverride);

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
   * ⚡ Bolt Optimization: Uses pre-calculated linear magnitudes, static pitch class bin map, and supports raw Float32Array.
   */
  private async calculateChromagram(
    audioData: AudioBuffer | Float32Array,
    sampleRateOverride?: number
  ): Promise<number[]> {
    const chromagram = new Array(12).fill(0);

    // Get frequency spectrum
    const fftSize = 8192;
    const { spectrum, linearMagnitudes } = await this.fftEngine.performFFT(audioData, fftSize, sampleRateOverride);
    const sampleRate = audioData instanceof Float32Array ? (sampleRateOverride || 44100) : audioData.sampleRate;

    // ⚡ Bolt Optimization: Look up pre-calculated pitch class mapping for all FFT bins
    const pitchClassMap = AdvancedKeyDetection.getPitchClassMap(fftSize, sampleRate, spectrum.length);

    // Map frequencies to pitch classes using cached bin indices
    for (let i = 0; i < spectrum.length; i++) {
      const pitchClass = pitchClassMap[i];
      if (pitchClass !== -1) {
        chromagram[pitchClass] += linearMagnitudes[i];
      }
    }

    return chromagram;
  }

  /**
   * Map frequency to pitch class (0-11)
   */
  private frequencyToPitchClass(frequency: number): number {
    if (frequency <= 0) return -1;

    // MIDI note number
    const midiNote = 69 + 12 * Math.log2(frequency / 440);

    // Pitch class (C=0, C#=1, ..., B=11)
    const pitchClass = Math.round(midiNote) % 12;

    return pitchClass;
  }

  /**
   * Normalize chromagram to sum to 1
   */
  private normalizeChromagram(chromagram: number[]): number[] {
    const sum = chromagram.reduce((a, b) => a + b, 0);
    if (sum === 0) return chromagram;
    return chromagram.map(val => val / sum);
  }

  /**
   * Correlate chromagram with all 24 key profiles
   * ⚡ Bolt Optimization: Reuses pre-calculated rotated profiles to eliminate array allocation & slicing.
   */
  private correlateWithKeyProfiles(chromagram: number[]): Array<{
    key: string;
    scale: string;
    correlation: number;
  }> {
    const results: Array<{ key: string; scale: string; correlation: number }> = [];

    // Try all 12 major keys
    for (let tonic = 0; tonic < 12; tonic++) {
      const correlation = this.pearsonCorrelation(chromagram, ROTATED_MAJOR_PROFILES[tonic]);

      results.push({
        key: `${NOTE_NAMES[tonic]} Major`,
        scale: 'Major',
        correlation,
      });
    }

    // Try all 12 minor keys
    for (let tonic = 0; tonic < 12; tonic++) {
      const correlation = this.pearsonCorrelation(chromagram, ROTATED_MINOR_PROFILES[tonic]);

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
      results.forEach(r => {
        r.correlation = (r.correlation - minCorr) / range;
      });
    }

    return results;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

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
    n = n % arr.length;
    return [...arr.slice(n), ...arr.slice(0, n)];
  }

  /**
   * Detect mode (Major, Minor, Dorian, etc.)
   */
  detectMode(chromagram: number[]): string {
    // Simplified mode detection
    // Can be extended with more modal profiles

    const modes = [
      { name: 'Ionian (Major)', profile: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88] },
      { name: 'Dorian', profile: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
      { name: 'Phrygian', profile: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
      { name: 'Lydian', profile: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88] },
      { name: 'Mixolydian', profile: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88] },
      { name: 'Aeolian (Minor)', profile: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
      { name: 'Locrian', profile: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
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
   * Detect chord progressions (experimental)
   * ⚡ Bolt Optimization: Uses Float32Array.subarray() for iterative segment analysis.
   * Completely eliminates OfflineAudioContext overhead and O(S * C * N) element-wise memory copies.
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    hopSize: number = 2  // seconds
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];

    // Analyze audio in segments
    const segments = Math.floor(audioBuffer.duration / hopSize);
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    for (let i = 0; i < segments; i++) {
      const startTime = i * hopSize;
      const endTime = Math.min((i + 1) * hopSize, audioBuffer.duration);

      // Extract segment using zero-copy subarray
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);
      const length = endSample - startSample;

      const samplesSegment = channelData.subarray(startSample, startSample + length);

      // Detect key/chord for this segment
      const keyData = await this.detectKey(samplesSegment, sampleRate);

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
