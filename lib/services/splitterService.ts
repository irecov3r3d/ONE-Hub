// Auto-Splitter Service for Social Media Clips
// Advanced detection of optimal split points using multiple audio analysis methods

import type {
  SocialPlatform,
  PlatformPreset,
  SplitPoint,
  Segment,
  SegmentFeatures,
  SplitterSettings,
  SplitterJob,
  SplitResult,
  ExportedSegment,
  AudioAnalysis,
  TimeRange,
  Peak,
} from '@/types';

// Social Media Platform Presets
export const PLATFORM_PRESETS: Record<SocialPlatform, PlatformPreset> = {
  'tiktok': {
    id: 'tiktok',
    name: 'TikTok',
    maxDuration: 180,
    recommendedDuration: 30,
    aspectRatio: '9:16',
    description: 'Short-form vertical video, 15-60 seconds performs best',
  },
  'instagram-reels': {
    id: 'instagram-reels',
    name: 'Instagram Reels',
    maxDuration: 90,
    recommendedDuration: 30,
    aspectRatio: '9:16',
    description: 'Vertical video, 15-30 seconds for maximum reach',
  },
  'youtube-shorts': {
    id: 'youtube-shorts',
    name: 'YouTube Shorts',
    maxDuration: 60,
    recommendedDuration: 45,
    aspectRatio: '9:16',
    description: 'Vertical video up to 60 seconds',
  },
  'twitter': {
    id: 'twitter',
    name: 'Twitter/X',
    maxDuration: 140,
    recommendedDuration: 45,
    aspectRatio: '16:9',
    description: 'Horizontal or square video, under 2:20',
  },
  'facebook': {
    id: 'facebook',
    name: 'Facebook',
    maxDuration: 240,
    recommendedDuration: 60,
    aspectRatio: '1:1',
    description: 'Square video performs best, 1-2 minutes',
  },
  'custom': {
    id: 'custom',
    name: 'Custom',
    maxDuration: 300,
    recommendedDuration: 60,
    aspectRatio: '16:9',
    description: 'Custom settings for any platform',
  },
};

// Default splitter settings
export const DEFAULT_SPLITTER_SETTINGS: SplitterSettings = {
  detectionMethod: 'auto',
  sensitivityThreshold: 50,
  silenceThreshold: -35,
  minSilenceDuration: 0.3,
  beatSensitivity: 60,
  targetPlatform: 'tiktok',
  minSegmentDuration: 15,
  maxSegmentDuration: 60,
  prioritizeEngagement: true,
  avoidSilence: true,
  crossfadeDuration: 0.5,
  fadeInDuration: 0.2,
  fadeOutDuration: 0.5,
  outputFormat: 'mp4',
  outputQuality: 'high',
  includeVisualizer: false,
};

// ============================================
// Advanced Audio Analysis Types
// ============================================

interface LoudnessAnalysis {
  lufs: number[];           // Loudness units (LUFS) over time
  rms: number[];            // RMS energy over time
  peak: number[];           // Peak amplitude over time
  dynamicRange: number;     // Overall dynamic range
  averageLoudness: number;  // Average LUFS
}

interface SpectralAnalysis {
  spectralFlux: number[];      // Rate of spectral change (sudden shifts)
  spectralCentroid: number[];  // Brightness/tonal center
  spectralRolloff: number[];   // High frequency content
  zeroCrossingRate: number[];  // Percussion/noise detection
}

interface StructureAnalysis {
  sections: { start: number; end: number; type: string; energy: number }[];
  transitions: { time: number; type: string; strength: number }[];
  drops: { time: number; intensity: number }[];
  builds: { start: number; end: number; intensity: number }[];
}

interface EnhancedAudioAnalysis extends AudioAnalysis {
  loudness: LoudnessAnalysis;
  spectral: SpectralAnalysis;
  structure: StructureAnalysis;
}

