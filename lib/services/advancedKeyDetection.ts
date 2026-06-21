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

  // ⚡ Bolt: Static cache to eliminate Math.log2 and Math.round in hot loops.
  // Maps "fftSize-sampleRate" to an Int8Array of pitch classes (0-11) or -1.
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
    // ⚡ Bolt: Use 8192-point FFT for key detection
    const { linearMagnitudes } = await this.fftEngine.performFFT(audioBuffer, 8192);
    return this.detectKeyFromMagnitudes(linearMagnitudes, audioBuffer.sampleRate);
  }

  /**
   * ⚡ Bolt Optimization: Detect key from pre-calculated magnitudes.
   * This enables spectral reuse across different services in the Hub.
   */
  public detectKeyFromMagnitudes(
    linearMagnitudes: Float32Array,
    sampleRate: number
  ): {
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
    chromagram: number[];
  } {
    // Calculate chromagram (pitch class distribution)
    const chromagram = this.calculateChromagram(linearMagnitudes, sampleRate);

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
      chromagram,
    };
  }

  /**
   * Calculate chromagram (12-bin pitch class histogram)
   * ⚡ Bolt Optimization:
   * 1. Uses pre-calculated linear magnitudes.
   * 2. Uses static pitchClassCache to eliminate O(M) log2/round calls.
   */
  public calculateChromagram(linearMagnitudes: Float32Array, sampleRate: number): number[] {
    const fftSize = (linearMagnitudes.length - 1) * 2;
    const cacheKey = `${fftSize}-${sampleRate}`;

    // Initialize or retrieve cache
    let mapping = AdvancedKeyDetection.pitchClassCache.get(cacheKey);
    if (!mapping) {
      mapping = this.generatePitchClassMapping(fftSize, sampleRate);
      AdvancedKeyDetection.pitchClassCache.set(cacheKey, mapping);
    }

    const chromagram = new Array(12).fill(0);
    const len = linearMagnitudes.length;

    // ⚡ Bolt: Hot loop using pre-calculated mapping
    for (let i = 0; i < len; i++) {
      const pitchClass = mapping[i];
      if (pitchClass !== -1) {
        chromagram[pitchClass] += linearMagnitudes[i];
      }
    }

    return chromagram;
  }

  /**
   * ⚡ Bolt: Pre-calculate the mapping from FFT bin to pitch class.
   */
  private generatePitchClassMapping(fftSize: number, sampleRate: number): Int8Array {
    const binCount = fftSize / 2 + 1;
    const mapping = new Int8Array(binCount);
    const binFreqFactor = sampleRate / fftSize;

    for (let i = 0; i < binCount; i++) {
      const freq = i * binFreqFactor;

      // Filter frequency range for key detection (approx. E1 to D#8)
      if (freq < 80 || freq > 5000) {
        mapping[i] = -1;
        continue;
      }

      // MIDI note number: 69 + 12 * log2(freq / 440)
      const midiNote = 69 + 12 * Math.log2(freq / 440);
      let pitchClass = Math.round(midiNote) % 12;
      if (pitchClass < 0) pitchClass += 12;

      mapping[i] = pitchClass;
    }

    return mapping;
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
      // ⚡ Bolt: Fixed rotation logic. To match tonic, the profile root (index 0)
      // must be shifted to the tonic index.
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
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    hopSize: number = 2  // seconds
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];

    // Analyze audio in segments
    const segments = Math.floor(audioBuffer.duration / hopSize);

    for (let i = 0; i < segments; i++) {
      const startTime = i * hopSize;
      const endTime = Math.min((i + 1) * hopSize, audioBuffer.duration);

      // Extract segment
      const startSample = Math.floor(startTime * audioBuffer.sampleRate);
      const endSample = Math.floor(endTime * audioBuffer.sampleRate);
      const length = endSample - startSample;

      const segmentBuffer = this.extractSegment(audioBuffer, startSample, length);

      // Detect key/chord for this segment
      const keyData = await this.detectKey(segmentBuffer);

      chords.push({
        time: startTime,
        chord: keyData.key.replace(' Major', '').replace(' Minor', 'm'),
        confidence: keyData.confidence,
      });
    }

    return chords;
  }

  /**
   * Extract audio segment
   */
  private extractSegment(
    audioBuffer: AudioBuffer,
    startSample: number,
    length: number
  ): AudioBuffer {
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      length,
      audioBuffer.sampleRate
    );

    const newBuffer = offlineContext.createBuffer(
      audioBuffer.numberOfChannels,
      length,
      audioBuffer.sampleRate
    );

    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const sourceData = audioBuffer.getChannelData(ch);
      const targetData = newBuffer.getChannelData(ch);

      for (let i = 0; i < length && startSample + i < sourceData.length; i++) {
        targetData[i] = sourceData[startSample + i];
      }
    }

    return newBuffer;
  }
}

export default AdvancedKeyDetection;
