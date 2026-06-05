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
    alternatives: Array<{ key: string; confidence: number }>;
  }> {
    const { linearMagnitudes } = await this.fftEngine.performFFT(audioBuffer, 8192);
    return this.detectKeyFromMagnitudes(linearMagnitudes, audioBuffer.sampleRate);
  }

  /**
   * ⚡ Bolt Optimization: Detect key using pre-calculated linear magnitudes.
   * Eliminates redundant FFT passes when integrated into the main analysis pipeline.
   */
  detectKeyFromMagnitudes(linearMagnitudes: Float32Array, sampleRate: number): {
    key: string;
    scale: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  } {
    const chromagram = this.calculateChromagramFromMagnitudes(linearMagnitudes, sampleRate);
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
   * ⚡ Bolt Optimization: Internal method that works with raw magnitude data.
   */
  private calculateChromagramFromMagnitudes(linearMagnitudes: Float32Array, sampleRate: number): number[] {
    const chromagram = new Array(12).fill(0);
    const fftSize = linearMagnitudes.length * 2;
    const binFreqFactor = sampleRate / fftSize;

    // Map bins to pitch classes
    // Only consider frequencies between 80Hz and 5000Hz (human musical range)
    const minBin = Math.floor(80 / binFreqFactor);
    const maxBin = Math.min(Math.ceil(5000 / binFreqFactor), linearMagnitudes.length);

    for (let i = minBin; i < maxBin; i++) {
      const magnitude = linearMagnitudes[i];
      const frequency = i * binFreqFactor;
      const pitchClass = this.frequencyToPitchClass(frequency);

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
   * Detect chord progressions (experimental)
   * ⚡ Bolt Optimization: Uses Float32Array.subarray() for segment processing.
   * Replaced the inefficient OfflineAudioContext-based extraction with zero-copy views.
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

    for (let i = 0; i < segments; i++) {
      const startTime = i * hopSize;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.min(startSample + Math.floor(hopSize * sampleRate), channelData.length);

      // ⚡ Bolt: Use zero-copy subarray instead of creating new AudioBuffer
      const segmentSamples = channelData.subarray(startSample, endSample);

      // Perform FFT on segment (FFT size 8192 is appropriate for key detection)
      const { linearMagnitudes } = await this.fftEngine.performFFT(segmentSamples, 8192, sampleRate);

      // Detect key/chord for this segment
      const keyData = this.detectKeyFromMagnitudes(linearMagnitudes, sampleRate);

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