export class SplitterService {
  /**
   * Analyze audio/video with advanced detection methods
   * Detects loudness shifts, spectral changes, and structural elements
   */
  static async analyzeMedia(mediaUrl: string): Promise<EnhancedAudioAnalysis> {
    await this.simulateProcessing(3000);

    const duration = 300; // 5 minutes example
    const samplePoints = 1000;
    const framesPerSecond = samplePoints / duration;

    // Generate comprehensive audio analysis
    const waveform = this.generateRealisticWaveform(samplePoints, duration);
    const energyProfile = this.generateRealisticEnergyProfile(samplePoints, duration);

    // Advanced loudness analysis
    const loudness = this.analyzeLoudness(waveform, energyProfile, samplePoints);

    // Spectral analysis for detecting shifts
    const spectral = this.analyzeSpectral(samplePoints, duration);

    // Structural analysis for song sections
    const structure = this.analyzeStructure(energyProfile, loudness, spectral, duration);

    // Beat detection
    const beatMarkers = this.detectBeats(energyProfile, spectral, duration);

    // Silence detection using loudness
    const silenceRegions = this.detectSilenceFromLoudness(loudness, duration);

    // Peak detection
    const peaks = this.detectPeaksAdvanced(loudness, spectral, duration);

    return {
      duration,
      sampleRate: 44100,
      channels: 2,
      bitrate: 320000,
      waveform,
      energyProfile,
      beatMarkers,
      bpm: this.estimateBPM(beatMarkers),
      silenceRegions,
      peaks,
      loudness,
      spectral,
      structure,
    };
  }

  /**
   * Detect optimal split points using advanced analysis
   */
  static async detectSplitPoints(
    analysis: EnhancedAudioAnalysis,
    settings: SplitterSettings
  ): Promise<SplitPoint[]> {
    await this.simulateProcessing(1000);

    switch (settings.detectionMethod) {
      case 'beat':
        return this.detectBeatBasedSplits(analysis.beatMarkers, analysis.duration, settings);
      case 'energy':
        return this.detectEnergyBasedSplits(analysis as EnhancedAudioAnalysis, settings);
      case 'silence':
        return this.detectSilenceBasedSplits(analysis.silenceRegions, analysis.duration, settings);
      case 'auto':
      default:
        return this.detectAutoSplitsAdvanced(analysis as EnhancedAudioAnalysis, settings);
    }
  }

  /**
   * Advanced auto-detection using all analysis methods
   */
  private static detectAutoSplitsAdvanced(
    analysis: EnhancedAudioAnalysis,
    settings: SplitterSettings
  ): SplitPoint[] {
    const { duration, loudness, spectral, structure, beatMarkers, silenceRegions } = analysis;
    const { minSegmentDuration, maxSegmentDuration, sensitivityThreshold } = settings;

    const candidates: SplitPoint[] = [];
    const sensitivity = sensitivityThreshold / 100;

    // 1. HIGHEST PRIORITY: Structural transitions (verse→chorus, etc.)
    for (const transition of structure.transitions) {
      if (transition.strength > 0.5 * sensitivity) {
        candidates.push({
          id: crypto.randomUUID(),
          time: transition.time,
          type: 'auto',
          confidence: Math.min(0.95, transition.strength + 0.2),
          reason: 'transition',
          label: `${transition.type} transition`,
        });
      }
    }

    // 2. HIGH PRIORITY: Beat drops and energy drops
    for (const drop of structure.drops) {
      if (drop.intensity > 0.4 * sensitivity) {
        candidates.push({
          id: crypto.randomUUID(),
          time: drop.time,
          type: 'auto',
          confidence: Math.min(0.9, drop.intensity + 0.15),
          reason: 'beat-drop',
          label: `Energy drop (${Math.round(drop.intensity * 100)}%)`,
        });
      }
    }

    // 3. HIGH PRIORITY: Loudness shifts (LUFS changes)
    const loudnessShifts = this.detectLoudnessShifts(loudness, duration, sensitivity);
    for (const shift of loudnessShifts) {
      candidates.push({
        id: crypto.randomUUID(),
        time: shift.time,
        type: 'auto',
        confidence: shift.magnitude,
        reason: shift.direction === 'drop' ? 'beat-drop' : 'energy-peak',
        label: `Loudness ${shift.direction} (${shift.lufsChange.toFixed(1)} LUFS)`,
      });
    }

    // 4. MEDIUM PRIORITY: Spectral flux peaks (sudden timbral changes)
    const spectralShifts = this.detectSpectralShifts(spectral, duration, sensitivity);
    for (const shift of spectralShifts) {
      candidates.push({
        id: crypto.randomUUID(),
        time: shift.time,
        type: 'auto',
        confidence: Math.min(0.85, shift.magnitude),
        reason: 'transition',
        label: `Tonal shift`,
      });
    }

    // 5. MEDIUM PRIORITY: Silence regions
    for (const silence of silenceRegions) {
      const midPoint = silence.start + silence.duration / 2;
      candidates.push({
        id: crypto.randomUUID(),
        time: midPoint,
        type: 'auto',
        confidence: Math.min(0.9, 0.6 + silence.duration),
        reason: 'silence',
        label: `Silence (${(silence.duration * 1000).toFixed(0)}ms)`,
      });
    }

    // 6. LOWER PRIORITY: Strong beat markers (downbeats of measures)
    const strongBeats = this.findStrongBeats(beatMarkers, analysis.bpm || 120);
    for (const beat of strongBeats) {
      if (beat.time > minSegmentDuration && beat.time < duration - minSegmentDuration) {
        candidates.push({
          id: crypto.randomUUID(),
          time: beat.time,
          type: 'auto',
          confidence: 0.5 + beat.strength * 0.3,
          reason: 'transition',
          label: `Downbeat`,
        });
      }
    }

    // 7. Score, deduplicate, and select optimal splits
    return this.selectOptimalSplitsAdvanced(candidates, duration, settings);
  }

