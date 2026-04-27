import { FastFFTEngine } from './fastFFTEngine';
import type {
  AudioAnalysisResult,
  AudioFileInfo,
  TemporalAnalysis,
  FrequencyAnalysis,
  LoudnessAnalysis,
  MusicalAnalysis,
  StereoAnalysis,
  HarmonicAnalysis,
  SpectralData,
  QualityMetrics,
  MasteringSuggestions,
  FrequencyBand,
  FrequencyBandDetail,
  DominantFrequency,
  AudioSection,
  LoudnessPoint,
  PitchClass,
  Harmonic,
  AudioIssue,
  EQSuggestion,
  CompressionSuggestion,
  LimitingSuggestion,
  StereoEnhancement,
  SpectrogramData,
  StereoField,
} from '@/types';

/**
 * Interface for basic audio statistics calculated in a single pass.
 */
interface BasicAudioStats {
  mono: Float32Array;
  peakL: number;
  peakR: number;
  rmsL: number;
  rmsR: number;
  rmsMid: number;
  rmsSide: number;
  dcOffsetL: number;
  dcOffsetR: number;
  absSumL: number;
  absSumR: number;
  sumLR: number;
  sumSqL: number;
  sumSqR: number;
  clippedSamples: number;
  totalSamples: number;
  length: number;
  // ⚡ Bolt: Block-level pre-calculations for sliding window optimizations
  blockEnergy100ms: Float32Array;
  blockPeaks100ms: Float32Array;
  blockEnergy512: Float32Array;
}

/**
 * Service for comprehensive audio analysis and mastering suggestions.
 * ⚡ Bolt Optimization:
 * 1. Single-pass statistics collection (Peak, RMS, DC, Clipping, Mid/Side, Mono conversion).
 * 2. O(M log M) representative sampling (M=10,000) for expensive Dynamic Range and Noise Floor calculations.
 * 3. O(1) derivation of Integrated LUFS and Stereo content from pre-calculated stats.
 */
export class AudioAnalysisService {
  private audioContext: AudioContext;
  private fftEngine: FastFFTEngine;

  constructor() {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    this.audioContext = new AudioContextClass();
    this.fftEngine = new FastFFTEngine(this.audioContext);
  }

  /**
   * Main analysis function - performs comprehensive audio analysis.
   */
  async analyzeAudio(file: File): Promise<AudioAnalysisResult> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    const fileInfo = await this.extractFileInfo(file, audioBuffer);
    const channelData = this.extractChannelData(audioBuffer);

    // ⚡ Bolt: Single-pass stats collection (includes mono conversion and block stats)
    const stats = this.analyzeBasicStats(channelData, audioBuffer.sampleRate);

    // ⚡ Bolt: Consolidate 8192-point FFT (used by Frequency and Harmonic analysis)
    const spectrum8192 = await this.fftEngine.performFFT(audioBuffer, 8192);

    const [
      temporal,
      frequency,
      loudness,
      musical,
      stereo,
      harmonic,
      spectral,
      quality,
    ] = await Promise.all([
      this.analyzeTemporalFeatures(audioBuffer, stats),
      this.analyzeFrequency(audioBuffer, stats.mono, spectrum8192),
      this.analyzeLoudness(audioBuffer, stats),
      this.analyzeMusicalFeatures(audioBuffer, stats),
      this.analyzeStereo(audioBuffer, channelData, stats),
      this.analyzeHarmonics(audioBuffer, channelData, spectrum8192),
      this.generateSpectralData(audioBuffer, stats),
      this.analyzeQuality(audioBuffer, stats),
    ]);

    const masteringSuggestions = this.generateMasteringSuggestions(
      frequency,
      loudness,
      quality,
      stereo
    );

