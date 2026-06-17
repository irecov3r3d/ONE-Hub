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
   * Detect musical key using chromagram and template matching.
   * ⚡ Bolt: Added support for raw AudioBuffer input.
   */
  async detectKey(audioBuffer: AudioBuffer): Promise<{
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  }> {
    const chromagram = await this.calculateChromagram(audioBuffer);
    return this.processChromagram(chromagram);
  }

  /**
   * ⚡ Bolt Optimization: Detect musical key using pre-calculated linear magnitudes.
   * Eliminates redundant FFT passes when integrated into larger analysis pipelines.
   */
  detectKeyFromMagnitudes(magnitudes: Float32Array, sampleRate: number): {
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  } {
    const chromagram = this.calculateChromagramFromMagnitudes(magnitudes, sampleRate);
    return this.processChromagram(chromagram);
  }

  /**
   * ⚡ Bolt: Extracted shared chromagram processing logic.
   */
  private processChromagram(chromagram: number[]): {
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
   */
  private async calculateChromagram(audioBuffer: AudioBuffer): Promise<number[]> {
    const { linearMagnitudes } = await this.fftEngine.performFFT(audioBuffer, 8192);
    return this.calculateChromagramFromMagnitudes(linearMagnitudes, audioBuffer.sampleRate);
  }

  /**
   * ⚡ Bolt Optimization: Calculate chromagram from pre-calculated magnitudes.
   * 1. Uses static pitchClassCache to eliminate redundant Math.log2/Math.round calls.
   * 2. Bypasses range checks and note conversion for every bin in the hot loop.
   */
  private calculateChromagramFromMagnitudes(magnitudes: Float32Array, sampleRate: number): number[] {
    const chromagram = new Array(12).fill(0);
    const fftSize = magnitudes.length * 2;
    const cacheKey = `${fftSize}_${sampleRate}`;

    let mapping = AdvancedKeyDetection.pitchClassCache.get(cacheKey);
    if (!mapping) {
      mapping = new Int8Array(magnitudes.length);
      const binFreqFactor = sampleRate / fftSize;
      for (let i = 0; i < magnitudes.length; i++) {
        const frequency = i * binFreqFactor;
        if (frequency < 80 || frequency > 5000) {
          mapping[i] = -1;
        } else {
          mapping[i] = this.frequencyToPitchClass(frequency);
        }
      }
      AdvancedKeyDetection.pitchClassCache.set(cacheKey, mapping);
    }

    for (let i = 0; i < magnitudes.length; i++) {
      const pc = mapping[i];
      if (pc !== -1) {
        chromagram[pc] += magnitudes[i];
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
   * Detect chord progressions.
   * ⚡ Bolt Optimization:
   * 1. Uses Float32Array.subarray() for zero-copy segmentation.
   * 2. Reuses a pre-allocated FFT buffer to minimize GC pressure.
   * 3. Averages chromagrams from multiple overlapping windows per segment for better accuracy.
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    hopSize: number = 2  // seconds
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0); // Use mono for detection

    const segmentLength = Math.floor(hopSize * sampleRate);
    const numSegments = Math.floor(channelData.length / segmentLength);

    const fftSize = 4096;
    const fftWindowHop = fftSize / 2;
    const fftBuffer = new Float32Array(fftSize * 2);
    const hannWindow = FastFFTEngine.getHannWindow(fftSize);

    for (let i = 0; i < numSegments; i++) {
      const startTime = i * hopSize;
      const startSample = i * segmentLength;
      const segmentSamples = channelData.subarray(startSample, startSample + segmentLength);

      // Average chromagram over multiple windows in this segment
      const segmentChromagram = new Array(12).fill(0);
      let windowCount = 0;

      for (let w = 0; w <= segmentSamples.length - fftSize; w += fftWindowHop) {
        const windowSamples = segmentSamples.subarray(w, w + fftSize);
        FastFFTEngine.cooleyTukeyFFT(windowSamples, fftBuffer, hannWindow);

        // Extract magnitudes and accumulate to segment chromagram
        const magnitudes = new Float32Array(fftSize / 2);
        for (let b = 0; b < fftSize / 2; b++) {
          const r = fftBuffer[b * 2];
          const im = fftBuffer[b * 2 + 1];
          magnitudes[b] = Math.sqrt(r * r + im * im) / fftSize;
        }

        const windowChromagram = this.calculateChromagramFromMagnitudes(magnitudes, sampleRate);
        for (let pc = 0; pc < 12; pc++) {
          segmentChromagram[pc] += windowChromagram[pc];
        }
        windowCount++;
      }

      if (windowCount > 0) {
        for (let pc = 0; pc < 12; pc++) segmentChromagram[pc] /= windowCount;
      }

      const keyData = this.processChromagram(segmentChromagram);

      chords.push({
        time: startTime,
        chord: keyData.key.replace(' Major', '').replace(' Minor', 'm'),
        confidence: keyData.confidence,
      });

      // Yield to UI
      if (i % 10 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }

    return chords;
  }
}

export default AdvancedKeyDetection;