  /**
   * Detect loudness shifts (significant LUFS changes)
   */
  private static detectLoudnessShifts(
    loudness: LoudnessAnalysis,
    duration: number,
    sensitivity: number
  ): { time: number; magnitude: number; lufsChange: number; direction: 'drop' | 'rise' }[] {
    const shifts: { time: number; magnitude: number; lufsChange: number; direction: 'drop' | 'rise' }[] = [];
    const windowSize = Math.floor(loudness.lufs.length / 50); // ~2% of track
    const threshold = 3 * sensitivity; // LUFS change threshold

    for (let i = windowSize; i < loudness.lufs.length - windowSize; i++) {
      const before = loudness.lufs.slice(i - windowSize, i);
      const after = loudness.lufs.slice(i, i + windowSize);

      const avgBefore = before.reduce((a, b) => a + b, 0) / before.length;
      const avgAfter = after.reduce((a, b) => a + b, 0) / after.length;
      const lufsChange = avgAfter - avgBefore;

      if (Math.abs(lufsChange) > threshold) {
        const time = (i / loudness.lufs.length) * duration;
        shifts.push({
          time,
          magnitude: Math.min(1, Math.abs(lufsChange) / 10),
          lufsChange,
          direction: lufsChange < 0 ? 'drop' : 'rise',
        });
      }
    }

    // Merge nearby shifts
    return this.mergeNearbyEvents(shifts, duration * 0.02);
  }

  /**
   * Detect spectral shifts (timbral/tonal changes)
   */
  private static detectSpectralShifts(
    spectral: SpectralAnalysis,
    duration: number,
    sensitivity: number
  ): { time: number; magnitude: number }[] {
    const shifts: { time: number; magnitude: number }[] = [];
    const threshold = 0.3 * sensitivity;

    // Find peaks in spectral flux (rate of spectral change)
    for (let i = 1; i < spectral.spectralFlux.length - 1; i++) {
      const current = spectral.spectralFlux[i];
      const prev = spectral.spectralFlux[i - 1];
      const next = spectral.spectralFlux[i + 1];

      // Local maximum above threshold
      if (current > prev && current > next && current > threshold) {
        const time = (i / spectral.spectralFlux.length) * duration;
        shifts.push({ time, magnitude: current });
      }
    }

    return this.mergeNearbyEvents(shifts, duration * 0.02);
  }

  /**
   * Find strong beats (downbeats, phrase starts)
   */
  private static findStrongBeats(
    beatMarkers: number[],
    bpm: number
  ): { time: number; strength: number }[] {
    const beatsPerMeasure = 4;
    const beatsPerPhrase = 16; // Typical 4-bar phrase

    return beatMarkers
      .filter((_, i) => i % beatsPerMeasure === 0) // Downbeats only
      .map((time, i) => ({
        time,
        strength: i % (beatsPerPhrase / beatsPerMeasure) === 0 ? 1 : 0.6, // Phrase starts stronger
      }));
  }

