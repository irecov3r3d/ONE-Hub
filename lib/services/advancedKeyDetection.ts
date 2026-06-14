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
   * This eliminates redundant FFT passes when integrated into AudioAnalysisService.
   */
  detectKeyFromMagnitudes(magnitudes: Float32Array, sampleRate: number): {
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  } {
    const chromagram = this.magnitudesToChromagram(magnitudes, sampleRate);
    return this.detectKeyFromChromagram(chromagram);
  }

  /**
   * Helper to detect key from a calculated chromagram
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
   * ⚡ Bolt Optimization: Use pre-calculated mapping to avoid Math.log2 in hot loop.
   */
  private getPitchClassMap(fftSize: number, sampleRate: number): Int8Array {
    const key = `${fftSize}-${sampleRate}`;
    let map = AdvancedKeyDetection.pitchClassCache.get(key);

    if (!map) {
      map = new Int8Array(fftSize / 2);
      const binFreqFactor = sampleRate / fftSize;

      for (let i = 0; i < map.length; i++) {
        const freq = i * binFreqFactor;
        if (freq < 80 || freq > 5000) {
          map[i] = -1;
        } else {
          const midiNote = 69 + 12 * Math.log2(freq / 440);
          map[i] = Math.round(midiNote) % 12;
        }
      }
      AdvancedKeyDetection.pitchClassCache.set(key, map);
    }
    return map;
  }

  /**
   * ⚡ Bolt Optimization: Map magnitudes to chromagram using pre-calculated pitch class mapping.
   */
  private magnitudesToChromagram(magnitudes: Float32Array, sampleRate: number): number[] {
    const chromagram = new Array(12).fill(0);
    const fftSize = magnitudes.length * 2;
    const pMap = this.getPitchClassMap(fftSize, sampleRate);

    for (let i = 0; i < magnitudes.length; i++) {
      const pc = pMap[i];
      if (pc !== -1) {
        chromagram[pc] += magnitudes[i];
      }
    }

    return chromagram;
  }

  /**
   * Calculate chromagram (12-bin pitch class histogram)
   */
  private async calculateChromagram(audioBuffer: AudioBuffer): Promise<number[]> {
    const fftSize = 8192;
    const { linearMagnitudes } = await this.fftEngine.performFFT(audioBuffer, fftSize);
    return this.magnitudesToChromagram(linearMagnitudes, audioBuffer.sampleRate);
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
   * Detect chord progressions
   * ⚡ Bolt Optimization: Uses Float32Array.subarray() and direct FFT calls.
   * Eliminates the expensive OfflineAudioContext and redundant buffer copies.
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    hopSizeInSeconds: number = 2
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const hopSamples = Math.floor(hopSizeInSeconds * sampleRate);
    const fftSize = 4096;

    // Windowing and reusable buffers
    const window = FastFFTEngine.getHannWindow(fftSize);
    const fftBuffer = new Float32Array(fftSize * 2);
    const magBuffer = new Float32Array(fftSize / 2);

    for (let startSample = 0; startSample < channelData.length - fftSize; startSample += hopSamples) {
      const time = startSample / sampleRate;

      // ⚡ Bolt: Average chromagrams from multiple windows across the segment for better accuracy
      const segmentChroma = new Array(12).fill(0);
      const subHop = Math.floor(hopSamples / 3);

      for (let j = 0; j < 3; j++) {
        const offset = startSample + j * subHop;
        if (offset + fftSize > channelData.length) break;

        const samples = channelData.subarray(offset, offset + fftSize);
        FastFFTEngine.cooleyTukeyFFT(samples, fftBuffer, window);

        for (let i = 0; i < fftSize / 2; i++) {
          const r = fftBuffer[i * 2];
          const im = fftBuffer[i * 2 + 1];
          magBuffer[i] = Math.sqrt(r * r + im * im) / fftSize;
        }

        const chroma = this.magnitudesToChromagram(magBuffer, sampleRate);
        for (let i = 0; i < 12; i++) segmentChroma[i] += chroma[i];
      }

      const keyData = this.detectKeyFromChromagram(segmentChroma);

      chords.push({
        time,
        chord: keyData.key.replace(' Major', '').replace(' Minor', 'm'),
        confidence: keyData.confidence,
      });

      // Yield to keep UI responsive for long tracks
      if (startSample % (hopSamples * 10) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return chords;
  }
}

export default AdvancedKeyDetection;
