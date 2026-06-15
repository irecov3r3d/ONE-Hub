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
   * ⚡ Bolt: Supports raw AudioBuffer or pre-calculated magnitudes for spectral synergy.
   */
  async detectKey(audioBufferOrMagnitudes: AudioBuffer | Float32Array, sampleRate?: number): Promise<{
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  }> {
    // Calculate chromagram (pitch class distribution)
    const chromagram = audioBufferOrMagnitudes instanceof Float32Array
      ? this.calculateChromagramFromMagnitudes(audioBufferOrMagnitudes, sampleRate || 44100)
      : await this.calculateChromagram(audioBufferOrMagnitudes);

    return this.detectKeyFromChromagram(chromagram);
  }

  /**
   * Detect key directly from pre-calculated spectral magnitudes.
   * ⚡ Bolt Optimization: Reuse shared 8192-point FFT results from AudioAnalysisService.
   */
  detectKeyFromMagnitudes(magnitudes: Float32Array, sampleRate: number = 44100): {
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  } {
    const chromagram = this.calculateChromagramFromMagnitudes(magnitudes, sampleRate);
    return this.detectKeyFromChromagram(chromagram);
  }

  /**
   * Internal key detection logic from a chromagram.
   */
  private detectKeyFromChromagram(chromagram: number[]): {
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
   * ⚡ Bolt Optimization: Uses pre-calculated linear magnitudes.
   */
  private async calculateChromagram(audioBuffer: AudioBuffer): Promise<number[]> {
    const { linearMagnitudes } = await this.fftEngine.performFFT(audioBuffer, 8192);
    return this.calculateChromagramFromMagnitudes(linearMagnitudes, audioBuffer.sampleRate);
  }

  /**
   * Calculate chromagram from linear magnitudes.
   * ⚡ Bolt Optimization: Uses static pitch class mapping cache to eliminate O(M) log2/round calls.
   */
  private calculateChromagramFromMagnitudes(magnitudes: Float32Array, sampleRate: number): number[] {
    const chromagram = new Array(12).fill(0);
    const fftSize = magnitudes.length * 2;
    const mapping = this.getPitchClassMapping(fftSize, sampleRate);

    // Map magnitudes to pitch classes using pre-calculated mapping
    for (let i = 0; i < magnitudes.length; i++) {
      const pitchClass = mapping[i];
      if (pitchClass !== -1) {
        chromagram[pitchClass] += magnitudes[i];
      }
    }

    return chromagram;
  }

  /**
   * Pre-calculate FFT bin to Pitch Class mapping.
   * ⚡ Bolt: Eliminates Math.log2 and Math.round from the hot chromagram loop.
   */
  private getPitchClassMapping(fftSize: number, sampleRate: number): Int8Array {
    const key = `${fftSize}-${sampleRate}`;
    let mapping = AdvancedKeyDetection.pitchClassCache.get(key);

    if (!mapping) {
      const binCount = fftSize / 2;
      mapping = new Int8Array(binCount);
      const binFreqFactor = sampleRate / fftSize;

      for (let i = 0; i < binCount; i++) {
        const frequency = i * binFreqFactor;
        // Bins outside 80Hz-5000Hz are ignored
        if (frequency < 80 || frequency > 5000) {
          mapping[i] = -1;
        } else {
          mapping[i] = this.frequencyToPitchClass(frequency);
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

    // MIDI note number: 69 + 12 * log2(f / 440)
    const midiNote = 69 + 17.31234049066756 * Math.log(frequency * 0.0022727272727272726);

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
   * 1. Uses zero-copy `subarray` on raw samples to eliminate OfflineAudioContext and buffer copies.
   * 2. Averages chromagrams from multiple overlapping windows (4096 samples, 50% overlap) per segment for improved accuracy.
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    segmentDuration: number = 2 // seconds
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;

    const fftSize = 4096;
    const hopSize = fftSize / 2;
    const samplesPerSegment = Math.floor(segmentDuration * sampleRate);
    const segments = Math.floor(duration / segmentDuration);

    // Reuse FFT output buffer and window to minimize GC
    const fftBuffer = new Float32Array(fftSize * 2);
    const window = FastFFTEngine.getHannWindow(fftSize);
    const mapping = this.getPitchClassMapping(fftSize, sampleRate);

    for (let i = 0; i < segments; i++) {
      const startSample = i * samplesPerSegment;
      const segmentSamples = channelData.subarray(startSample, Math.min(startSample + samplesPerSegment, channelData.length));

      // Average chromagrams from overlapping windows in this segment
      const segmentChroma = new Float32Array(12);
      let windowCount = 0;

      for (let j = 0; j <= segmentSamples.length - fftSize; j += hopSize) {
        const windowSamples = segmentSamples.subarray(j, j + fftSize);

        // Fused windowing and bit-reversal FFT
        FastFFTEngine.cooleyTukeyFFT(windowSamples, fftBuffer, window);

        // Accumulate linear magnitudes into chromagram
        for (let bin = 0; bin < fftSize / 2; bin++) {
          const pc = mapping[bin];
          if (pc !== -1) {
            const real = fftBuffer[bin * 2];
            const imag = fftBuffer[bin * 2 + 1];
            segmentChroma[pc] += Math.sqrt(real * real + imag * imag) / fftSize;
          }
        }
        windowCount++;
      }

      if (windowCount > 0) {
        // Average and detect best key/chord
        for (let c = 0; c < 12; c++) segmentChroma[c] /= windowCount;
        const result = this.detectKeyFromChromagram(Array.from(segmentChroma));

        chords.push({
          time: (startSample / sampleRate),
          chord: result.key.replace(' Major', '').replace(' Minor', 'm'),
          confidence: result.confidence,
        });
      }
    }

    return chords;
  }
}

export default AdvancedKeyDetection;