  /**
   * Advanced split selection with scoring
   */
  private static selectOptimalSplitsAdvanced(
    candidates: SplitPoint[],
    duration: number,
    settings: SplitterSettings
  ): SplitPoint[] {
    const { maxSegmentDuration, minSegmentDuration } = settings;

    // Remove duplicates (within 1 second of each other)
    const deduplicated = this.deduplicateCandidates(candidates, 1.0);

    // Sort by confidence first, then time
    deduplicated.sort((a, b) => b.confidence - a.confidence);

    // Greedily select high-confidence splits that respect constraints
    const selected: SplitPoint[] = [];
    const targetSegments = Math.ceil(duration / maxSegmentDuration);

    for (const candidate of deduplicated) {
      if (selected.length >= targetSegments) break;

      // Check if this candidate creates valid segments
      const allTimes = [0, ...selected.map(s => s.time), duration].sort((a, b) => a - b);
      const insertIdx = allTimes.findIndex(t => t > candidate.time);
      const prevTime = allTimes[insertIdx - 1] || 0;
      const nextTime = allTimes[insertIdx] || duration;

      const segmentBefore = candidate.time - prevTime;
      const segmentAfter = nextTime - candidate.time;

      if (
        segmentBefore >= minSegmentDuration &&
        segmentAfter >= minSegmentDuration &&
        segmentBefore <= maxSegmentDuration * 1.5 &&
        segmentAfter <= maxSegmentDuration * 1.5
      ) {
        selected.push(candidate);
      }
    }

    // Fill gaps if we don't have enough splits
    const gaps = this.findGaps(selected, duration, maxSegmentDuration, minSegmentDuration);
    for (const gap of gaps) {
      selected.push({
        id: crypto.randomUUID(),
        time: gap,
        type: 'auto',
        confidence: 0.4,
        reason: 'transition',
        label: 'Auto-fill',
      });
    }

    // Sort by time for final output
    selected.sort((a, b) => a.time - b.time);

    return selected;
  }

  /**
   * Create segments with enhanced feature analysis
   */
  static async createSegments(
    splitPoints: SplitPoint[],
    analysis: EnhancedAudioAnalysis,
    settings: SplitterSettings
  ): Promise<Segment[]> {
    await this.simulateProcessing(500);

    const { duration, energyProfile, waveform, loudness, spectral, structure } = analysis;
    const segments: Segment[] = [];
    const times = [0, ...splitPoints.map(sp => sp.time), duration];

    for (let i = 0; i < times.length - 1; i++) {
      const startTime = times[i];
      const endTime = times[i + 1];
      const segmentDuration = endTime - startTime;

      const features = this.calculateEnhancedFeatures(
        startTime,
        endTime,
        analysis
      );

      const score = this.calculateEnhancedEngagementScore(features, settings);

      segments.push({
        id: crypto.randomUUID(),
        startTime,
        endTime,
        duration: segmentDuration,
        score,
        features,
        selected: score >= 50,
      });
    }

    if (settings.prioritizeEngagement) {
      segments.sort((a, b) => b.score - a.score);
    }

    return segments;
  }

  /**
   * Calculate enhanced segment features
   */
  private static calculateEnhancedFeatures(
    startTime: number,
    endTime: number,
    analysis: EnhancedAudioAnalysis
  ): SegmentFeatures {
    const { duration, energyProfile, waveform, loudness, spectral, structure } = analysis;

    const startIdx = Math.floor((startTime / duration) * energyProfile.length);
    const endIdx = Math.floor((endTime / duration) * energyProfile.length);

    const segmentEnergy = energyProfile.slice(startIdx, endIdx);
    const segmentLoudness = loudness.lufs.slice(startIdx, endIdx);
    const segmentSpectral = spectral.spectralCentroid.slice(startIdx, endIdx);

    const avgEnergy = segmentEnergy.reduce((a, b) => a + b, 0) / segmentEnergy.length;
    const peakEnergy = Math.max(...segmentEnergy);

    // Calculate loudness variation (dynamic segments are more engaging)
    const loudnessVariation = this.calculateVariance(segmentLoudness);

    // Check for beat drops in this segment
    const hasBeatDrop = structure.drops.some(
      d => d.time >= startTime && d.time <= endTime && d.intensity > 0.5
    );

    // Check for builds (tension building = engaging)
    const hasBuild = structure.builds.some(
      b => b.start >= startTime && b.end <= endTime
    );

    // Calculate silence ratio
    const silenceThreshold = 0.1;
    const segmentWaveform = waveform.slice(startIdx, endIdx);
    const silentSamples = segmentWaveform.filter(v => v < silenceThreshold).length;
    const silenceRatio = silentSamples / segmentWaveform.length;

    // Spectral brightness (higher = more exciting)
    const avgBrightness = segmentSpectral.reduce((a, b) => a + b, 0) / segmentSpectral.length;

    return {
      avgEnergy,
      peakEnergy,
      hasBeatDrop: hasBeatDrop || hasBuild,
      hasVocals: avgBrightness > 0.4 && avgBrightness < 0.7, // Vocal range approximation
      silenceRatio,
      tempo: analysis.bpm,
    };
  }

