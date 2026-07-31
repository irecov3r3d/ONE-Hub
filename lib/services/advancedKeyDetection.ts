// Advanced Key Detection using Chromagram and Krumhansl-Schmuckler Algorithm
// Much more accurate than simple autocorrelation

import FastFFTEngine from './fastFFTEngine';

// Krumhansl-Schmuckler key profiles
const KEY_PROFILES = {
  major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
  minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ⚡ Bolt Optimization: Pre-calculated major and minor key profiles rotated for each of the 12 tonics.
// Completely eliminates 24 redundant array allocations and slicing operations on every key correlation pass.
const ROTATED_MAJOR_PROFILES: number[][] = [];
const ROTATED_MINOR_PROFILES: number[][] = [];

function rotateArray(arr: number[], n: number): number[] {
  const len = arr.length;
  n = n % len;
  return [...arr.slice(n), ...arr.slice(0, n)];
}

// Pre-populate key profiles
for (let tonic = 0; tonic < 12; tonic++) {
  ROTATED_MAJOR_PROFILES.push(rotateArray(KEY_PROFILES.major, tonic));
  ROTATED_MINOR_PROFILES.push(rotateArray(KEY_PROFILES.minor, tonic));
}

export class AdvancedKeyDetection {
  private fftEngine: FastFFTEngine;
  // ⚡ Bolt Optimization: Static cache mapping (fftSize_sampleRate) -> Int8Array of pitch classes.
  // This bypasses expensive Math.log2 and boundary checks inside the hot FFT chromagram loop.
  private static pitchClassCache: Map<string, Int8Array> = new Map();

  constructor(audioContext: AudioContext) {
    this.fftEngine = new FastFFTEngine(audioContext);
  }

  /**
   * Get pre-calculated pitch class map (index -> pitchClass) for given fftSize and sampleRate.
   * Maps out-of-bounds frequencies (< 80 Hz or > 5000 Hz) to -1.
   * ⚡ Bolt Optimization: Caches mapping to bypass Math.log2 and bounds checking in hot loops.
   */
  private getPitchClassMap(fftSize: number, sampleRate: number): Int8Array {
    const key = `${fftSize}_${sampleRate}`;
    let map = AdvancedKeyDetection.pitchClassCache.get(key);
    if (!map) {
      const len = fftSize / 2;
      map = new Int8Array(len);
      const binFreqFactor = sampleRate / fftSize;
      for (let i = 0; i < len; i++) {
        const freq = i * binFreqFactor;
        if (freq < 80 || freq > 5000) {
          map[i] = -1;
        } else {
          map[i] = this.frequencyToPitchClass(freq);
        }
      }
      AdvancedKeyDetection.pitchClassCache.set(key, map);
    }
    return map;
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
   * ⚡ Bolt Optimization: Uses pre-calculated linear magnitudes and supports raw Float32Array.
   * ⚡ Bolt Optimization v2: Bypasses Math.log2 and bounds checking with static pitchClassCache.
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

    const pitchClassMap = this.getPitchClassMap(fftSize, sampleRate);

    // Map frequencies to pitch classes
    const limit = Math.min(spectrum.length, pitchClassMap.length);
    for (let i = 0; i < limit; i++) {
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
   * ⚡ Bolt Optimization: Uses pre-calculated/rotated profiles to eliminate array allocations in loop.
   */
  private correlateWithKeyProfiles(chromagram: number[]): Array<{
    key: string;
    scale: string;
    correlation: number;
  }> {
    const results: Array<{ key: string; scale: string; correlation: number }> = [];

    // Try all 12 major keys
    for (let tonic = 0; tonic < 12; tonic++) {
      const rotatedProfile = ROTATED_MAJOR_PROFILES[tonic];
      const correlation = this.pearsonCorrelation(chromagram, rotatedProfile);

      results.push({
        key: `${NOTE_NAMES[tonic]} Major`,
        scale: 'Major',
        correlation,
      });
    }

    // Try all 12 minor keys
    for (let tonic = 0; tonic < 12; tonic++) {
      const rotatedProfile = ROTATED_MINOR_PROFILES[tonic];
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
