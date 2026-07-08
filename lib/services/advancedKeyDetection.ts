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
  // ⚡ Bolt Optimization: Cache frequency-to-pitch-class mapping
  private static pitchClassCache: Map<string, Int8Array> = new Map();

  constructor(audioContext: AudioContext) {
    this.fftEngine = new FastFFTEngine(audioContext);
  }

  /**
   * Detect musical key using chromagram and template matching
   */
  async detectKey(audioBuffer: AudioBuffer): Promise<{
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  }> {
    // Calculate chromagram (pitch class distribution)
    const chromagram = await this.calculateChromagram(audioBuffer);
    return this.detectKeyFromChroma(chromagram);
  }

  /**
   * ⚡ Bolt Optimization: Detect key directly from pre-calculated magnitudes.
   * Allows O(1) key detection when spectral data is already available from AudioAnalysisService.
   */
  async detectKeyFromMagnitudes(
    magnitudes: Float32Array,
    sampleRate: number
  ): Promise<{
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  }> {
    const chromagram = await this.calculateChromagram(undefined, magnitudes, sampleRate);
    return this.detectKeyFromChroma(chromagram);
  }

  /**
   * Shared logic for detecting key from a chromagram
   */
  private detectKeyFromChroma(chromagram: number[]): {
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  } {
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
   * 1. Supports pre-calculated linear magnitudes for spectral synergy.
   * 2. Uses static pitch class cache to avoid redundant Math.log2 calls in hot loop.
   */
  private async calculateChromagram(
    audioBuffer?: AudioBuffer,
    preCalculatedMagnitudes?: Float32Array,
    sampleRateOverride?: number
  ): Promise<number[]> {
    const chromagram = new Array(12).fill(0);
    let magnitudes: Float32Array;
    let sampleRate: number;
    let fftSize: number;

    if (preCalculatedMagnitudes) {
      magnitudes = preCalculatedMagnitudes;
      sampleRate = sampleRateOverride || 44100;
      fftSize = magnitudes.length * 2;
    } else if (audioBuffer) {
      const result = await this.fftEngine.performFFT(audioBuffer, 8192);
      magnitudes = result.linearMagnitudes;
      sampleRate = audioBuffer.sampleRate;
      fftSize = 8192;
    } else {
      return chromagram;
    }

    // ⚡ Bolt Optimization: Use pre-calculated pitch class mapping for this sample rate and FFT size
    const cacheKey = `${sampleRate}-${fftSize}`;
    let mapping = AdvancedKeyDetection.pitchClassCache.get(cacheKey);

    if (!mapping) {
      mapping = new Int8Array(magnitudes.length);
      const binFreqFactor = sampleRate / fftSize;
      for (let i = 0; i < magnitudes.length; i++) {
        const freq = i * binFreqFactor;
        if (freq < 80 || freq > 5000) {
          mapping[i] = -1;
        } else {
          mapping[i] = this.frequencyToPitchClass(freq);
        }
      }
      AdvancedKeyDetection.pitchClassCache.set(cacheKey, mapping);
    }

    // Map magnitudes to pitch classes using the cache
    for (let i = 0; i < magnitudes.length; i++) {
      const pitchClass = mapping[i];
      if (pitchClass !== -1) {
        chromagram[pitchClass] += magnitudes[i];
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
   */
  private correlateWithKeyProfiles(chromagram: number[]): Array<{
    key: string;
    scale: string;
    correlation: number;
  }> {
    const results: Array<{ key: string; scale: string; correlation: number }> = [];

    // Try all 12 major keys
    for (let tonic = 0; tonic < 12; tonic++) {
      // ⚡ Bolt Fix: Correctly align key profile with chromagram.
      // The profile's root is at index 0. To match tonic, we rotate counter-clockwise.
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
   * ⚡ Bolt Optimization: Uses zero-copy Float32Array.subarray() and optimized FFT path.
   * Eliminates O(S * C * N) allocations and OfflineAudioContext overhead.
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    hopSize: number = 2  // seconds
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    // Analyze audio in segments
    const segments = Math.floor(audioBuffer.duration / hopSize);
    const samplesPerSegment = Math.floor(hopSize * sampleRate);

    for (let i = 0; i < segments; i++) {
      const startTime = i * hopSize;
      const startSample = i * samplesPerSegment;

      // ⚡ Bolt: Zero-copy subarray extraction
      const segmentSamples = channelData.subarray(
        startSample,
        Math.min(startSample + samplesPerSegment, channelData.length)
      );

      // ⚡ Bolt: Use optimized FFT path with Float32Array input
      const { linearMagnitudes } = await this.fftEngine.performFFT(segmentSamples, 4096, sampleRate);

      // Detect key/chord from pre-calculated magnitudes
      const keyData = await this.detectKeyFromMagnitudes(linearMagnitudes, sampleRate);

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
