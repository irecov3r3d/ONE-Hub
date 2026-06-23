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

  constructor(audioContext: AudioContext) {
    this.fftEngine = new FastFFTEngine(audioContext);
  }

  /**
   * Detect musical key using chromagram and template matching
   */
  async detectKey(input: AudioBuffer | Float32Array, sampleRateOverride?: number): Promise<{
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  }> {
    // Calculate chromagram (pitch class distribution)
    const chromagram = await this.calculateChromagram(input, sampleRateOverride);
    return this.detectKeyFromChroma(chromagram);
  }

  /**
   * ⚡ Bolt Optimization: Detect key from pre-calculated linear magnitudes.
   * Eliminates redundant FFT passes in integrated pipelines.
   * Returns the chromagram for reuse.
   */
  detectKeyFromMagnitudes(magnitudes: Float32Array, sampleRate: number): {
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
    chromagram: number[];
  } {
    const chromagram = this.calculateChromagramFromMagnitudes(magnitudes, sampleRate);
    const result = this.detectKeyFromChroma(chromagram);
    return { ...result, chromagram };
  }

  /**
   * Internal key detection from chromagram
   */
  private detectKeyFromChroma(chromagram: number[]): {
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  } {
    const normalizedChroma = this.normalizeChromagram(chromagram);
    const correlations = this.correlateWithKeyProfiles(normalizedChroma);
    const bestMatch = correlations[0];
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
   * ⚡ Bolt Optimization: Supports raw samples or pre-calculated magnitudes.
   */
  private async calculateChromagram(
    input: AudioBuffer | Float32Array,
    sampleRateOverride?: number
  ): Promise<number[]> {
    const { linearMagnitudes } = await this.fftEngine.performFFT(input, 8192, sampleRateOverride);
    const sampleRate = input instanceof AudioBuffer ? input.sampleRate : (sampleRateOverride || 44100);
    return this.calculateChromagramFromMagnitudes(linearMagnitudes, sampleRate);
  }

  /**
   * ⚡ Bolt Optimization: Core chromagram calculation from magnitudes.
   */
  public calculateChromagramFromMagnitudes(linearMagnitudes: Float32Array, sampleRate: number): number[] {
    const chromagram = new Array(12).fill(0);
    const fftSize = linearMagnitudes.length * 2;
    const binFreqFactor = sampleRate / fftSize;

    for (let i = 0; i < linearMagnitudes.length; i++) {
      const freq = i * binFreqFactor;
      if (freq < 80 || freq > 5000) continue;

      const magnitude = linearMagnitudes[i];
      const pitchClass = this.frequencyToPitchClass(freq);

      if (pitchClass !== -1) {
        chromagram[pitchClass] += magnitude;
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
   * ⚡ Bolt: Correctly aligns profiles using counter-clockwise rotation.
   */
  private correlateWithKeyProfiles(chromagram: number[]): Array<{
    key: string;
    scale: string;
    correlation: number;
  }> {
    const results: Array<{ key: string; scale: string; correlation: number }> = [];

    // Try all 12 major keys
    for (let tonic = 0; tonic < 12; tonic++) {
      // To align profile root (index 0) with tonic T in chromagram,
      // we rotate the profile by (12 - T) steps.
      const rotatedProfile = this.rotateArray(KEY_PROFILES.major, (12 - tonic) % 12);
      const correlation = this.pearsonCorrelation(chromagram, rotatedProfile);

      results.push({
        key: `${NOTE_NAMES[tonic]} Major`,
        scale: 'Major',
        correlation,
      });
    }

    // Try all 12 minor keys
    for (let tonic = 0; tonic < 12; tonic++) {
      const rotatedProfile = this.rotateArray(KEY_PROFILES.minor, (12 - tonic) % 12);
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
   * ⚡ Bolt Optimization: Uses zero-copy subarray views to eliminate
   * OfflineAudioContext allocations and buffer copies.
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    hopSize: number = 2  // seconds
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Analyze audio in segments
    const segments = Math.floor(audioBuffer.duration / hopSize);

    for (let i = 0; i < segments; i++) {
      const startTime = i * hopSize;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.min(startSample + Math.floor(hopSize * sampleRate), channelData.length);

      // ⚡ Bolt: Zero-copy view
      const segment = channelData.subarray(startSample, endSample);

      // Detect key/chord for this segment
      const keyData = await this.detectKey(segment, sampleRate);

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
