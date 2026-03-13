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

interface BasicAudioStats {
  peakL: number;
  peakR: number;
  rmsL: number;
  rmsR: number;
  rmsMid: number;
  rmsSide: number;
  dcOffsetL: number;
  dcOffsetR: number;
  clippedSamples: number;
  totalSamples: number;
}

export class AudioAnalysisService {
  private audioContext: AudioContext;
  private fftEngine: FastFFTEngine;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.fftEngine = new FastFFTEngine(this.audioContext);
  }

  /**
   * Main analysis function - performs comprehensive audio analysis
   */
  async analyzeAudio(file: File): Promise<AudioAnalysisResult> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    const fileInfo = await this.extractFileInfo(file, audioBuffer);
    const channelData = this.extractChannelData(audioBuffer);

    // ⚡ Bolt: Consolidate basic stats in a single pass to improve performance
    const stats = this.analyzeBasicStats(channelData);

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
      this.analyzeTemporalFeatures(audioBuffer, stats.mono),
      this.analyzeFrequency(audioBuffer, stats.mono),
      this.analyzeLoudness(audioBuffer, stats),
      this.analyzeMusicalFeatures(audioBuffer, stats.mono),
      this.analyzeStereo(audioBuffer, channelData, stats),
      this.analyzeHarmonics(audioBuffer, channelData),
      this.generateSpectralData(audioBuffer, channelData),
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
   * ⚡ Bolt: Single-pass analysis for basic audio metrics
   * Consolidates mono conversion, peak detection, and energy accumulation
   */
  private analyzeBasicStats(channelData: Float32Array[]): BasicAudioStats {
    const length = channelData[0].length;
    const numChannels = channelData.length;
    const mono = new Float32Array(length);
    let peakL = 0;
    let peakR = 0;
    let sumL = 0;
    let sumR = 0;
    let sumSqL = 0;
    let sumSqR = 0;
    let sumSqMid = 0;
    let sumSqSide = 0;
    let clippedSamples = 0;
    const clippingThreshold = 0.99;

    const left = channelData[0];
    const right = numChannels > 1 ? channelData[1] : left;

    for (let i = 0; i < length; i++) {
      const sL = left[i];
      const sR = right[i];

      // Mono conversion
      const sMono = numChannels > 1 ? (sL + sR) / 2 : sL;
      mono[i] = sMono;

      // Peak detection
      const absL = Math.abs(sL);
      const absR = Math.abs(sR);
      if (absL > peakL) peakL = absL;
      if (absR > peakR) peakR = absR;

      // Clipping count
      if (absL >= clippingThreshold || absR >= clippingThreshold) {
        clippedSamples++;
      }

      // DC Offset accumulation
      sumL += sL;
      sumR += sR;

      // Energy accumulation for RMS (Mid/Side corrected per ITU-R BS.1770)
      sumSqL += sL * sL;
      sumSqR += sR * sR;

      const mid = (sL + sR) / 2;
      const side = (sL - sR) / 2;
      sumSqMid += mid * mid;
      sumSqSide += side * side;
    }

    return {
      mono,
      peakL,
      peakR,
      dcOffsetL: sumL / length,
      dcOffsetR: sumR / length,
      rmsL: Math.sqrt(sumSqL / length),
      rmsR: Math.sqrt(sumSqR / length),
      rmsMid: Math.sqrt(sumSqMid / length),
      rmsSide: Math.sqrt(sumSqSide / length),
      length,
      clippedSamples
    };
  }

  /**
   * Extract basic file information
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
   * Extract channel data from audio buffer
   */
  private extractChannelData(audioBuffer: AudioBuffer): Float32Array[] {
    const channels: Float32Array[] = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }
    return channels;
  }

  /**
   * Temporal analysis: BPM, beats, time signature, sections
   */
  private async analyzeTemporalFeatures(
    audioBuffer: AudioBuffer,
    mono: Float32Array
  ): Promise<TemporalAnalysis> {
    // BPM Detection using autocorrelation
    const bpmData = this.detectBPM(mono, audioBuffer.sampleRate);

    // Beat detection
    const beats = this.detectBeats(mono, audioBuffer.sampleRate, bpmData.bpm);

    // Onset detection
    const onsets = this.detectOnsets(mono, audioBuffer.sampleRate);

    // Section detection based on energy and spectral changes
    const sections = this.detectSections(audioBuffer, mono);

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
   * BPM detection using autocorrelation and peak detection
   */
  private detectBPM(samples: Float32Array, sampleRate: number): { bpm: number; confidence: number } {
    // Calculate energy envelope
    const hopSize = 512;
    const envelope = this.calculateEnergyEnvelope(samples, hopSize);

    // Autocorrelation
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
    const confidence = Math.min(maxCorr / envelope.length, 1);

    return { bpm, confidence };
  }

  /**
   * Calculate energy envelope for beat detection
   */
  private calculateEnergyEnvelope(samples: Float32Array, hopSize: number): Float32Array {
    const numFrames = Math.floor(samples.length / hopSize);
    const envelope = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      let energy = 0;
      for (let j = 0; j < hopSize; j++) {
        const idx = i * hopSize + j;
        if (idx < samples.length) {
          energy += samples[idx] * samples[idx];
        }
      }
      envelope[i] = Math.sqrt(energy / hopSize);
    }

    return envelope;
  }

  /**
   * Detect beat positions
   */
  private detectBeats(samples: Float32Array, sampleRate: number, bpm: number): number[] {
    const beatInterval = (60 / bpm) * sampleRate;
    const beats: number[] = [];

    // Simple beat detection based on BPM
    for (let i = 0; i < samples.length; i += beatInterval) {
      beats.push(i / sampleRate);
    }

    return beats;
  }

  /**
   * Detect onsets (note attacks)
   */
  private detectOnsets(samples: Float32Array, sampleRate: number): number[] {
    const hopSize = 512;
    const envelope = this.calculateEnergyEnvelope(samples, hopSize);
    const onsets: number[] = [];

    // Calculate energy differences
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
   * Detect musical sections
   */
  private detectSections(audioBuffer: AudioBuffer, mono: Float32Array): AudioSection[] {
    const duration = audioBuffer.duration;
    const sectionLength = 8; // 8 seconds per section analysis
    const sections: AudioSection[] = [];

    for (let time = 0; time < duration; time += sectionLength) {
      const endTime = Math.min(time + sectionLength, duration);
      const startSample = Math.floor(time * audioBuffer.sampleRate);
      const endSample = Math.floor(endTime * audioBuffer.sampleRate);

      // Calculate energy for this section
      let energy = 0;
      for (let i = startSample; i < endSample && i < mono.length; i++) {
        energy += mono[i] * mono[i];
      }
      energy = Math.sqrt(energy / (endSample - startSample));

      sections.push({
        startTime: time,
        endTime,
        type: 'unknown',
        energy: Math.min(energy * 10, 1),
        avgLoudness: -23, // Placeholder
      });
    }

    return sections;
  }

  /**
   * Frequency analysis: spectrum, frequency bands, spectral features
   */
  private async analyzeFrequency(
    audioBuffer: AudioBuffer,
    mono: Float32Array
  ): Promise<FrequencyAnalysis> {
    const fftSize = 8192;

    console.time('⚡ Bolt: performFFT');
    const spectrum = await this.performFFT(audioBuffer, fftSize);
    console.timeEnd('⚡ Bolt: performFFT');

    // Analyze frequency bands
    const sampleRate = audioBuffer.sampleRate;
    const subBass = this.analyzeFrequencyBand(spectrum, 20, 60, sampleRate, fftSize);
    const bass = this.analyzeFrequencyBand(spectrum, 60, 250, sampleRate, fftSize);
    const lowMids = this.analyzeFrequencyBand(spectrum, 250, 500, sampleRate, fftSize);
    const mids = this.analyzeFrequencyBand(spectrum, 500, 2000, sampleRate, fftSize);
    const highMids = this.analyzeFrequencyBand(spectrum, 2000, 4000, sampleRate, fftSize);
    const presence = this.analyzeFrequencyBand(spectrum, 4000, 6000, sampleRate, fftSize);
    const brilliance = this.analyzeFrequencyBand(spectrum, 6000, 20000, sampleRate, fftSize);

    // Spectral features
    const spectralCentroid = this.calculateSpectralCentroid(spectrum, sampleRate, fftSize);
    const spectralRolloff = this.calculateSpectralRolloff(spectrum, sampleRate, fftSize);
    const spectralFlux = this.calculateSpectralFlux(mono, fftSize, sampleRate);
    const spectralFlatness = this.calculateSpectralFlatness(spectrum);

    // Find dominant frequencies
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
   * Perform FFT and return frequency spectrum
   * ⚡ Bolt: Using FastFFTEngine for O(N log N) performance
   */
  private async performFFT(audioBuffer: AudioBuffer, fftSize: number): Promise<FrequencyBand[]> {
    return this.fftEngine.performFFT(audioBuffer, fftSize);
  }

  /**
   * Analyze specific frequency band
   */
  private analyzeFrequencyBand(
    spectrum: FrequencyBand[],
    minFreq: number,
    maxFreq: number,
    sampleRate: number,
    fftSize: number
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
    const rmsEnergy = count > 0 ? 20 * Math.log10(sumEnergy / count) : -100;

    // Calculate percentage of total energy
    let totalEnergy = 0;
    for (const band of spectrum) {
      totalEnergy += Math.pow(10, band.magnitude / 20);
    }
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
   * Calculate spectral centroid (brightness)
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
   * Calculate spectral rolloff
   */
  private calculateSpectralRolloff(
    spectrum: FrequencyBand[],
    sampleRate: number,
    fftSize: number
  ): number {
    const threshold = 0.85; // 85% of total energy
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
   * Calculate spectral flux (measure of spectral change)
   */
  private calculateSpectralFlux(
    samples: Float32Array,
    fftSize: number,
    sampleRate: number
  ): number {
    // Simplified spectral flux calculation
    const hopSize = fftSize / 2;
    let totalFlux = 0;
    let frameCount = 0;

    for (let i = 0; i < samples.length - fftSize - hopSize; i += hopSize) {
      // Compare adjacent frames
      let flux = 0;
      for (let j = 0; j < fftSize; j++) {
        const diff = samples[i + hopSize + j] - samples[i + j];
        flux += diff * diff;
      }
      totalFlux += Math.sqrt(flux);
      frameCount++;
    }

    return frameCount > 0 ? totalFlux / frameCount : 0;
  }

  /**
   * Calculate spectral flatness (noisiness indicator)
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
   * Find dominant frequencies in the spectrum
   */
  private findDominantFrequencies(
    spectrum: FrequencyBand[],
    sampleRate: number,
    fftSize: number
  ): DominantFrequency[] {
    const dominantFreqs: DominantFrequency[] = [];
    const threshold = -40; // dB

    // Find local maxima above threshold
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

    // Sort by magnitude and return top 10
    return dominantFreqs
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, 10);
  }

  /**
   * Convert frequency to musical note
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
   * Loudness analysis: LUFS, RMS, peak levels, dynamic range
   */
  private async analyzeLoudness(
    audioBuffer: AudioBuffer,
    stats: BasicAudioStats
  ): Promise<LoudnessAnalysis> {
    const sampleRate = audioBuffer.sampleRate;
    const stats = this.analyzeBasicStats(channelData);

    // Calculate integrated LUFS (simplified - real implementation needs K-weighting)
    const integratedLUFS = this.calculateIntegratedLUFS(channelData, sampleRate);

    // Dynamic range
    const dynamicRange = this.calculateDynamicRange(channelData);

    // Crest factor
    const crestFactor = stats.peakL - stats.rmsL;

    // Loudness over time
    const loudnessOverTime = this.calculateLoudnessOverTime(stats.mono, sampleRate);

    return {
      integratedLUFS,
      loudnessRange: 8.0, // Placeholder
      momentaryMaxLUFS: integratedLUFS + 3,
      shortTermMaxLUFS: integratedLUFS + 2,
      truePeakL: stats.peakL + 0.5,
      truePeakR: stats.peakR + 0.5,
      truePeakMax: Math.max(stats.peakL, stats.peakR) + 0.5,
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
   * ⚡ Bolt: Calculate dynamic range using representative sampling
   * Avoids expensive O(N log N) sorting of the full buffer
   */
  private calculateDynamicRange(mono: Float32Array): number {
    const sampleSize = 10000;
    const step = Math.max(1, Math.floor(mono.length / sampleSize));
    const samples: number[] = [];

    for (let i = 0; i < mono.length; i += step) {
      samples.push(Math.abs(mono[i]));
    }

    const rms = Math.sqrt(sumSquares / mono.length);
    const lufs = -0.691 + 10 * Math.log10(rms * rms);

    return lufs;
  }


  /**
   * Calculate dynamic range
   * ⚡ Bolt: Uses representative sampling (M=10,000) for O(M log M) performance
   * instead of sorting the full buffer O(N log N).
   */
  private calculateDynamicRange(channels: Float32Array[]): number {
    const mono = this.convertToMono(channels);
    const sampleSize = 10000;
    const step = Math.max(1, Math.floor(mono.length / sampleSize));
    const samples: number[] = [];

    for (let i = 0; i < mono.length; i += step) {
      samples.push(Math.abs(mono[i]));
      if (samples.length >= sampleSize) break;
    }

    // Sort the representative sample
    samples.sort((a, b) => b - a);

    // Get 95th percentile and 5th percentile
    const p95 = samples[Math.floor(samples.length * 0.05)];
    const p5 = samples[Math.floor(samples.length * 0.95)];

    const p95dB = p95 > 0 ? 20 * Math.log10(p95) : -100;
    const p5dB = p5 > 0 ? 20 * Math.log10(p5) : -100;

    return p95dB - p5dB;
  }

  /**
   * Calculate loudness over time
   */
  private calculateLoudnessOverTime(
    mono: Float32Array,
    sampleRate: number
  ): LoudnessPoint[] {
    const windowSize = Math.floor(sampleRate * 0.4); // 400ms windows
    const hopSize = Math.floor(sampleRate * 0.1); // 100ms hop
    const loudnessPoints: LoudnessPoint[] = [];

    for (let i = 0; i < mono.length - windowSize; i += hopSize) {
      let sumSquares = 0;
      let peak = 0;

      for (let j = 0; j < windowSize; j++) {
        const sample = mono[i + j];
        sumSquares += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }

      const rms = Math.sqrt(sumSquares / windowSize);
      const lufs = -0.691 + 10 * Math.log10(rms * rms);
      const peakdB = peak > 0 ? 20 * Math.log10(peak) : -100;

      loudnessPoints.push({
        time: i / sampleRate,
        lufs,
        peak: peakdB,
      });
    }

    return loudnessPoints;
  }

  /**
   * Musical feature analysis: key, scale, energy, mood
   */
  private async analyzeMusicalFeatures(
    audioBuffer: AudioBuffer,
    mono: Float32Array
  ): Promise<MusicalAnalysis> {
    // Key detection (simplified)
    const keyData = this.detectKey(mono, audioBuffer.sampleRate);

    // Pitch class analysis
    const pitchClasses = this.analyzePitchClasses(mono, audioBuffer.sampleRate);

    // Energy calculation
    let energy = 0;
    for (const sample of mono) {
      energy += sample * sample;
    }
    energy = Math.min(Math.sqrt(energy / mono.length) * 5, 1);

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
   * Detect musical key (simplified)
   */
  private detectKey(samples: Float32Array, sampleRate: number): {
    key: string;
    scale: string;
    confidence: number;
  } {
    // Simplified key detection
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
   * Analyze pitch class content
   */
  private analyzePitchClasses(samples: Float32Array, sampleRate: number): PitchClass[] {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const pitchClasses: PitchClass[] = [];

    // Simplified pitch class analysis
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
   * Stereo field analysis
   */
  private async analyzeStereo(
    audioBuffer: AudioBuffer,
    channelData: Float32Array[],
    stats: BasicAudioStats
  ): Promise<StereoAnalysis> {
    if (channelData.length < 2) {
      // Mono file
      return {
        stereoWidth: 0,
        phaseCorrelation: 1,
        panBalance: 0,
        midSideRatio: 1,
        sideContent: 0,
        stereoField: [],
      };
    }

    const left = channelData[0];
    const right = channelData[1];

    // Calculate phase correlation
    const phaseCorrelation = this.calculatePhaseCorrelation(left, right);

    // Calculate pan balance
    const panBalance = this.calculatePanBalance(left, right);

    // Mid/Side analysis (⚡ Bolt: uses pre-calculated stats)
    const midSideRatio = stats.rmsMid / (stats.rmsSide || 0.00001);
    const sideContent = (stats.rmsSide / (stats.rmsMid + stats.rmsSide)) * 100;

    // Stereo width
    const stereoWidth = (1 - phaseCorrelation) * 100;

    // Frequency-dependent stereo field
    const stereoField = this.analyzeStereoField(left, right, audioBuffer.sampleRate);

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
   * Calculate phase correlation
   */
  private calculatePhaseCorrelation(left: Float32Array, right: Float32Array): number {
    let sumLR = 0;
    let sumLL = 0;
    let sumRR = 0;

    for (let i = 0; i < left.length; i++) {
      sumLR += left[i] * right[i];
      sumLL += left[i] * left[i];
      sumRR += right[i] * right[i];
    }

    const denominator = Math.sqrt(sumLL * sumRR);
    return denominator > 0 ? sumLR / denominator : 1;
  }

  /**
   * Calculate pan balance
   */
  private calculatePanBalance(left: Float32Array, right: Float32Array): number {
    let sumL = 0;
    let sumR = 0;

    for (let i = 0; i < left.length; i++) {
      sumL += Math.abs(left[i]);
      sumR += Math.abs(right[i]);
    }

    const total = sumL + sumR;
    return total > 0 ? ((sumR - sumL) / total) * 100 : 0;
  }

  /**
   * Calculate mid/side characteristics
   * ⚡ Bolt: Correct energy-preserving Mid/Side calculation
   */
  private calculateMidSide(left: Float32Array, right: Float32Array): {
    midSideRatio: number;
    sideContent: number;
  } {
    let sumMidSq = 0;
    let sumSideSq = 0;

    for (let i = 0; i < left.length; i++) {
      const mid = (left[i] + right[i]) / 2;
      const side = (left[i] - right[i]) / 2;
      sumMidSq += mid * mid;
      sumSideSq += side * side;
    }

    const midRMS = Math.sqrt(sumMidSq / left.length);
    const sideRMS = Math.sqrt(sumSideSq / left.length);
    const total = midRMS + sideRMS;

    return {
      midSideRatio: sideRMS > 0 ? midRMS / sideRMS : 100, // Handle mono case
      sideContent: total > 0 ? (sideRMS / total) * 100 : 0,
    };
  }

  /**
   * Analyze stereo field per frequency
   */
  private analyzeStereoField(
    left: Float32Array,
    right: Float32Array,
    sampleRate: number
  ): StereoField[] {
    // Simplified frequency-dependent stereo analysis
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
   * Harmonic analysis
   */
  private async analyzeHarmonics(
    audioBuffer: AudioBuffer,
    channelData: Float32Array[]
  ): Promise<HarmonicAnalysis> {
    const fftSize = 8192;
    const spectrum = await this.performFFT(audioBuffer, fftSize);

    // Find fundamental frequency
    const fundamentalFreq = this.findFundamentalFrequency(spectrum, audioBuffer.sampleRate, fftSize);

    // Extract harmonics
    const harmonics = this.extractHarmonics(spectrum, fundamentalFreq, audioBuffer.sampleRate, fftSize);

    // Calculate harmonic-to-noise ratio
    const harmonicToNoiseRatio = this.calculateHNR(spectrum, harmonics);

    // Calculate THD
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
   * Find fundamental frequency
   */
  private findFundamentalFrequency(
    spectrum: FrequencyBand[],
    sampleRate: number,
    fftSize: number
  ): number {
    // Find the strongest frequency component in the low-mid range
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
   * Extract harmonics from spectrum
   */
  private extractHarmonics(
    spectrum: FrequencyBand[],
    fundamental: number,
    sampleRate: number,
    fftSize: number
  ): Harmonic[] {
    const harmonics: Harmonic[] = [];
    const tolerance = 20; // Hz

    for (let h = 1; h <= 10; h++) {
      const targetFreq = fundamental * h;
      const targetBin = Math.round((targetFreq * fftSize) / sampleRate);

      if (targetBin < spectrum.length) {
        // Find peak near target frequency
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
   * Calculate harmonic-to-noise ratio
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
   * Calculate Total Harmonic Distortion
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
   * Generate spectral data for reconstruction
   */
  private async generateSpectralData(
    audioBuffer: AudioBuffer,
    channelData: Float32Array[]
  ): Promise<SpectralData> {
    const fftSize = 2048;
    const hopSize = fftSize / 4;
    const sampleRate = audioBuffer.sampleRate;

    // Generate spectrogram
    const spectrogram = await this.generateSpectrogram(audioBuffer, fftSize, hopSize);

    // Generate frequency bins (sample from middle of audio)
    const spectrum = await this.performFFT(audioBuffer, fftSize);
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
   * Generate spectrogram
   * ⚡ Bolt: Using FastFFTEngine for optimized time-frequency analysis
   */
  private async generateSpectrogram(
    audioBuffer: AudioBuffer,
    fftSize: number,
    hopSize: number
  ): Promise<SpectrogramData> {
    return this.fftEngine.calculateSpectrogram(audioBuffer, fftSize, hopSize);
  }

  /**
   * Quality analysis: clipping, noise, issues
   */
  private async analyzeQuality(
    audioBuffer: AudioBuffer,
    stats: BasicAudioStats
  ): Promise<QualityMetrics> {
    const mono = this.convertToMono(channelData);
    const stats = this.analyzeBasicStats(channelData);

    // Noise floor (⚡ Bolt: optimized sampling)
    const noiseFloor = this.calculateNoiseFloor(stats.mono);

    // SNR
    const snr = this.calculateSNR(mono, noiseFloor);

    // Silent sections
    const silentSections = this.detectSilence(stats.mono, audioBuffer.sampleRate);

    const clippingPercentage = (stats.clippedSamples / stats.totalSamples) * 100;

    // Detect issues
    const issues = this.detectAudioIssues(
      { clipping: stats.clippedSamples > 0, clippingPercentage, clippedSamples: stats.clippedSamples },
      stats.dcOffsetL,
      stats.dcOffsetR,
      noiseFloor,
      silentSections
    );

    // Calculate quality score
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
   * Calculate noise floor
   */
  private calculateNoiseFloor(mono: Float32Array): number {
    const sampleSize = 10000;
    const step = Math.max(1, Math.floor(mono.length / sampleSize));
    const samples: number[] = [];

    const p5 = sortedSamples[Math.floor(sortedSamples.length * 0.05)];
    return p5 > 0 ? 20 * Math.log10(p5) : -96;
  }

  /**
   * Calculate SNR
   */
  private calculateSNR(samples: Float32Array, noiseFloor: number): number {
    let sumSquares = 0;
    for (const sample of samples) {
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    const signalLevel = rms > 0 ? 20 * Math.log10(rms) : -96;

    return signalLevel - noiseFloor;
  }

  /**
   * Single-pass analysis for basic audio statistics
   * ⚡ Bolt: Consolidates peak, RMS, DC offset, and clipping detection
   */
  private analyzeBasicStats(channels: Float32Array[]): BasicAudioStats {
    let peakL = 0;
    let peakR = 0;
    let sumL = 0;
    let sumR = 0;
    let sumSqL = 0;
    let sumSqR = 0;
    let sumSqMid = 0;
    let sumSqSide = 0;
    let clippedSamples = 0;
    const numSamples = channels[0].length;
    const hasRight = channels.length > 1;

    for (let i = 0; i < numSamples; i++) {
      const sampleL = channels[0][i];
      const absL = Math.abs(sampleL);
      if (absL > peakL) peakL = absL;
      sumL += sampleL;
      sumSqL += sampleL * sampleL;
      if (absL >= 0.99) clippedSamples++;

      if (hasRight) {
        const sampleR = channels[1][i];
        const absR = Math.abs(sampleR);
        if (absR > peakR) peakR = absR;
        sumR += sampleR;
        sumSqR += sampleR * sampleR;
        if (absR >= 0.99) clippedSamples++;

        // Mid/Side energy accumulation
        const mid = (sampleL + sampleR) / 2;
        const side = (sampleL - sampleR) / 2;
        sumSqMid += mid * mid;
        sumSqSide += side * side;
      }
    }

    if (!hasRight) {
      peakR = peakL;
      sumR = sumL;
      sumSqR = sumSqL;
      sumSqMid = sumSqL;
      sumSqSide = 0;
    }

    const safeLog10 = (val: number) => val > 0 ? 20 * Math.log10(val) : -100;

    return {
      peakL: safeLog10(peakL),
      peakR: safeLog10(peakR),
      rmsL: safeLog10(Math.sqrt(sumSqL / numSamples)),
      rmsR: safeLog10(Math.sqrt(sumSqR / numSamples)),
      rmsMid: safeLog10(Math.sqrt(sumSqMid / numSamples)),
      rmsSide: safeLog10(Math.sqrt(sumSqSide / numSamples)),
      dcOffsetL: sumL / numSamples,
      dcOffsetR: sumR / numSamples,
      clippedSamples,
      totalSamples: numSamples * channels.length,
    };
  }

  /**
   * Detect silent sections
   */
  private detectSilence(samples: Float32Array, sampleRate: number): any[] {
    const threshold = -60; // dBFS
    const minDuration = 0.5; // seconds
    const silentSections: any[] = [];

    let inSilence = false;
    let silenceStart = 0;

    const hopSize = sampleRate * 0.1; // 100ms

    for (let i = 0; i < samples.length; i += hopSize) {
      let rms = 0;
      for (let j = 0; j < hopSize && i + j < samples.length; j++) {
        rms += samples[i + j] * samples[i + j];
      }
      rms = Math.sqrt(rms / hopSize);
      const level = rms > 0 ? 20 * Math.log10(rms) : -100;

      if (level < threshold && !inSilence) {
        inSilence = true;
        silenceStart = i / sampleRate;
      } else if (level >= threshold && inSilence) {
        const duration = i / sampleRate - silenceStart;
        if (duration >= minDuration) {
          silentSections.push({
            startTime: silenceStart,
            endTime: i / sampleRate,
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
   * Detect audio issues
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
   * Calculate overall quality score
   */
  private calculateQualityScore(issues: AudioIssue[], clippingData: any, snr: number): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Bonus for good SNR
    if (snr > 60) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate mastering suggestions based on analysis
   */
  private generateMasteringSuggestions(
    frequency: FrequencyAnalysis,
    loudness: LoudnessAnalysis,
    quality: QualityMetrics,
    stereo: StereoAnalysis
  ): MasteringSuggestions {
    const eqSuggestions: EQSuggestion[] = [];
    const recommendations: string[] = [];

    // Check if bass is too heavy
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

    // Check for harsh highs
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

    // Suggest high-pass filter
    eqSuggestions.push({
      frequency: 30,
      type: 'highpass',
      gain: 0,
      q: 0.7,
      reason: 'Remove subsonic content',
    });

    // Loudness normalization
    const needsNormalization = Math.abs(loudness.integratedLUFS - (-14)) > 3;
    let targetLUFS = -14;

    if (loudness.integratedLUFS < -20) {
      recommendations.push('Increase overall loudness with compression and limiting');
    } else if (loudness.integratedLUFS > -10) {
      recommendations.push('Reduce overall loudness to prevent over-compression');
      targetLUFS = -14;
    }

    // Compression suggestion
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

    // Limiting suggestion
    const limitingSuggestion: LimitingSuggestion = {
      threshold: -1,
      ceiling: -0.3,
      release: 50,
      reason: 'Prevent clipping and achieve competitive loudness',
    };

    // Stereo enhancement
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

    // Quality-based recommendations
    if (quality.clipping) {
      recommendations.push('Remove clipping with repair tools or re-record');
    }

    if (quality.snr < 40) {
      recommendations.push('Apply noise reduction to improve signal clarity');
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
   * Convert multi-channel audio to mono
   */
  private convertToMono(channels: Float32Array[]): Float32Array {
    if (channels.length === 1) {
      return channels[0];
    }

    const mono = new Float32Array(channels[0].length);
    for (let i = 0; i < mono.length; i++) {
      let sum = 0;
      for (const channel of channels) {
        sum += channel[i];
      }
      mono[i] = sum / channels.length;
    }

    return mono;
  }

  /**
   * Export analysis results as JSON
   */
  exportAsJSON(analysis: AudioAnalysisResult): string {
    return JSON.stringify(analysis, null, 2);
  }

  /**
   * Export analysis results as formatted text
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
