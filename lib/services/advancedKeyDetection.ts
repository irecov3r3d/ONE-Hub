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
  // ⚡ Bolt: Cache for FFT bin to pitch class mapping
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
   * ⚡ Bolt: Detect key directly from pre-calculated magnitudes
   * This allows zero-copy spectral reuse from other services.
   */
  detectKeyFromMagnitudes(
    magnitudes: Float32Array,
    sampleRate: number
  ): {
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  } {
    const chromagram = this.calculateChromagramFromMagnitudes(magnitudes, sampleRate);
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
   */
  private async calculateChromagram(audioBuffer: AudioBuffer): Promise<number[]> {
    const fftSize = 8192;
    // Get frequency spectrum
    const { linearMagnitudes } = await this.fftEngine.performFFT(audioBuffer, fftSize);
    return this.calculateChromagramFromMagnitudes(linearMagnitudes, audioBuffer.sampleRate);
  }

  /**
   * ⚡ Bolt Optimization: Uses pre-calculated bin-to-pitch mapping.
   * This eliminates thousands of Math.log2 and Math.round calls per segment.
   */
  private calculateChromagramFromMagnitudes(
    magnitudes: Float32Array,
    sampleRate: number
  ): number[] {
    const chromagram = new Array(12).fill(0);
    const fftSize = magnitudes.length * 2;
    const mapping = this.getPitchClassMapping(fftSize, sampleRate);

    for (let i = 0; i < magnitudes.length; i++) {
      const pc = mapping[i];
      if (pc !== -1) {
        chromagram[pc] += magnitudes[i];
      }
    }

    return chromagram;
  }

  /**
   * ⚡ Bolt Optimization: Returns a cached mapping of FFT bins to pitch classes.
   */
  private getPitchClassMapping(fftSize: number, sampleRate: number): Int8Array {
    const key = `${fftSize}-${sampleRate}`;
    let mapping = AdvancedKeyDetection.pitchClassCache.get(key);

    if (!mapping) {
      mapping = new Int8Array(fftSize / 2);
      const binFreqFactor = sampleRate / fftSize;

      for (let i = 0; i < mapping.length; i++) {
        const freq = i * binFreqFactor;
        // Focus on musical range: 80Hz to 5000Hz
        if (freq < 80 || freq > 5000) {
          mapping[i] = -1;
        } else {
          mapping[i] = this.frequencyToPitchClass(freq);
        }
      }
      AdvancedKeyDetection.pitchClassCache.set(key, mapping);
    }
    return mapping;
  }

  /**
   * Map frequency to pitch class (0-11)
   */
  private frequencyToPitchClass(frequency: number): number {
    if (frequency <= 0) return -1;

    // MIDI note number
    const midiNote = 69 + 12 * Math.log2(frequency / 440);

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
    const modes = [
      { name: 'Ionian (Major)', profile: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88] },
      { name: 'Aeolian (Minor)', profile: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
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
   * ⚡ Bolt Optimization: Uses subarray() for zero-copy segment processing.
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    hopSize: number = 2  // seconds
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];
    const sampleRate = audioBuffer.sampleRate;
    const channel0 = audioBuffer.getChannelData(0);

    // Analyze audio in segments
    const segments = Math.floor(audioBuffer.duration / hopSize);
    const fftSize = 8192;

    for (let i = 0; i < segments; i++) {
      const startTime = i * hopSize;
      const startSample = Math.floor(startTime * sampleRate);

      // ⚡ Bolt: Zero-copy subarray access
      const segment = channel0.subarray(startSample, startSample + fftSize);

      // If segment is too short, pad it
      let processedSegment = segment;
      if (segment.length < fftSize) {
        processedSegment = new Float32Array(fftSize);
        processedSegment.set(segment);
      }

      // Perform FFT on segment
      const fftResult = FastFFTEngine.cooleyTukeyFFT(processedSegment);
      const magnitudes = new Float32Array(fftSize / 2);

      for (let j = 0; j < fftSize / 2; j++) {
        const real = fftResult[j * 2];
        const imag = fftResult[j * 2 + 1];
        magnitudes[j] = Math.sqrt(real * real + imag * imag) / fftSize;
      }

      // Detect key/chord for this segment using optimized magnitude path
      const keyData = this.detectKeyFromMagnitudes(magnitudes, sampleRate);

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
