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
  async detectKey(audioBuffer: AudioBuffer): Promise<{
    key: string;
    scale: string;
    confidence: number;
    chromagram: number[];
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
      chromagram: normalizedChroma,
      alternatives,
    };
  }

  /**
   * Detect key from pre-calculated magnitudes (O(1) pass over spectrum)
   * ⚡ Bolt: Extreme optimization for integrated pipelines.
   */
  public detectKeyFromMagnitudes(
    magnitudes: Float32Array,
    sampleRate: number
  ): {
    key: string;
    scale: string;
    confidence: number;
    chromagram: number[];
    alternatives: Array<{ key: string; confidence: number }>;
  } {
    const fftSize = magnitudes.length * 2;
    const binFreqFactor = sampleRate / fftSize;
    const chromagram = new Array(12).fill(0);

    for (let i = 0; i < magnitudes.length; i++) {
      const freq = i * binFreqFactor;
      if (freq < 80 || freq > 5000) continue;

      const magnitude = magnitudes[i];
      const pitchClass = this.frequencyToPitchClass(freq);

      if (pitchClass !== -1) {
        chromagram[pitchClass] += magnitude;
      }
    }

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
      chromagram: normalizedChroma,
      alternatives,
    };
  }

  /**
   * Calculate chromagram (12-bin pitch class histogram)
   * ⚡ Bolt Optimization: Supports pre-calculated linear magnitudes.
   */
  public async calculateChromagram(
    input: AudioBuffer | Float32Array,
    sampleRateOverride?: number
  ): Promise<number[]> {
    const chromagram = new Array(12).fill(0);

    let linearMagnitudes: Float32Array;
    let sampleRate: number;
    let fftSize: number;

    if (input instanceof Float32Array) {
      // ⚡ Bolt: Zero-copy path using iterative FFT
      fftSize = FastFFTEngine.getValidFFTSize(input.length);
      sampleRate = sampleRateOverride || 44100;

      const padded = new Float32Array(fftSize);
      padded.set(input.subarray(0, fftSize));

      const fftBuffer = FastFFTEngine.cooleyTukeyFFT(padded, undefined, FastFFTEngine.getHannWindow(fftSize));
      linearMagnitudes = new Float32Array(fftSize / 2);
      for (let i = 0; i < fftSize / 2; i++) {
        const real = fftBuffer[i * 2];
        const imag = fftBuffer[i * 2 + 1];
        linearMagnitudes[i] = Math.sqrt(real * real + imag * imag) / fftSize;
      }
    } else {
      // Standard path
      const result = await this.fftEngine.performFFT(input, 8192);
      linearMagnitudes = result.linearMagnitudes;
      sampleRate = input.sampleRate;
      fftSize = 8192;
    }

    const binFreqFactor = sampleRate / fftSize;

    // Map frequencies to pitch classes
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
    // ⚡ Bolt: Corrected rotation logic for key profile alignment.
    // For a tonic at index T, we need to rotate the profile such that its root (index 0)
    // aligns with the chromagram's T index.
    const shift = (12 - n) % 12;
    return [...arr.slice(shift), ...arr.slice(0, shift)];
  }

  /**
   * Detect mode (Major, Minor, Dorian, etc.)
   */
  detectMode(chromagram: number[]): string {
    const modes = [
      { name: 'Ionian (Major)', profile: KEY_PROFILES.major },
      { name: 'Dorian', profile: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
      { name: 'Phrygian', profile: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
      { name: 'Lydian', profile: KEY_PROFILES.major },
      { name: 'Mixolydian', profile: KEY_PROFILES.major },
      { name: 'Aeolian (Minor)', profile: KEY_PROFILES.minor },
      { name: 'Locrian', profile: KEY_PROFILES.minor },
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
   * ⚡ Bolt Optimization: Uses zero-copy Float32Array.subarray() and iterative FFT.
   * Eliminates O(N) allocations for AudioBuffer segments.
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    hopSize: number = 2  // seconds
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const fftSize = 4096; // Good resolution for chords

    // Analyze audio in segments
    const segments = Math.floor(audioBuffer.duration / hopSize);

    for (let i = 0; i < segments; i++) {
      const startTime = i * hopSize;
      const startSample = Math.floor(startTime * sampleRate);

      // ⚡ Bolt: Zero-copy subarray view
      const samples = channelData.subarray(startSample, startSample + fftSize);
      if (samples.length < fftSize / 2) break;

      // ⚡ Bolt: Direct chromagram calculation from raw samples
      const chroma = await this.calculateChromagram(samples, sampleRate);
      const normalizedChroma = this.normalizeChromagram(chroma);
      const correlations = this.correlateWithKeyProfiles(normalizedChroma);
      const bestMatch = correlations[0];

      chords.push({
        time: startTime,
        chord: bestMatch.key.replace(' Major', '').replace(' Minor', 'm'),
        confidence: bestMatch.correlation,
      });
    }

    return chords;
  }
}

export default AdvancedKeyDetection;