  /**
   * Enhanced engagement score calculation
   */
  private static calculateEnhancedEngagementScore(
    features: SegmentFeatures,
    settings: SplitterSettings
  ): number {
    let score = 40; // Base score

    // Energy contribution (0-25 points)
    score += features.avgEnergy * 15;
    score += features.peakEnergy * 10;

    // Beat drops are highly engaging (+20 points)
    if (features.hasBeatDrop) score += 20;

    // Vocals add engagement (+10 points)
    if (features.hasVocals) score += 10;

    // Dynamic range (variation is engaging, +10 points max)
    const dynamicBonus = Math.min(10, features.peakEnergy - features.avgEnergy) * 20;
    score += dynamicBonus;

    // Penalize silence heavily
    if (settings.avoidSilence) {
      score -= features.silenceRatio * 40;
    }

    // Penalize very low energy sections
    if (features.avgEnergy < 0.2) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  // ============================================
  // Analysis Helper Methods
  // ============================================

  private static analyzeLoudness(
    waveform: number[],
    energyProfile: number[],
    samplePoints: number
  ): LoudnessAnalysis {
    // Simulate LUFS calculation (in production, use actual LUFS algorithm)
    const lufs = energyProfile.map(e => -23 + (e * 20)); // Approximate LUFS range
    const rms = energyProfile.map(e => Math.sqrt(e));
    const peak = waveform;

    const averageLoudness = lufs.reduce((a, b) => a + b, 0) / lufs.length;
    const dynamicRange = Math.max(...lufs) - Math.min(...lufs);

    return { lufs, rms, peak, dynamicRange, averageLoudness };
  }

  private static analyzeSpectral(samplePoints: number, duration: number): SpectralAnalysis {
    const spectralFlux: number[] = [];
    const spectralCentroid: number[] = [];
    const spectralRolloff: number[] = [];
    const zeroCrossingRate: number[] = [];

    for (let i = 0; i < samplePoints; i++) {
      const position = i / samplePoints;

      // Simulate spectral flux with peaks at transitions
      const baseFlux = 0.1 + Math.random() * 0.1;
      const transitionPeaks = [0.2, 0.35, 0.5, 0.65, 0.8].some(
        t => Math.abs(position - t) < 0.02
      ) ? 0.6 + Math.random() * 0.3 : 0;
      spectralFlux.push(baseFlux + transitionPeaks);

      // Simulate spectral centroid (brightness)
      spectralCentroid.push(0.3 + Math.sin(position * Math.PI * 4) * 0.2 + Math.random() * 0.1);

      // Simulate rolloff
      spectralRolloff.push(0.5 + Math.random() * 0.2);

      // Simulate ZCR (higher in percussive sections)
      zeroCrossingRate.push(0.2 + Math.random() * 0.3);
    }

    return { spectralFlux, spectralCentroid, spectralRolloff, zeroCrossingRate };
  }

  private static analyzeStructure(
    energyProfile: number[],
    loudness: LoudnessAnalysis,
    spectral: SpectralAnalysis,
    duration: number
  ): StructureAnalysis {
    const sections: { start: number; end: number; type: string; energy: number }[] = [];
    const transitions: { time: number; type: string; strength: number }[] = [];
    const drops: { time: number; intensity: number }[] = [];
    const builds: { start: number; end: number; intensity: number }[] = [];

    // Simulate typical song structure
    const sectionTypes = ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'];
    const sectionDuration = duration / sectionTypes.length;

    for (let i = 0; i < sectionTypes.length; i++) {
      const start = i * sectionDuration;
      const end = (i + 1) * sectionDuration;
      const type = sectionTypes[i];
      const energy = type === 'chorus' ? 0.85 : type === 'verse' ? 0.6 : type === 'bridge' ? 0.5 : 0.4;

      sections.push({ start, end, type, energy });

      // Add transitions between sections
      if (i > 0) {
        const prevType = sectionTypes[i - 1];
        const transitionStrength =
          (prevType === 'verse' && type === 'chorus') ? 0.9 :
          (prevType === 'chorus' && type === 'verse') ? 0.7 :
          (type === 'bridge') ? 0.8 :
          0.5;

        transitions.push({
          time: start,
          type: `${prevType}→${type}`,
          strength: transitionStrength,
        });

        // Add drops before choruses
        if (type === 'chorus') {
          drops.push({
            time: start - 0.5,
            intensity: 0.8 + Math.random() * 0.2,
          });
        }
      }

      // Add builds before drops
      if (type === 'verse' && sectionTypes[i + 1] === 'chorus') {
        builds.push({
          start: end - sectionDuration * 0.3,
          end: end,
          intensity: 0.7,
        });
      }
    }

    return { sections, transitions, drops, builds };
  }

  private static detectBeats(
    energyProfile: number[],
    spectral: SpectralAnalysis,
    duration: number
  ): number[] {
    const bpm = 120 + Math.floor(Math.random() * 30) - 15; // 105-135 BPM
    const beatInterval = 60 / bpm;
    const beats: number[] = [];

    for (let t = 0; t < duration; t += beatInterval) {
      // Add slight timing variations for realism
      const jitter = (Math.random() - 0.5) * 0.02;
      beats.push(t + jitter);
    }

    return beats;
  }

  private static detectSilenceFromLoudness(
    loudness: LoudnessAnalysis,
    duration: number
  ): TimeRange[] {
    const silenceThreshold = -40; // LUFS
    const minSilenceDuration = 0.2;
    const regions: TimeRange[] = [];

    let silenceStart: number | null = null;

    for (let i = 0; i < loudness.lufs.length; i++) {
      const time = (i / loudness.lufs.length) * duration;

      if (loudness.lufs[i] < silenceThreshold) {
        if (silenceStart === null) silenceStart = time;
      } else {
        if (silenceStart !== null) {
          const silenceDuration = time - silenceStart;
          if (silenceDuration >= minSilenceDuration) {
            regions.push({
              start: silenceStart,
              end: time,
              duration: silenceDuration,
            });
          }
          silenceStart = null;
        }
      }
    }

    return regions;
  }

  private static detectPeaksAdvanced(
    loudness: LoudnessAnalysis,
    spectral: SpectralAnalysis,
    duration: number
  ): Peak[] {
    const peaks: Peak[] = [];
    const threshold = 0.7;

    for (let i = 2; i < loudness.rms.length - 2; i++) {
      const current = loudness.rms[i];
      const window = [loudness.rms[i-2], loudness.rms[i-1], loudness.rms[i+1], loudness.rms[i+2]];
      const isLocalMax = window.every(v => current > v);

      if (isLocalMax && current > threshold) {
        const time = (i / loudness.rms.length) * duration;
        peaks.push({
          time,
          amplitude: current,
          type: spectral.zeroCrossingRate[i] > 0.4 ? 'transient' : 'sustained',
        });
      }
    }

    return peaks;
  }

  private static estimateBPM(beatMarkers: number[]): number {
    if (beatMarkers.length < 2) return 120;

    const intervals = [];
    for (let i = 1; i < Math.min(beatMarkers.length, 20); i++) {
      intervals.push(beatMarkers[i] - beatMarkers[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return Math.round(60 / avgInterval);
  }

  // ============================================
  // Utility Methods
  // ============================================

  private static calculateVariance(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squaredDiffs = arr.map(x => Math.pow(x - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / arr.length;
  }

  private static mergeNearbyEvents<T extends { time: number }>(
    events: T[],
    threshold: number
  ): T[] {
    if (events.length === 0) return [];

    events.sort((a, b) => a.time - b.time);
    const merged: T[] = [events[0]];

    for (let i = 1; i < events.length; i++) {
      if (events[i].time - merged[merged.length - 1].time > threshold) {
        merged.push(events[i]);
      }
    }

    return merged;
  }

  private static deduplicateCandidates(
    candidates: SplitPoint[],
    threshold: number
  ): SplitPoint[] {
    candidates.sort((a, b) => a.time - b.time);
    const result: SplitPoint[] = [];

    for (const candidate of candidates) {
      const nearby = result.find(r => Math.abs(r.time - candidate.time) < threshold);
      if (nearby) {
        // Keep the one with higher confidence
        if (candidate.confidence > nearby.confidence) {
          const idx = result.indexOf(nearby);
          result[idx] = candidate;
        }
      } else {
        result.push(candidate);
      }
    }

    return result;
  }

  private static findGaps(
    selected: SplitPoint[],
    duration: number,
    maxDuration: number,
    minDuration: number
  ): number[] {
    const times = [0, ...selected.map(s => s.time).sort((a, b) => a - b), duration];
    const gaps: number[] = [];

    for (let i = 0; i < times.length - 1; i++) {
      const segmentDuration = times[i + 1] - times[i];
      if (segmentDuration > maxDuration * 1.3) {
        // Add split in the middle
        gaps.push(times[i] + segmentDuration / 2);
      }
    }

    return gaps;
  }

  private static generateRealisticWaveform(samplePoints: number, duration: number): number[] {
    const waveform: number[] = [];
    const sectionsCount = 8;
    const sectionSize = samplePoints / sectionsCount;

    for (let i = 0; i < samplePoints; i++) {
      const section = Math.floor(i / sectionSize);
      const sectionProgress = (i % sectionSize) / sectionSize;

      // Different base levels for different sections
      const sectionLevels = [0.3, 0.5, 0.75, 0.5, 0.8, 0.45, 0.85, 0.25];
      const baseLevel = sectionLevels[section] || 0.5;

      // Add realistic variation
      const noise = (Math.random() - 0.5) * 0.15;
      const pulse = Math.sin(i * 0.5) * 0.1;

      waveform.push(Math.max(0.05, Math.min(1, baseLevel + noise + pulse)));
    }

    return waveform;
  }

  private static generateRealisticEnergyProfile(samplePoints: number, duration: number): number[] {
    const energy: number[] = [];
    const sectionsCount = 8;
    const sectionSize = samplePoints / sectionsCount;

    for (let i = 0; i < samplePoints; i++) {
      const section = Math.floor(i / sectionSize);
      const sectionProgress = (i % sectionSize) / sectionSize;

      // Realistic energy levels per section type
      const sectionEnergies = [0.35, 0.55, 0.85, 0.5, 0.9, 0.4, 0.95, 0.3];
      const baseEnergy = sectionEnergies[section] || 0.5;

      // Add builds toward section ends
      const buildUp = section % 2 === 0 ? sectionProgress * 0.15 : 0;

      // Add subtle random variation
      const noise = (Math.random() - 0.5) * 0.08;

      energy.push(Math.max(0.1, Math.min(1, baseEnergy + buildUp + noise)));
    }

    return energy;
  }

  // ============================================
  // Export Methods (unchanged)
  // ============================================

  static async exportSegments(
    mediaUrl: string,
    segments: Segment[],
    settings: SplitterSettings
  ): Promise<SplitResult> {
    const startTime = Date.now();
    const selectedSegments = segments.filter(s => s.selected);
    const exportedSegments: ExportedSegment[] = [];

    for (let i = 0; i < selectedSegments.length; i++) {
      const segment = selectedSegments[i];
      await this.simulateProcessing(500);

      exportedSegments.push({
        id: segment.id,
        index: i + 1,
        url: `/exports/clip_${i + 1}.${settings.outputFormat}`,
        fileName: `clip_${i + 1}_${this.formatTime(segment.startTime)}-${this.formatTime(segment.endTime)}.${settings.outputFormat}`,
        startTime: segment.startTime,
        endTime: segment.endTime,
        duration: segment.duration,
        format: settings.outputFormat,
        fileSize: Math.floor(segment.duration * 128000),
        score: segment.score,
      });
    }

    return {
      jobId: crypto.randomUUID(),
      segments: exportedSegments,
      totalSegments: exportedSegments.length,
      totalDuration: exportedSegments.reduce((sum, s) => sum + s.duration, 0),
      processingTime: Date.now() - startTime,
    };
  }

  static async quickSplit(
    mediaUrl: string,
    platform: SocialPlatform
  ): Promise<SplitResult> {
    const preset = PLATFORM_PRESETS[platform];
    const settings: SplitterSettings = {
      ...DEFAULT_SPLITTER_SETTINGS,
      targetPlatform: platform,
      maxSegmentDuration: preset.recommendedDuration,
      minSegmentDuration: Math.floor(preset.recommendedDuration / 2),
    };

    const analysis = await this.analyzeMedia(mediaUrl);
    const splitPoints = await this.detectSplitPoints(analysis, settings);
    const segments = await this.createSegments(splitPoints, analysis, settings);

    const platformMaxDuration = preset.maxDuration;
    let selectedDuration = 0;

    for (const segment of segments) {
      if (selectedDuration + segment.duration <= platformMaxDuration) {
        segment.selected = true;
        selectedDuration += segment.duration;
      }
    }

    return this.exportSegments(mediaUrl, segments, settings);
  }

  private static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m${secs}s`;
  }

  private static async simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Keep beat/energy/silence methods for manual mode
  private static detectBeatBasedSplits(
    beatMarkers: number[],
    duration: number,
    settings: SplitterSettings
  ): SplitPoint[] {
    const { minSegmentDuration, beatSensitivity } = settings;
    const beatsPerSegment = Math.floor(beatSensitivity / 10) * 4;

    const splits: SplitPoint[] = [];
    let beatCount = 0;
    let lastSplitTime = 0;

    for (const beat of beatMarkers) {
      beatCount++;
      if (beatCount >= beatsPerSegment && beat - lastSplitTime >= minSegmentDuration && beat < duration - minSegmentDuration) {
        splits.push({
          id: crypto.randomUUID(),
          time: beat,
          type: 'auto',
          confidence: 0.8,
          reason: 'beat-drop',
          label: `Beat ${beatCount}`,
        });
        lastSplitTime = beat;
        beatCount = 0;
      }
    }

    return splits;
  }

  private static detectEnergyBasedSplits(
    analysis: EnhancedAudioAnalysis,
    settings: SplitterSettings
  ): SplitPoint[] {
    const { duration, loudness } = analysis;
    const { minSegmentDuration, sensitivityThreshold } = settings;

    const shifts = this.detectLoudnessShifts(loudness, duration, sensitivityThreshold / 100);

    return shifts
      .filter(s => s.time > minSegmentDuration && s.time < duration - minSegmentDuration)
      .map(shift => ({
        id: crypto.randomUUID(),
        time: shift.time,
        type: 'auto' as const,
        confidence: shift.magnitude,
        reason: shift.direction === 'drop' ? 'beat-drop' as const : 'energy-peak' as const,
        label: `Loudness ${shift.direction}`,
      }));
  }

  private static detectSilenceBasedSplits(
    silenceRegions: TimeRange[],
    duration: number,
    settings: SplitterSettings
  ): SplitPoint[] {
    const { minSegmentDuration } = settings;

    return silenceRegions
      .filter(s => {
        const midPoint = s.start + s.duration / 2;
        return midPoint > minSegmentDuration && midPoint < duration - minSegmentDuration;
      })
      .map(silence => ({
        id: crypto.randomUUID(),
        time: silence.start + silence.duration / 2,
        type: 'auto' as const,
        confidence: Math.min(silence.duration * 2, 1),
        reason: 'silence' as const,
        label: `${(silence.duration * 1000).toFixed(0)}ms silence`,
      }));
  }
}

/*
 * PRODUCTION IMPLEMENTATION GUIDE:
 *
 * For real loudness/LUFS analysis, use:
 *
 * 1. ffmpeg loudnorm filter:
 *    ffmpeg -i input.mp3 -af "loudnorm=print_format=json" -f null -
 *
 * 2. Python librosa for advanced analysis:
 *    import librosa
 *    y, sr = librosa.load('audio.mp3')
 *
 *    # RMS energy
 *    rms = librosa.feature.rms(y=y)
 *
 *    # Spectral flux
 *    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
 *
 *    # Beat tracking
 *    tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
 *
 *    # Spectral centroid
 *    cent = librosa.feature.spectral_centroid(y=y, sr=sr)
 *
 *    # Segment detection
 *    bounds = librosa.segment.agglomerative(...)
 *
 * 3. Essentia.js for browser-based analysis:
 *    import { Essentia, EssentiaWASM } from 'essentia.js';
 *    const essentia = new Essentia(EssentiaWASM);
 *
 *    const loudness = essentia.Loudness(audioVector);
 *    const beats = essentia.BeatTrackerMultiFeature(audioVector);
 *    const onset = essentia.OnsetDetection(audioVector);
 */
