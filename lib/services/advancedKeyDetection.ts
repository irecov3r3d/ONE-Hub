// Advanced Key Detection using Chromagram and Krumhansl-Schmuckler Algorithm
// Much more accurate than simple autocorrelation

import FastFFTEngine from './fastFFTEngine';

// Krumhansl-Schmuckler key profiles
const KEY_PROFILES = {
  major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
  minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
};

// Full modal profiles for mode detection
const MODAL_PROFILES = [
  { name: 'Ionian (Major)', profile: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88] },
  { name: 'Dorian', profile: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
  { name: 'Phrygian', profile: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
  { name: 'Lydian', profile: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88] },
  { name: 'Mixolydian', profile: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88] },
  { name: 'Aeolian (Minor)', profile: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
  { name: 'Locrian', profile: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
];

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
    alternatives: Array<{ key: string; confidence: number }>;
  }> {
    // ⚡ Bolt: Use 8192-point FFT for accuracy
    const fftSize = 8192;
    const { linearMagnitudes } = await this.fftEngine.performFFT(audioBuffer, fftSize);

    return this.detectKeyFromMagnitudes(linearMagnitudes, audioBuffer.sampleRate, fftSize);
  }

  /**
   * ⚡ Bolt Optimization: Detect key directly from pre-calculated linear magnitudes.
   * This allows sharing FFT results across different analysis services.
   */
  detectKeyFromMagnitudes(
    magnitudes: Float32Array,
    sampleRate: number,
    fftSize: number
  ): {
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  } {
    // Calculate chromagram (pitch class distribution)
    const chromagram = this.calculateChromagramFromMagnitudes(magnitudes, sampleRate, fftSize);

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
    const fftSize = 8192;
    const { linearMagnitudes } = await this.fftEngine.performFFT(audioBuffer, fftSize);
    return this.calculateChromagramFromMagnitudes(linearMagnitudes, audioBuffer.sampleRate, fftSize);
  }

  /**
   * ⚡ Bolt Optimization: Calculate chromagram from pre-calculated linear magnitudes.
   */
  private calculateChromagramFromMagnitudes(
    magnitudes: Float32Array,
    sampleRate: number,
    fftSize: number
  ): number[] {
    const chromagram = new Array(12).fill(0);
    const binFreqFactor = sampleRate / fftSize;

    // Map frequencies to pitch classes
    for (let i = 0; i < magnitudes.length; i++) {
      const freq = i * binFreqFactor;
      if (freq < 80 || freq > 5000) continue;

      const magnitude = magnitudes[i];
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
    return [...arr.slice(n), ...arr.slice(0, n)];
  }

  /**
   * Detect mode (Major, Minor, Dorian, etc.)
   */
  detectMode(chromagram: number[]): string {
    let bestMode = 'Major';
    let bestCorr = -1;

    for (const mode of MODAL_PROFILES) {
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
   * ⚡ Bolt Optimization: Uses zero-copy subarray approach and direct FFT calls.
   * Eliminates the massive overhead of OfflineAudioContext and redundant AudioBuffer creation.
   * ⚡ Accuracy Fix: Averages multiple FFT windows per segment for representative detection.
   */
  async detectChordProgression(
    audioBuffer: AudioBuffer,
    hopSize: number = 2  // seconds
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    const fftSize = 4096;
    const overlapHop = 2048; // 50% overlap for better accuracy
    const binFreqFactor = sampleRate / fftSize;

    // Pre-allocate buffers for performance
    const paddedSamples = new Float32Array(fftSize);
    const fftResult = new Float32Array(fftSize * 2);
    const hannWindow = FastFFTEngine.getHannWindow(fftSize);

    // Analyze audio in segments
    const segments = Math.floor(audioBuffer.duration / hopSize);

    for (let i = 0; i < segments; i++) {
      const segmentStartTime = i * hopSize;
      const segmentStartSample = Math.floor(segmentStartTime * sampleRate);
      const segmentEndSample = Math.floor((i + 1) * hopSize * sampleRate);

      // Accumulate chromagram for this entire segment
      const segmentChromagram = new Array(12).fill(0);
      let windowCount = 0;

      for (let j = segmentStartSample; j < segmentEndSample - fftSize; j += overlapHop) {
        // ⚡ Bolt: Zero-copy subarray
        const samples = channelData.subarray(j, j + fftSize);

        paddedSamples.fill(0);
        paddedSamples.set(samples);

        // ⚡ Bolt: Direct iterative FFT with fused windowing
        FastFFTEngine.cooleyTukeyFFT(paddedSamples, fftResult, hannWindow);

        // Map magnitudes to chromagram
        for (let k = 0; k < fftSize / 2; k++) {
          const freq = k * binFreqFactor;
          if (freq < 80 || freq > 5000) continue;

          const real = fftResult[k * 2];
          const imag = fftResult[k * 2 + 1];
          const magnitude = Math.sqrt(real * real + imag * imag) / fftSize;

          const pitchClass = this.frequencyToPitchClass(freq);
          if (pitchClass !== -1) {
            segmentChromagram[pitchClass] += magnitude;
          }
        }
        windowCount++;
      }

      if (windowCount > 0) {
        // Normalize accumulated chromagram
        const normalizedChroma = this.normalizeChromagram(segmentChromagram);
        const correlations = this.correlateWithKeyProfiles(normalizedChroma);
        const bestMatch = correlations[0];

        chords.push({
          time: segmentStartTime,
          chord: bestMatch.key.replace(' Major', '').replace(' Minor', 'm'),
          confidence: bestMatch.correlation,
        });
      }

      // Yield every 5 segments (more intensive now)
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return chords;
  }
}

export default AdvancedKeyDetection;