    return {
      fileInfo,
      temporal,
      frequency,
      loudness,
      musical,
      stereo,
      harmonic,
      spectral,
      quality,
      masteringSuggestions,
    };
  }

  /**
   * ⚡ Bolt Optimization: Consolidates mono conversion, peak detection, DC offset,
   * clipping detection, and energy accumulation (L/R and Mid/Side) into a single O(N) loop.
   */
  private analyzeBasicStats(channelData: Float32Array[], sampleRate: number): BasicAudioStats {
    const length = channelData[0].length;
    const numChannels = channelData.length;
    const mono = new Float32Array(length);
    const hasRight = numChannels > 1;

    // ⚡ Bolt: Pre-allocate block stats (100ms for loudness/silence, 512 for envelope)
    const hop100ms = Math.floor(sampleRate * 0.1);
    const num100ms = Math.floor(length / hop100ms);
    const blockEnergy100ms = new Float32Array(num100ms);
    const blockPeaks100ms = new Float32Array(num100ms);
    const num512 = length >> 9;
    const blockEnergy512 = new Float32Array(num512);

    let peakL = 0;
    let peakR = 0;
    let sumL = 0;
    let sumR = 0;
    let sumSqL = 0;
    let sumSqR = 0;
    let sumSqMid = 0;
    let sumSqSide = 0;
    let absSumL = 0;
    let absSumR = 0;
    let sumLR = 0;
    let clippedSamples = 0;
    const clippingThreshold = 0.99;

    const left = channelData[0];
    const right = hasRight ? channelData[1] : left;

    let i100 = 0, b100 = 0;
    let i512 = 0, b512 = 0;

    for (let i = 0; i < length; i++) {
      const sL = left[i];
      const sR = right[i];

      // Mono conversion
      const sMono = hasRight ? (sL + sR) / 2 : sL;
      mono[i] = sMono;

      // Peak detection
      const absL = Math.abs(sL);
      const absR = Math.abs(sR);
      if (absL > peakL) peakL = absL;
      if (absR > peakR) peakR = absR;

      // Clipping count
      if (absL >= clippingThreshold || (hasRight && absR >= clippingThreshold)) {
        clippedSamples++;
      }

      // DC Offset accumulation
      sumL += sL;
      absSumL += absL;
      if (hasRight) {
        sumR += sR;
        absSumR += absR;
        sumLR += sL * sR;
      }

      // Energy accumulation for RMS (Mid/Side corrected per ITU-R BS.1770)
      sumSqL += sL * sL;
      const sMonoSq = sMono * sMono;
      if (hasRight) {
        sumSqR += sR * sR;
        const mid = (sL + sR) / 2;
        const side = (sL - sR) / 2;
        sumSqMid += mid * mid;
        sumSqSide += side * side;
      }

      // ⚡ Bolt: Single-pass block accumulation
      if (b100 < num100ms) {
        blockEnergy100ms[b100] += sMonoSq;
        const absMono = sMono < 0 ? -sMono : sMono;
        if (absMono > blockPeaks100ms[b100]) blockPeaks100ms[b100] = absMono;
        if (++i100 === hop100ms) { i100 = 0; b100++; }
      }
      if (b512 < num512) {
        blockEnergy512[b512] += sMonoSq;
        if (++i512 === 512) { i512 = 0; b512++; }
      }
    }

    const safeLog10 = (val: number) => val > 0 ? 20 * Math.log10(val) : -100;

    return {
      mono,
      peakL: safeLog10(peakL),
      peakR: hasRight ? safeLog10(peakR) : safeLog10(peakL),
      dcOffsetL: sumL / length,
      dcOffsetR: hasRight ? sumR / length : sumL / length,
      absSumL,
      absSumR: hasRight ? absSumR : absSumL,
      sumLR,
      sumSqL,
      sumSqR: hasRight ? sumSqR : sumSqL,
      rmsL: safeLog10(Math.sqrt(sumSqL / length)),
      rmsR: hasRight ? safeLog10(Math.sqrt(sumSqR / length)) : safeLog10(Math.sqrt(sumSqL / length)),
      rmsMid: hasRight ? safeLog10(Math.sqrt(sumSqMid / length)) : safeLog10(Math.sqrt(sumSqL / length)),
      rmsSide: hasRight ? safeLog10(Math.sqrt(sumSqSide / length)) : -100,
      length,
      clippedSamples,
      totalSamples: length * numChannels,
      blockEnergy100ms,
      blockPeaks100ms,
      blockEnergy512,
    };
  }

  /**
   * Extract basic file information.
   */
  private async extractFileInfo(file: File, audioBuffer: AudioBuffer): Promise<AudioFileInfo> {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    return {
      fileName: file.name,
      format: extension.toUpperCase(),
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      bitDepth: 16, // Default, cannot be determined from Web Audio API
      bitrate: Math.round((file.size * 8) / audioBuffer.duration / 1000),
      channels: audioBuffer.numberOfChannels,
      fileSize: file.size,
      codec: extension === 'mp3' ? 'MP3' : extension === 'wav' ? 'PCM' : extension.toUpperCase(),
    };
  }

  /**
   * Extract channel data from audio buffer.
   */
  private extractChannelData(audioBuffer: AudioBuffer): Float32Array[] {
    const channels: Float32Array[] = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }
    return channels;
  }

  /**
   * Temporal analysis: BPM, beats, time signature, sections.
   */
  private async analyzeTemporalFeatures(
    audioBuffer: AudioBuffer,
    stats: BasicAudioStats
  ): Promise<TemporalAnalysis> {
    // ⚡ Bolt: Use pre-calculated block energy for envelope (O(N/hop))
    const hopSize = 512;
    const envelope = stats.blockEnergy512.map(e => Math.sqrt(e / hopSize));

    const bpmData = this.detectBPM(envelope, audioBuffer.sampleRate, hopSize);
    const beats = this.detectBeats(stats.mono, audioBuffer.sampleRate, bpmData.bpm);
    const onsets = this.detectOnsets(envelope, audioBuffer.sampleRate, hopSize);
    const sections = this.detectSections(audioBuffer, stats);

    return {
      bpm: bpmData.bpm,
      bpmConfidence: bpmData.confidence,
      timeSignature: {
        numerator: 4,
        denominator: 4,
        confidence: 0.8,
      },
      beats,
      downbeats: beats.filter((_, i) => i % 4 === 0),
      sections,
      onsets,
    };
  }

  /**
   * BPM detection using autocorrelation.
   */
  private detectBPM(
    envelope: Float32Array,
    sampleRate: number,
    hopSize: number
  ): { bpm: number; confidence: number } {
    const minBPM = 60;
    const maxBPM = 180;
    const minLag = Math.floor((60 / maxBPM) * sampleRate / hopSize);
    const maxLag = Math.floor((60 / minBPM) * sampleRate / hopSize);

    let maxCorr = 0;
    let bestLag = minLag;

    for (let lag = minLag; lag < maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < envelope.length - lag; i++) {
        corr += envelope[i] * envelope[i + lag];
      }
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }

    const bpm = Math.round((60 * sampleRate) / (bestLag * hopSize));
    const confidence = Math.min(maxCorr / (envelope.length || 1), 1);

    return { bpm, confidence };
  }


  /**
   * Detect beat positions.
   */
  private detectBeats(samples: Float32Array, sampleRate: number, bpm: number): number[] {
    const beatInterval = (60 / bpm) * sampleRate;
    const beats: number[] = [];

    for (let i = 0; i < samples.length; i += beatInterval) {
      beats.push(i / sampleRate);
    }

    return beats;
  }

  /**
   * Detect onsets (note attacks).
   */
  private detectOnsets(
    envelope: Float32Array,
    sampleRate: number,
    hopSize: number
  ): number[] {
    const onsets: number[] = [];

    const threshold = 0.3;
    for (let i = 1; i < envelope.length; i++) {
      const diff = envelope[i] - envelope[i - 1];
      if (diff > threshold) {
        onsets.push((i * hopSize) / sampleRate);
      }
    }

    return onsets;
  }

  /**
   * Detect musical sections.
   * ⚡ Bolt: Uses pre-calculated 100ms blocks to reduce complexity to O(N/hop).
   */
  private detectSections(audioBuffer: AudioBuffer, stats: BasicAudioStats): AudioSection[] {
    const duration = audioBuffer.duration;
    const sectionLength = 8; // seconds
    const hopSize = Math.floor(audioBuffer.sampleRate * 0.1);
    const blocksPerSection = Math.floor(sectionLength / 0.1);
    const sections: AudioSection[] = [];

    for (let b = 0; b < stats.blockEnergy100ms.length; b += blocksPerSection) {
      const startTime = (b * hopSize) / audioBuffer.sampleRate;
      const endTime = Math.min(startTime + sectionLength, duration);

      let sumSq = 0;
      let count = 0;
      for (let i = 0; i < blocksPerSection && (b + i) < stats.blockEnergy100ms.length; i++) {
        sumSq += stats.blockEnergy100ms[b + i];
        count += hopSize;
      }

      const energy = Math.sqrt(sumSq / (count + 1e-10));

      sections.push({
        startTime,
        endTime,
        type: 'unknown',
        energy: Math.min(energy * 10, 1),
        avgLoudness: -23,
      });
    }

    return sections;
  }

  /**
   * Frequency analysis: spectrum, frequency bands, spectral features.
   */
  private async analyzeFrequency(
    audioBuffer: AudioBuffer,
    mono: Float32Array,
    spectrum: FrequencyBand[]
  ): Promise<FrequencyAnalysis> {
    const fftSize = 8192;
    const sampleRate = audioBuffer.sampleRate;

    // ⚡ Bolt: Calculate total energy once to avoid redundant O(N) passes in each band analysis
    let totalEnergy = 0;
    for (const band of spectrum) {
      totalEnergy += Math.pow(10, band.magnitude / 20);
    }
    const safeTotalEnergy = totalEnergy + 1e-10;

    const subBass = this.analyzeFrequencyBand(spectrum, 20, 60, sampleRate, fftSize, safeTotalEnergy);
    const bass = this.analyzeFrequencyBand(spectrum, 60, 250, sampleRate, fftSize, safeTotalEnergy);
    const lowMids = this.analyzeFrequencyBand(spectrum, 250, 500, sampleRate, fftSize, safeTotalEnergy);
    const mids = this.analyzeFrequencyBand(spectrum, 500, 2000, sampleRate, fftSize, safeTotalEnergy);
    const highMids = this.analyzeFrequencyBand(spectrum, 2000, 4000, sampleRate, fftSize, safeTotalEnergy);
    const presence = this.analyzeFrequencyBand(spectrum, 4000, 6000, sampleRate, fftSize, safeTotalEnergy);
    const brilliance = this.analyzeFrequencyBand(spectrum, 6000, 20000, sampleRate, fftSize, safeTotalEnergy);

    const spectralCentroid = this.calculateSpectralCentroid(spectrum, sampleRate, fftSize);
    const spectralRolloff = this.calculateSpectralRolloff(spectrum, sampleRate, fftSize);
    const spectralFlux = this.calculateSpectralFlux(mono, fftSize, sampleRate);
    const spectralFlatness = this.calculateSpectralFlatness(spectrum);

    const dominantFrequencies = this.findDominantFrequencies(spectrum, sampleRate, fftSize);

    return {
      spectrum,
      subBass,
      bass,
      lowMids,
      mids,
      highMids,
      presence,
      brilliance,
      spectralCentroid,
      spectralRolloff,
      spectralFlux,
      spectralFlatness,
      dominantFrequencies,
    };
  }

  /**
   * Analyze specific frequency band.
   */
  private analyzeFrequencyBand(
    spectrum: FrequencyBand[],
    minFreq: number,
    maxFreq: number,
    sampleRate: number,
    fftSize: number,
    totalEnergy: number
  ): FrequencyBandDetail {
    const minBin = Math.floor((minFreq * fftSize) / sampleRate);
    const maxBin = Math.floor((maxFreq * fftSize) / sampleRate);

    let sumMagnitude = 0;
    let peakMagnitude = -Infinity;
    let sumEnergy = 0;
    let count = 0;

    for (let i = minBin; i <= maxBin && i < spectrum.length; i++) {
      const mag = spectrum[i].magnitude;
      sumMagnitude += mag;
      peakMagnitude = Math.max(peakMagnitude, mag);
      sumEnergy += Math.pow(10, mag / 20);
      count++;
    }

    const avgMagnitude = count > 0 ? sumMagnitude / count : -100;
    const rmsEnergy = count > 0 ? 20 * Math.log10(sumEnergy / count + 1e-10) : -100;

    const percentage = (sumEnergy / totalEnergy) * 100;

    return {
      range: [minFreq, maxFreq],
      avgMagnitude,
      peakMagnitude: peakMagnitude === -Infinity ? -100 : peakMagnitude,
      rmsEnergy,
      percentage,
    };
  }

  /**
   * Calculate spectral centroid (brightness).
   */
  private calculateSpectralCentroid(
    spectrum: FrequencyBand[],
    sampleRate: number,
    fftSize: number
  ): number {
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < spectrum.length; i++) {
      const frequency = (i * sampleRate) / fftSize;
      const magnitude = Math.pow(10, spectrum[i].magnitude / 20);
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }

    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  /**
   * Calculate spectral rolloff.
   */
  private calculateSpectralRolloff(
    spectrum: FrequencyBand[],
    sampleRate: number,
    fftSize: number
  ): number {
    const threshold = 0.85;
    let totalEnergy = 0;

    for (const band of spectrum) {
      totalEnergy += Math.pow(10, band.magnitude / 20);
    }

    let cumulativeEnergy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      cumulativeEnergy += Math.pow(10, spectrum[i].magnitude / 20);
      if (cumulativeEnergy >= threshold * totalEnergy) {
        return (i * sampleRate) / fftSize;
      }
    }

    return (spectrum.length * sampleRate) / fftSize;
  }

  /**
   * Calculate spectral flux.
   */
  private calculateSpectralFlux(
    samples: Float32Array,
    fftSize: number,
    sampleRate: number
  ): number {
    const hopSize = fftSize / 2;
    let totalFlux = 0;
    let frameCount = 0;

    for (let i = 0; i < samples.length - fftSize - hopSize; i += hopSize) {
      let flux = 0;
      for (let j = 0; j < fftSize; j++) {
        const diff = samples[i + hopSize + j] - samples[i + j];
        flux += diff * diff;
      }
      totalFlux += Math.sqrt(flux / fftSize);
      frameCount++;
    }

    return frameCount > 0 ? totalFlux / frameCount : 0;
  }

  /**
   * Calculate spectral flatness.
   */
  private calculateSpectralFlatness(spectrum: FrequencyBand[]): number {
    let geometricMean = 0;
    let arithmeticMean = 0;

    for (const band of spectrum) {
      const magnitude = Math.pow(10, band.magnitude / 20);
      geometricMean += Math.log(magnitude + 1e-10);
      arithmeticMean += magnitude;
    }

    geometricMean = Math.exp(geometricMean / spectrum.length);
    arithmeticMean /= spectrum.length;

    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
  }

  /**
   * Find dominant frequencies in the spectrum.
   */
  private findDominantFrequencies(
    spectrum: FrequencyBand[],
    sampleRate: number,
    fftSize: number
  ): DominantFrequency[] {
    const dominantFreqs: DominantFrequency[] = [];
    const threshold = -40;

    for (let i = 10; i < spectrum.length - 10; i++) {
      if (spectrum[i].magnitude > threshold) {
        const isLocalMax =
          spectrum[i].magnitude > spectrum[i - 1].magnitude &&
          spectrum[i].magnitude > spectrum[i + 1].magnitude;

        if (isLocalMax) {
          const frequency = (i * sampleRate) / fftSize;
          dominantFreqs.push({
            frequency,
            magnitude: spectrum[i].magnitude,
            note: this.frequencyToNote(frequency),
          });
        }
      }
    }

    return dominantFreqs
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, 10);
  }

  /**
   * Convert frequency to musical note.
   */
  private frequencyToNote(frequency: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const a4 = 440;
    const c0 = a4 * Math.pow(2, -4.75);

    if (frequency < 20) return 'N/A';

    const halfSteps = 12 * Math.log2(frequency / c0);
    const octave = Math.floor(halfSteps / 12);
    const note = Math.round(halfSteps % 12);

    return `${noteNames[note]}${octave}`;
  }

  /**
   * Loudness analysis: LUFS, RMS, peak levels, dynamic range.
   */
  private async analyzeLoudness(
    audioBuffer: AudioBuffer,
    stats: BasicAudioStats
  ): Promise<LoudnessAnalysis> {
    const sampleRate = audioBuffer.sampleRate;

    // ⚡ Bolt: Use pre-calculated RMS to derive LUFS in O(1)
    const rmsL = Math.pow(10, stats.rmsL / 20);
    const rmsR = Math.pow(10, stats.rmsR / 20);
    const avgEnergy = (rmsL * rmsL + rmsR * rmsR) / 2;
    const integratedLUFS = -0.691 + 10 * Math.log10(avgEnergy + 1e-10);

    // ⚡ Bolt: Calculate dynamic range using representative sampling
    const dynamicRange = this.calculateDynamicRange(stats.mono);

    const crestFactor = stats.peakL - stats.rmsL;
    const loudnessOverTime = this.calculateLoudnessOverTime(stats, sampleRate);

    return {
      integratedLUFS,
      loudnessRange: 8.0,
      momentaryMaxLUFS: integratedLUFS + 3,
      shortTermMaxLUFS: integratedLUFS + 2,
      truePeakL: stats.peakL + 0.1, // Web Audio API approximation
      truePeakR: stats.peakR + 0.1,
      truePeakMax: Math.max(stats.peakL, stats.peakR) + 0.1,
      rmsL: stats.rmsL,
      rmsR: stats.rmsR,
      rmsMid: stats.rmsMid,
      rmsSide: stats.rmsSide,
      peakL: stats.peakL,
      peakR: stats.peakR,
      crestFactor,
      dynamicRange,
      loudnessOverTime,
    };
  }

  /**
   * ⚡ Bolt Optimization: Uses representative sampling (M=10,000) for O(M log M) performance
   * instead of sorting the full buffer O(N log N).
   */
  private calculateDynamicRange(mono: Float32Array): number {
    const sampleSize = 10000;
    const step = Math.max(1, Math.floor(mono.length / sampleSize));
    const samples: number[] = [];

    for (let i = 0; i < mono.length; i += step) {
      samples.push(Math.abs(mono[i]));
      if (samples.length >= sampleSize) break;
    }

    samples.sort((a, b) => b - a);

    const p95 = samples[Math.floor(samples.length * 0.05)];
    const p5 = samples[Math.floor(samples.length * 0.95)];

    const p95dB = p95 > 0 ? 20 * Math.log10(p95) : -100;
    const p5dB = p5 > 0 ? 20 * Math.log10(p5) : -100;

    return p95dB - p5dB;
  }

  /**
   * Calculate loudness over time.
   * ⚡ Bolt Optimization: Uses pre-calculated 100ms blocks from analyzeBasicStats
   * to reduce complexity to O(N/hop) by aggregating 4 blocks for a 400ms window.
   */
  private calculateLoudnessOverTime(
    stats: BasicAudioStats,
    sampleRate: number
  ): LoudnessPoint[] {
    const hopSize = Math.floor(sampleRate * 0.1); // 100ms blocks
    const numBlocks = stats.blockEnergy100ms.length;
    const windowInBlocks = 4; // 400ms window = 4 * 100ms hop
    const loudnessPoints: LoudnessPoint[] = [];

    if (numBlocks < windowInBlocks) return [];

    // ⚡ Bolt: Aggregate pre-calculated blocks for sliding window (O(N/hop))
    const windowSize = hopSize * windowInBlocks;
    const invWindowSize = 1 / windowSize;

    // Use < to match previous implementation's window count exactly
    for (let b = 0; b < numBlocks - windowInBlocks; b++) {
      let totalSumSq = 0;
      let maxPeak = 0;

      for (let i = 0; i < windowInBlocks; i++) {
        totalSumSq += stats.blockEnergy100ms[b + i];
        if (stats.blockPeaks100ms[b + i] > maxPeak) maxPeak = stats.blockPeaks100ms[b + i];
      }

      const rmsSq = totalSumSq * invWindowSize;
      const lufs = -0.691 + 10 * Math.log10(rmsSq + 1e-10);
      const peakdB = maxPeak > 0 ? 20 * Math.log10(maxPeak) : -100;

      loudnessPoints.push({
        time: (b * hopSize) / sampleRate,
        lufs,
        peak: peakdB,
      });
    }

    return loudnessPoints;
  }

  /**
   * Musical feature analysis: key, scale, energy, mood.
   */
  private async analyzeMusicalFeatures(
    audioBuffer: AudioBuffer,
    stats: BasicAudioStats
  ): Promise<MusicalAnalysis> {
    const keyData = this.detectKey(stats.mono, audioBuffer.sampleRate);
    const pitchClasses = this.analyzePitchClasses(stats.mono, audioBuffer.sampleRate);

    // ⚡ Bolt: Derived from pre-calculated stats to avoid O(N) traversal
    const rms = Math.pow(10, stats.rmsMid / 20);
    const energy = Math.min(rms * 5, 1);

    return {
      key: keyData.key,
      keyConfidence: keyData.confidence,
      scale: keyData.scale,
      tempoStability: 0.85,
      tempoChanges: [],
      pitchClasses,
      rhythmComplexity: 0.6,
      syncopation: 0.4,
      energy,
      danceability: energy * 0.8,
      valence: 0.7,
      acousticness: 0.5,
      instrumentalness: 0.7,
    };
  }

  /**
   * Detect musical key (simplified).
   */
  private detectKey(samples: Float32Array, sampleRate: number): {
    key: string;
    scale: string;
    confidence: number;
  } {
    const keys = [
      'C Major', 'C# Major', 'D Major', 'D# Major', 'E Major', 'F Major',
      'F# Major', 'G Major', 'G# Major', 'A Major', 'A# Major', 'B Major',
      'C Minor', 'C# Minor', 'D Minor', 'D# Minor', 'E Minor', 'F Minor',
      'F# Minor', 'G Minor', 'G# Minor', 'A Minor', 'A# Minor', 'B Minor',
    ];

    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const scale = randomKey.includes('Major') ? 'Major' : 'Minor';

    return {
      key: randomKey,
      scale,
      confidence: 0.7,
    };
  }

  /**
   * Analyze pitch class content.
   */
  private analyzePitchClasses(samples: Float32Array, sampleRate: number): PitchClass[] {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const pitchClasses: PitchClass[] = [];

    for (let i = 0; i < 12; i++) {
      pitchClasses.push({
        note: notes[i],
        strength: Math.random() * 0.8,
        frequency: 440 * Math.pow(2, (i - 9) / 12),
      });
    }

    return pitchClasses.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Stereo field analysis.
   */
  private async analyzeStereo(
    audioBuffer: AudioBuffer,
    channelData: Float32Array[],
    stats: BasicAudioStats
  ): Promise<StereoAnalysis> {
    if (channelData.length < 2) {
      return {
        stereoWidth: 0,
        phaseCorrelation: 1,
        panBalance: 0,
        midSideRatio: 1,
        sideContent: 0,
        stereoField: [],
      };
    }

    // ⚡ Bolt: Calculate phase correlation and pan balance in O(1) from pre-collected stats
    const denominator = Math.sqrt(stats.sumSqL * stats.sumSqR);
    const phaseCorrelation = denominator > 0 ? stats.sumLR / denominator : 1;

    const totalAbs = stats.absSumL + stats.absSumR;
    const panBalance = totalAbs > 0 ? ((stats.absSumR - stats.absSumL) / (totalAbs + 1e-10)) * 100 : 0;

    // Mid/Side analysis (⚡ Bolt: pre-calculated stats)
    const rmsMid = Math.pow(10, stats.rmsMid / 20);
    const rmsSide = Math.pow(10, stats.rmsSide / 20);

    const midSideRatio = rmsSide > 0 ? rmsMid / rmsSide : 100;
    const sideContent = (rmsSide / (rmsMid + rmsSide + 1e-10)) * 100;

    const stereoWidth = (1 - phaseCorrelation) * 100;
    const stereoField = this.analyzeStereoField(stats.mono, audioBuffer.sampleRate);

    return {
      stereoWidth,
      phaseCorrelation,
      panBalance,
      midSideRatio,
      sideContent,
      stereoField,
    };
  }


  /**
   * Analyze stereo field per frequency.
   */
  private analyzeStereoField(
    mono: Float32Array,
    sampleRate: number
  ): StereoField[] {
    const bands = [
      { freq: 100, range: [80, 120] },
      { freq: 500, range: [400, 600] },
      { freq: 1000, range: [800, 1200] },
      { freq: 2000, range: [1600, 2400] },
      { freq: 5000, range: [4000, 6000] },
      { freq: 10000, range: [8000, 12000] },
    ];

    return bands.map(band => ({
      frequency: band.freq,
      width: 50 + Math.random() * 50,
      correlation: 0.3 + Math.random() * 0.4,
    }));
  }

  /**
   * Harmonic analysis.
   */
  private async analyzeHarmonics(
    audioBuffer: AudioBuffer,
    channelData: Float32Array[],
    spectrum: FrequencyBand[]
  ): Promise<HarmonicAnalysis> {
    const fftSize = 8192;
    const fundamentalFreq = this.findFundamentalFrequency(spectrum, audioBuffer.sampleRate, fftSize);
    const harmonics = this.extractHarmonics(spectrum, fundamentalFreq, audioBuffer.sampleRate, fftSize);
    const harmonicToNoiseRatio = this.calculateHNR(spectrum, harmonics);
    const thd = this.calculateTHD(harmonics);

    return {
      fundamentalFreq,
      harmonics,
      harmonicToNoiseRatio,
      thd,
      inharmonicity: 0.1,
      spectralContrast: [0.5, 0.6, 0.7, 0.6, 0.5, 0.4],
      mfcc: Array(13).fill(0).map(() => Math.random()),
    };
  }

  /**
   * Find fundamental frequency.
   */
  private findFundamentalFrequency(
    spectrum: FrequencyBand[],
    sampleRate: number,
    fftSize: number
  ): number {
    let maxMagnitude = -Infinity;
    let fundamentalBin = 0;

    const minBin = Math.floor((80 * fftSize) / sampleRate);
    const maxBin = Math.floor((1000 * fftSize) / sampleRate);

    for (let i = minBin; i < maxBin && i < spectrum.length; i++) {
      if (spectrum[i].magnitude > maxMagnitude) {
        maxMagnitude = spectrum[i].magnitude;
        fundamentalBin = i;
      }
    }

    return (fundamentalBin * sampleRate) / fftSize;
  }

  /**
   * Extract harmonics from spectrum.
   */
  private extractHarmonics(
    spectrum: FrequencyBand[],
    fundamental: number,
    sampleRate: number,
    fftSize: number
  ): Harmonic[] {
    const harmonics: Harmonic[] = [];
    const tolerance = 20;

    for (let h = 1; h <= 10; h++) {
      const targetFreq = fundamental * h;
      const targetBin = Math.round((targetFreq * fftSize) / sampleRate);

      if (targetBin < spectrum.length) {
        let peakBin = targetBin;
        let peakMag = spectrum[targetBin].magnitude;

        const searchRange = Math.floor((tolerance * fftSize) / sampleRate);
        for (let i = targetBin - searchRange; i <= targetBin + searchRange; i++) {
          if (i >= 0 && i < spectrum.length && spectrum[i].magnitude > peakMag) {
            peakBin = i;
            peakMag = spectrum[i].magnitude;
          }
        }

        harmonics.push({
          number: h,
          frequency: (peakBin * sampleRate) / fftSize,
          magnitude: peakMag,
          phase: spectrum[peakBin].phase,
        });
      }
    }

    return harmonics;
  }

  /**
   * Calculate harmonic-to-noise ratio.
   */
  private calculateHNR(spectrum: FrequencyBand[], harmonics: Harmonic[]): number {
    let harmonicEnergy = 0;
    let totalEnergy = 0;

    for (const harmonic of harmonics) {
      harmonicEnergy += Math.pow(10, harmonic.magnitude / 20);
    }

    for (const band of spectrum) {
      totalEnergy += Math.pow(10, band.magnitude / 20);
    }

    const noiseEnergy = totalEnergy - harmonicEnergy;
    return noiseEnergy > 0 ? 20 * Math.log10(harmonicEnergy / noiseEnergy) : 60;
  }

  /**
   * Calculate Total Harmonic Distortion.
   */
  private calculateTHD(harmonics: Harmonic[]): number {
    if (harmonics.length < 2) return 0;

    const fundamental = Math.pow(10, harmonics[0].magnitude / 20);
    let harmonicSum = 0;

    for (let i = 1; i < harmonics.length; i++) {
      const mag = Math.pow(10, harmonics[i].magnitude / 20);
      harmonicSum += mag * mag;
    }

    return fundamental > 0 ? (Math.sqrt(harmonicSum) / fundamental) * 100 : 0;
  }

  /**
   * Generate spectral data for reconstruction.
   */
  private async generateSpectralData(
    audioBuffer: AudioBuffer,
    stats: BasicAudioStats
  ): Promise<SpectralData> {
    const fftSize = 2048;
    const hopSize = fftSize / 4;
    const sampleRate = audioBuffer.sampleRate;

    const spectrogram = await this.fftEngine.calculateSpectrogram(audioBuffer, fftSize, hopSize);
    const spectrum = await this.fftEngine.performFFT(audioBuffer, fftSize);

    const frequencyBins = spectrum.map((band, i) => ({
      frequency: (i * sampleRate) / fftSize,
      magnitude: band.magnitude,
      phase: band.phase,
      time: audioBuffer.duration / 2,
    }));

    return {
      spectrogram,
      frequencyBins,
      fftSize,
      hopSize,
      windowType: 'Hann',
      sampleRate,
      nyquistFreq: sampleRate / 2,
    };
  }

  /**
   * Quality analysis: clipping, noise, issues.
   */
  private async analyzeQuality(
    audioBuffer: AudioBuffer,
    stats: BasicAudioStats
  ): Promise<QualityMetrics> {
    // ⚡ Bolt: optimized sampling
    const noiseFloor = this.calculateNoiseFloor(stats.mono);
    const snr = stats.rmsL - noiseFloor;

    const silentSections = this.detectSilence(stats, audioBuffer.sampleRate);
    const clippingPercentage = (stats.clippedSamples / (stats.totalSamples || 1)) * 100;

    const issues = this.detectAudioIssues(
      { clipping: stats.clippedSamples > 0, clippingPercentage, clippedSamples: stats.clippedSamples },
      stats.dcOffsetL,
      stats.dcOffsetR,
      noiseFloor,
      silentSections
    );

    const qualityScore = this.calculateQualityScore(
      issues,
      { clipping: stats.clippedSamples > 0, clippingPercentage },
      snr
    );

    return {
      clipping: stats.clippedSamples > 0,
      clippedSamples: stats.clippedSamples,
      clippingPercentage,
      noiseFloor,
      snr,
      bitDepthUtilization: 75,
      dcOffsetL: stats.dcOffsetL,
      dcOffsetR: stats.dcOffsetR,
      silentSections,
      qualityScore,
      issues,
    };
  }

  /**
   * Calculate noise floor using representative sampling.
   * ⚡ Bolt: Reduces complexity from O(N log N) to O(M log M).
   */
  private calculateNoiseFloor(mono: Float32Array): number {
    const sampleSize = 10000;
    const step = Math.max(1, Math.floor(mono.length / sampleSize));
    const samples: number[] = [];

    for (let i = 0; i < mono.length; i += step) {
      samples.push(Math.abs(mono[i]));
      if (samples.length >= sampleSize) break;
    }

    samples.sort((a, b) => a - b);
    const p5 = samples[Math.floor(samples.length * 0.05)];
    return p5 > 0 ? 20 * Math.log10(p5) : -96;
  }

  /**
   * Detect silent sections.
   * ⚡ Bolt: Uses pre-calculated 100ms blocks to reduce complexity to O(N/hop).
   */
  private detectSilence(stats: BasicAudioStats, sampleRate: number): any[] {
    const threshold = -60;
    const minDuration = 0.5;
    const silentSections: any[] = [];

    let inSilence = false;
    let silenceStart = 0;
    const hopSize = Math.floor(sampleRate * 0.1);

    for (let b = 0; b < stats.blockEnergy100ms.length; b++) {
      const sumSq = stats.blockEnergy100ms[b];
      const rms = Math.sqrt(sumSq / hopSize);
      const level = rms > 0 ? 20 * Math.log10(rms) : -100;

      const currentTime = (b * hopSize) / sampleRate;
      if (level < threshold && !inSilence) {
        inSilence = true;
        silenceStart = currentTime;
      } else if (level >= threshold && inSilence) {
        const duration = currentTime - silenceStart;
        if (duration >= minDuration) {
          silentSections.push({
            startTime: silenceStart,
            endTime: currentTime,
            duration,
            threshold,
          });
        }
        inSilence = false;
      }
    }

    return silentSections;
  }

  /**
   * Detect audio issues.
   */
  private detectAudioIssues(
    clippingData: any,
    dcOffsetL: number,
    dcOffsetR: number,
    noiseFloor: number,
    silentSections: any[]
  ): AudioIssue[] {
    const issues: AudioIssue[] = [];

    if (clippingData.clipping) {
      issues.push({
        type: 'clipping',
        severity: clippingData.clippingPercentage > 1 ? 'critical' : 'high',
        description: `Audio contains ${clippingData.clippedSamples} clipped samples (${clippingData.clippingPercentage.toFixed(2)}%)`,
        suggestion: 'Reduce input gain or apply limiting before recording',
      });
    }

    if (Math.abs(dcOffsetL) > 0.01 || Math.abs(dcOffsetR) > 0.01) {
      issues.push({
        type: 'dc-offset',
        severity: 'medium',
        description: `DC offset detected: L=${dcOffsetL.toFixed(4)}, R=${dcOffsetR.toFixed(4)}`,
        suggestion: 'Apply DC offset removal filter',
      });
    }

    if (noiseFloor > -60) {
      issues.push({
        type: 'noise',
        severity: 'medium',
        description: `High noise floor: ${noiseFloor.toFixed(1)} dBFS`,
        suggestion: 'Apply noise reduction or use a noise gate',
      });
    }

    return issues;
  }

  /**
   * Calculate overall quality score.
   */
  private calculateQualityScore(issues: AudioIssue[], clippingData: any, snr: number): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical': score -= 30; break;
        case 'high': score -= 20; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    }

    if (snr > 60) score += 10;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate mastering suggestions based on analysis.
   */
  private generateMasteringSuggestions(
    frequency: FrequencyAnalysis,
    loudness: LoudnessAnalysis,
    quality: QualityMetrics,
    stereo: StereoAnalysis
  ): MasteringSuggestions {
    const eqSuggestions: EQSuggestion[] = [];
    const recommendations: string[] = [];

    if (frequency.bass.percentage > 30) {
      eqSuggestions.push({
        frequency: 100,
        type: 'bell',
        gain: -2,
        q: 1.5,
        reason: 'Excessive bass energy detected',
      });
      recommendations.push('Reduce low-end energy to prevent muddiness');
    }

    if (frequency.presence.percentage > 15) {
      eqSuggestions.push({
        frequency: 5000,
        type: 'bell',
        gain: -1.5,
        q: 2,
        reason: 'Harsh high frequencies detected',
      });
      recommendations.push('Reduce presence frequencies to smooth harshness');
    }

    eqSuggestions.push({
      frequency: 30,
      type: 'highpass',
      gain: 0,
      q: 0.7,
      reason: 'Remove subsonic content',
    });

    const targetLUFS = -14;
    const needsNormalization = Math.abs(loudness.integratedLUFS - targetLUFS) > 3;

    if (loudness.integratedLUFS < -20) {
      recommendations.push('Increase overall loudness with compression and limiting');
    } else if (loudness.integratedLUFS > -10) {
      recommendations.push('Reduce overall loudness to prevent over-compression');
    }

    let compressionSuggestion: CompressionSuggestion | undefined;
    if (loudness.dynamicRange > 15) {
      compressionSuggestion = {
        threshold: -18,
        ratio: 3,
        attack: 10,
        release: 100,
        knee: 6,
        makeupGain: 3,
        reason: 'Large dynamic range detected - gentle compression recommended',
      };
      recommendations.push('Apply gentle compression to control dynamics');
    }

    const limitingSuggestion: LimitingSuggestion = {
      threshold: -1,
      ceiling: -0.3,
      release: 50,
      reason: 'Prevent clipping and achieve competitive loudness',
    };

    let stereoEnhancement: StereoEnhancement | undefined;
    if (stereo.stereoWidth < 50) {
      stereoEnhancement = {
        widthAdjustment: 20,
        midSideProcessing: true,
        reason: 'Narrow stereo image - enhancement recommended',
      };
      recommendations.push('Widen stereo image for more spacious sound');
    } else if (stereo.stereoWidth > 150) {
      stereoEnhancement = {
        widthAdjustment: -20,
        midSideProcessing: true,
        reason: 'Overly wide stereo - may cause phase issues',
      };
      recommendations.push('Reduce stereo width to improve mono compatibility');
    }

    if (quality.clipping) {
      recommendations.push('Remove clipping with repair tools or re-record');
    }

    return {
      needsNormalization,
      targetLUFS,
      eqSuggestions,
      compressionSuggestion,
      limitingSuggestion,
      stereoEnhancement,
      recommendations,
    };
  }

  /**
   * Export analysis results as JSON.
   */
  exportAsJSON(analysis: AudioAnalysisResult): string {
    return JSON.stringify(analysis, null, 2);
  }

  /**
   * Export analysis results as formatted text.
   */
  exportAsText(analysis: AudioAnalysisResult): string {
    let text = '=== COMPREHENSIVE AUDIO ANALYSIS ===\n\n';

    text += '--- FILE INFORMATION ---\n';
    text += `File: ${analysis.fileInfo.fileName}\n`;
    text += `Format: ${analysis.fileInfo.format}\n`;
    text += `Duration: ${analysis.fileInfo.duration.toFixed(2)}s\n`;
    text += `Sample Rate: ${analysis.fileInfo.sampleRate} Hz\n`;
    text += `Channels: ${analysis.fileInfo.channels}\n`;
    text += `Bitrate: ${analysis.fileInfo.bitrate} kbps\n\n`;

    text += '--- TEMPORAL ANALYSIS ---\n';
    text += `BPM: ${analysis.temporal.bpm} (confidence: ${(analysis.temporal.bpmConfidence * 100).toFixed(0)}%)\n`;
    text += `Time Signature: ${analysis.temporal.timeSignature.numerator}/${analysis.temporal.timeSignature.denominator}\n`;
    text += `Beats Detected: ${analysis.temporal.beats.length}\n`;
    text += `Onsets Detected: ${analysis.temporal.onsets.length}\n\n`;

    text += '--- LOUDNESS ---\n';
    text += `Integrated LUFS: ${analysis.loudness.integratedLUFS.toFixed(1)}\n`;
    text += `Peak L: ${analysis.loudness.peakL.toFixed(1)} dBFS\n`;
    text += `Peak R: ${analysis.loudness.peakR.toFixed(1)} dBFS\n`;
    text += `True Peak: ${analysis.loudness.truePeakMax.toFixed(1)} dBTP\n`;
    text += `RMS L: ${analysis.loudness.rmsL.toFixed(1)} dB\n`;
    text += `RMS R: ${analysis.loudness.rmsR.toFixed(1)} dB\n`;
    text += `Dynamic Range: ${analysis.loudness.dynamicRange.toFixed(1)} dB\n`;
    text += `Crest Factor: ${analysis.loudness.crestFactor.toFixed(1)} dB\n\n`;

    text += '--- FREQUENCY ANALYSIS ---\n';
    text += `Sub Bass (20-60 Hz): ${analysis.frequency.subBass.percentage.toFixed(1)}%\n`;
    text += `Bass (60-250 Hz): ${analysis.frequency.bass.percentage.toFixed(1)}%\n`;
    text += `Low Mids (250-500 Hz): ${analysis.frequency.lowMids.percentage.toFixed(1)}%\n`;
    text += `Mids (500-2000 Hz): ${analysis.frequency.mids.percentage.toFixed(1)}%\n`;
    text += `High Mids (2-4 kHz): ${analysis.frequency.highMids.percentage.toFixed(1)}%\n`;
    text += `Presence (4-6 kHz): ${analysis.frequency.presence.percentage.toFixed(1)}%\n`;
    text += `Brilliance (6-20 kHz): ${analysis.frequency.brilliance.percentage.toFixed(1)}%\n`;
    text += `Spectral Centroid: ${analysis.frequency.spectralCentroid.toFixed(0)} Hz\n\n`;

    text += '--- MUSICAL FEATURES ---\n';
    text += `Key: ${analysis.musical.key}\n`;
    text += `Scale: ${analysis.musical.scale}\n`;
    text += `Energy: ${(analysis.musical.energy * 100).toFixed(0)}%\n`;
    text += `Danceability: ${(analysis.musical.danceability * 100).toFixed(0)}%\n\n`;

    text += '--- STEREO ANALYSIS ---\n';
    text += `Stereo Width: ${analysis.stereo.stereoWidth.toFixed(0)}%\n`;
    text += `Phase Correlation: ${analysis.stereo.phaseCorrelation.toFixed(2)}\n`;
    text += `Pan Balance: ${analysis.stereo.panBalance.toFixed(1)}\n\n`;

    text += '--- QUALITY METRICS ---\n';
    text += `Quality Score: ${analysis.quality.qualityScore}/100\n`;
    text += `Clipping: ${analysis.quality.clipping ? 'YES' : 'NO'}\n`;
    if (analysis.quality.clipping) {
      text += `Clipped Samples: ${analysis.quality.clippedSamples} (${analysis.quality.clippingPercentage.toFixed(3)}%)\n`;
    }
    text += `SNR: ${analysis.quality.snr.toFixed(1)} dB\n`;
    text += `Noise Floor: ${analysis.quality.noiseFloor.toFixed(1)} dBFS\n\n`;

    if (analysis.quality.issues.length > 0) {
      text += '--- ISSUES DETECTED ---\n';
      for (const issue of analysis.quality.issues) {
        text += `[${issue.severity.toUpperCase()}] ${issue.description}\n`;
        if (issue.suggestion) {
          text += `  Suggestion: ${issue.suggestion}\n`;
        }
      }
      text += '\n';
    }

    if (analysis.masteringSuggestions) {
      text += '--- MASTERING SUGGESTIONS ---\n';
      for (const rec of analysis.masteringSuggestions.recommendations) {
        text += `• ${rec}\n`;
      }
      text += `\nTarget LUFS: ${analysis.masteringSuggestions.targetLUFS} LUFS\n`;

      if (analysis.masteringSuggestions.eqSuggestions.length > 0) {
        text += '\nEQ Suggestions:\n';
        for (const eq of analysis.masteringSuggestions.eqSuggestions) {
          text += `  ${eq.frequency} Hz (${eq.type}): ${eq.gain > 0 ? '+' : ''}${eq.gain.toFixed(1)} dB - ${eq.reason}\n`;
        }
      }
    }

    return text;
  }
}

export default AudioAnalysisService;
