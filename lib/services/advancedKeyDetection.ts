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
  // ⚡ Bolt: Static cache for FFT bin to pitch class mapping
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
    return this.detectKeyFromChromagram(chromagram);
  }

  /**
   * ⚡ Bolt Optimization: Detect key directly from pre-calculated magnitudes.
   * This enables synergy with AudioAnalysisService by eliminating redundant FFTs.
   */
  detectKeyFromMagnitudes(magnitudes: Float32Array, sampleRate: number): {
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  } {
    const chromagram = this.calculateChromagramFromMagnitudes(magnitudes, sampleRate);
    return this.detectKeyFromChromagram(chromagram);
  }

  /**
   * Internal key detection logic shared by both entry points
   */
  private detectKeyFromChromagram(chromagram: number[]): {
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
    // Get frequency spectrum
    const { linearMagnitudes } = await this.fftEngine.performFFT(audioBuffer, 8192);
    return this.calculateChromagramFromMagnitudes(linearMagnitudes, audioBuffer.sampleRate);
  }

  /**
   * ⚡ Bolt Optimization: Calculate chromagram using a pre-calculated pitch class cache.
   * Eliminates O(M) calls to Math.log2 and Math.round in the hot loop.
   */
  private calculateChromagramFromMagnitudes(magnitudes: Float32Array, sampleRate: number): number[] {
    const chromagram = new Array(12).fill(0);
    const fftSize = magnitudes.length * 2;
    const cacheKey = `${fftSize}_${sampleRate}`;

    let pcMap = AdvancedKeyDetection.pitchClassCache.get(cacheKey);
    if (!pcMap) {
      pcMap = new Int8Array(magnitudes.length);
      const binFreqFactor = sampleRate / fftSize;
      for (let i = 0; i < magnitudes.length; i++) {
        const freq = i * binFreqFactor;
        if (freq < 80 || freq > 5000) {
          pcMap[i] = -1;
        } else {
          pcMap[i] = this.frequencyToPitchClass(freq);
        }
      }
      AdvancedKeyDetection.pitchClassCache.set(cacheKey, pcMap);
    }

    for (let i = 0; i < magnitudes.length; i++) {
      const pc = pcMap[i];
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
      const rotatedProfile = this.rotateProfile(KEY_PROFILES.major, tonic);
      const correlation = this.pearsonCorrelation(chromagram, rotatedProfile);

      results.push({
        key: `${NOTE_NAMES[tonic]} Major`,
        scale: 'Major',
        correlation,
      });
    }

    // Try all 12 minor keys
    for (let tonic = 0; tonic < 12; tonic++) {
      const rotatedProfile = this.rotateProfile(KEY_PROFILES.minor, tonic);
      const correlation = this.pearsonCorrelation(chromagram, rotatedProfile);

      results.push({
        key: `${NOTE_NAMES[tonic]} Minor`,
        scale: 'Minor',
        correlation,
      });
    }

    // Sort by correlation (highest first)
    results.sort((a, b) => b.correlation - a.correlation);

    // Normalize correlations to 0-1 range based on top results
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
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const xi = x[i];
      const yi = y[i];
      sumX += xi;
      sumY += yi;
      sumXY += xi * yi;
      sumX2 += xi * xi;
      sumY2 += yi * yi;
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * ⚡ Bolt: Efficiently rotate profile without creating many intermediate arrays
   */
  private rotateProfile(profile: number[], tonic: number): number[] {
    const rotated = new Array(12);
    for (let i = 0; i < 12; i++) {
      rotated[i] = profile[(i + (12 - tonic)) % 12];
    }
    return rotated;
  }

  /**
   * Detect mode (Major, Minor, Dorian, etc.)
   */
  detectMode(chromagram: number[]): string {
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
   * ⚡ Bolt Optimization: Uses zero-copy Float32Array.subarray() and reuses FFT logic
   * instead of allocating new OfflineAudioContexts and AudioBuffers for each segment.
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    hopSizeInSeconds: number = 2
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const hopSizeSamples = Math.floor(hopSizeInSeconds * sampleRate);
    const fftSize = 4096; // Good balance for chord segments

    for (let start = 0; start < channelData.length - fftSize; start += hopSizeSamples) {
      const segment = channelData.subarray(start, start + fftSize);

      // We can't directly use performFFT because it expects AudioBuffer
      // But we can use the static cooleyTukeyFFT from FastFFTEngine
      const window = FastFFTEngine.getHannWindow(fftSize);
      const fftResult = FastFFTEngine.cooleyTukeyFFT(segment, undefined, window);

      const magnitudes = new Float32Array(fftSize / 2);
      for (let i = 0; i < fftSize / 2; i++) {
        const real = fftResult[i * 2];
        const imag = fftResult[i * 2 + 1];
        magnitudes[i] = Math.sqrt(real * real + imag * imag) / fftSize;
      }

      const keyData = this.detectKeyFromMagnitudes(magnitudes, sampleRate);

      chords.push({
        time: start / sampleRate,
        chord: keyData.key.replace(' Major', '').replace(' Minor', 'm'),
        confidence: keyData.confidence,
      });
    }

    return chords;
  }
}

export default AdvancedKeyDetection;
