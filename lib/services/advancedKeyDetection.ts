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
  private binToPitchClass: Int8Array | null = null;
  private lastFftSize: number = 0;
  private lastSampleRate: number = 0;

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
   * ⚡ Bolt Optimization: Detect key using pre-calculated linear magnitudes.
   * Enables zero-copy reuse of spectral data from the primary analysis pass.
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
    return this.detectKeyFromChromagram(chromagram);
  }

  /**
   * Core key detection logic from a chromagram
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
   * ⚡ Bolt Optimization: Uses pre-calculated linear magnitudes.
   */
  private async calculateChromagram(audioBuffer: AudioBuffer): Promise<number[]> {
    // Get frequency spectrum
    const fftSize = 8192;
    const { linearMagnitudes } = await this.fftEngine.performFFT(audioBuffer, fftSize);
    return this.calculateChromagramFromMagnitudes(linearMagnitudes, audioBuffer.sampleRate);
  }

  /**
   * ⚡ Bolt Optimization: Pre-calculates the FFT bin-to-pitch-class mapping.
   * Eliminates approximately 4,000 redundant Math.log2 and Math.round calls in the hot loop.
   */
  private calculateChromagramFromMagnitudes(
    magnitudes: Float32Array,
    sampleRate: number
  ): number[] {
    const fftSize = magnitudes.length * 2;
    const chromagram = new Array(12).fill(0);

    // ⚡ Bolt: Cache mapping if fftSize or sampleRate changed
    if (!this.binToPitchClass || this.lastFftSize !== fftSize || this.lastSampleRate !== sampleRate) {
      this.binToPitchClass = new Int8Array(magnitudes.length);
      const binFreqFactor = sampleRate / fftSize;

      for (let i = 0; i < magnitudes.length; i++) {
        const freq = i * binFreqFactor;
        if (freq < 80 || freq > 5000) {
          this.binToPitchClass[i] = -1;
        } else {
          this.binToPitchClass[i] = this.frequencyToPitchClass(freq);
        }
      }
      this.lastFftSize = fftSize;
      this.lastSampleRate = sampleRate;
    }

    // Accumulate chromagram using cached mapping
    for (let i = 0; i < magnitudes.length; i++) {
      const pc = this.binToPitchClass[i];
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

    // MIDI note number: 69 + 12 * log2(f / 440)
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
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += chromagram[i];
    if (sum === 0) return chromagram;

    const normalized = new Array(12);
    const invSum = 1 / sum;
    for (let i = 0; i < 12; i++) normalized[i] = chromagram[i] * invSum;
    return normalized;
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
      const invRange = 1 / range;
      results.forEach(r => {
        r.correlation = (r.correlation - minCorr) * invRange;
      });
    }

    return results;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
    }
    const meanX = sumX / n;
    const meanY = sumY / n;

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
    const len = arr.length;
    n = n % len;
    const rotated = new Array(len);
    for (let i = 0; i < len; i++) {
      rotated[i] = arr[(i + n) % len];
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
   * ⚡ Bolt Optimization: Uses zero-copy subarray approach for segment processing.
   * Eliminates inefficient OfflineAudioContext-based buffer duplication.
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    hopSizeSeconds: number = 2
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const fftSize = 8192;

    // Process audio in segments
    const duration = audioBuffer.duration;
    const hopSamples = Math.floor(hopSizeSeconds * sampleRate);
    const window = FastFFTEngine.getHannWindow(fftSize);
    const paddedSegment = new Float32Array(fftSize);

    for (let time = 0; time < duration; time += hopSizeSeconds) {
      const startSample = Math.floor(time * sampleRate);
      if (startSample >= channelData.length) break;

      // Use a subarray to avoid copying the full buffer
      const segment = channelData.subarray(startSample, Math.min(startSample + hopSamples, channelData.length));

      // Pad with zeros if necessary to reach fftSize
      paddedSegment.fill(0);
      paddedSegment.set(segment.subarray(0, fftSize));

      // ⚡ Bolt: Use bit-reversed FFT directly on the subarray view
      const fftResult = FastFFTEngine.cooleyTukeyFFT(paddedSegment, undefined, window);

      const magnitudes = new Float32Array(fftSize / 2);
      for (let j = 0; j < fftSize / 2; j++) {
        const real = fftResult[j * 2];
        const imag = fftResult[j * 2 + 1];
        magnitudes[j] = Math.sqrt(real * real + imag * imag) / fftSize;
      }

      // Detect key/chord for this segment using optimized magnitudes path
      const keyData = this.detectKeyFromMagnitudes(magnitudes, sampleRate);

      chords.push({
        time,
        chord: keyData.key.replace(' Major', '').replace(' Minor', 'm'),
        confidence: keyData.confidence,
      });
    }

    return chords;
  }
}

export default AdvancedKeyDetection;
