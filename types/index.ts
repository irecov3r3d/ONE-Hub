// Core type definitions for the song generator platform

export interface Song {
  id: string;
  title: string;
  prompt: string;
  genre: string;
  mood: string;
  duration: number;
  audioUrl: string;
  createdAt: Date;
  updatedAt: Date;

  // Extended metadata
  bpm?: number;
  key?: string;
  timeSignature?: string;
  tags?: string[];

  // File references
  projectData?: ProjectData;
  stems?: StemFiles;
  lyrics?: LyricsData;
  albumArt?: string;
  videoUrl?: string;
}

export interface ProjectData {
  id: string;
  songId: string;
  version: number;

  // Original uploads
  uploads?: UploadedFile[];

  // Processing history
  processedFiles?: ProcessedFile[];

  // Edit history
  edits?: EditOperation[];

  // Export settings
  exportSettings?: ExportSettings;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'vocal' | 'instrumental' | 'sample' | 'reference' | 'lyrics';
  format: string;
  size: number;
  url: string;
  duration?: number;
  uploadedAt: Date;
}

export interface ProcessedFile {
  id: string;
  sourceFileId: string;
  processType: 'stem-separation' | 'style-transfer' | 'extension' | 'variation' | 'mastering';
  url: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface StemFiles {
  vocals?: string;
  drums?: string;
  bass?: string;
  other?: string;
  piano?: string;
  guitar?: string;
}

export interface LyricsData {
  id: string;
  songId: string;
  text: string;
  language: string;
  sections?: LyricSection[];
  timestamps?: LyricTimestamp[];
  generatedBy?: 'ai' | 'user' | 'upload';
}

export interface LyricSection {
  type: 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'outro' | 'intro';
  text: string;
  startTime?: number;
  endTime?: number;
}

export interface LyricTimestamp {
  text: string;
  time: number;
}

export interface EditOperation {
  id: string;
  type: 'trim' | 'fade' | 'effect' | 'pitch' | 'tempo' | 'volume' | 'mix';
  timestamp: Date;
  parameters: Record<string, any>;
  appliedTo?: string; // file ID or 'master'
}

export interface AudioEffect {
  id: string;
  type: 'reverb' | 'delay' | 'eq' | 'compression' | 'distortion' | 'chorus' | 'phaser';
  parameters: Record<string, number>;
  enabled: boolean;
}

export interface ExportSettings {
  format: 'mp3' | 'wav' | 'flac' | 'ogg' | 'm4a';
  quality: '128' | '192' | '256' | '320' | 'lossless';
  sampleRate: 44100 | 48000 | 96000;
  includeStems: boolean;
  includeLyrics: boolean;
  includeVideo: boolean;
}

export interface GenerationRequest {
  // Text-based generation
  prompt?: string;
  genre: string;
  mood: string;
  duration: number;

  // Advanced options
  bpm?: number;
  key?: string;
  timeSignature?: string;
  instruments?: string[];

  // File-based generation
  referenceTrack?: string; // file ID
  vocals?: string; // file ID
  styleSource?: string; // file ID

  // Lyrics
  lyrics?: string;
  generateLyrics?: boolean;
  lyricsTheme?: string;
  lyricsLanguage?: string;

  // AI options
  variations?: number;
  creativity?: number; // 0-1
  extendFrom?: string; // song ID to extend
}

export interface ProcessingJob {
  id: string;
  type: 'generation' | 'stem-separation' | 'style-transfer' | 'mastering' | 'video-generation';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export interface VisualizerSettings {
  type: 'waveform' | 'spectrum' | 'bars' | 'particles' | 'circular';
  colorScheme: string[];
  backgroundColor: string;
  resolution: '720p' | '1080p' | '4k';
  fps: 30 | 60;
}

export interface AlbumArtSettings {
  style: 'abstract' | 'realistic' | 'minimalist' | 'vintage' | 'modern';
  prompt?: string;
  colorPalette?: string[];
  aspectRatio: '1:1' | '16:9' | '4:5';
}

// Comprehensive Audio Analysis Types

export interface AudioAnalysisResult {
  // File Information
  fileInfo: AudioFileInfo;

  // Temporal Analysis
  temporal: TemporalAnalysis;

  // Frequency Analysis
  frequency: FrequencyAnalysis;

  // Loudness & Dynamics
  loudness: LoudnessAnalysis;

  // Musical Features
  musical: MusicalAnalysis;

  // Stereo Field
  stereo: StereoAnalysis;

  // Harmonic Analysis
  harmonic: HarmonicAnalysis;

  // Spectral Data (for recreation)
  spectral: SpectralData;

  // Quality Metrics
  quality: QualityMetrics;

  // Mastering Suggestions
  masteringSuggestions?: MasteringSuggestions;
}

export interface AudioFileInfo {
  fileName: string;
  format: string;
  duration: number; // seconds
  sampleRate: number; // Hz
  bitDepth: number; // bits
  bitrate: number; // kbps
  channels: number;
  fileSize: number; // bytes
  codec?: string;
}

export interface TemporalAnalysis {
  bpm: number;
  bpmConfidence: number; // 0-1
  timeSignature: {
    numerator: number;
    denominator: number;
    confidence: number;
  };
  beats: number[]; // beat timestamps in seconds
  downbeats: number[]; // downbeat timestamps
  sections: AudioSection[];
  onsets: number[]; // onset detection timestamps
}

export interface AudioSection {
  startTime: number;
  endTime: number;
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'breakdown' | 'drop' | 'outro' | 'unknown';
  energy: number; // 0-1
  avgLoudness: number; // LUFS
}

export interface FrequencyAnalysis {
  // Full spectrum breakdown
  spectrum: FrequencyBand[];

  // Frequency distribution
  subBass: FrequencyBandDetail; // 20-60 Hz
  bass: FrequencyBandDetail; // 60-250 Hz
  lowMids: FrequencyBandDetail; // 250-500 Hz
  mids: FrequencyBandDetail; // 500-2000 Hz
  highMids: FrequencyBandDetail; // 2000-4000 Hz
  presence: FrequencyBandDetail; // 4000-6000 Hz
  brilliance: FrequencyBandDetail; // 6000-20000 Hz

  // Spectral characteristics
  spectralCentroid: number; // Hz - brightness indicator
  spectralRolloff: number; // Hz
  spectralFlux: number; // measure of change
  spectralFlatness: number; // 0-1, noisiness indicator

  // Peak frequencies
  dominantFrequencies: DominantFrequency[];
}

export interface FrequencyBand {
  frequency: number; // Hz
  magnitude: number; // dB
  phase: number; // radians
}

export interface FrequencyBandDetail {
  range: [number, number]; // [min, max] Hz
  avgMagnitude: number; // dB
  peakMagnitude: number; // dB
  rmsEnergy: number; // dB
  percentage: number; // % of total energy
}

export interface DominantFrequency {
  frequency: number; // Hz
  magnitude: number; // dB
  note?: string; // musical note (e.g., "A4")
  harmonic?: number; // harmonic number if applicable
}

export interface LoudnessAnalysis {
  // Integrated Loudness (EBU R128 / ITU-R BS.1770)
  integratedLUFS: number;
  loudnessRange: number; // LRA

  // Momentary & Short-term
  momentaryMaxLUFS: number;
  shortTermMaxLUFS: number;

  // Peak levels
  truePeakL: number; // dBTP
  truePeakR: number; // dBTP
  truePeakMax: number; // dBTP

  // RMS Levels
  rmsL: number; // dB
  rmsR: number; // dB
  rmsMid: number; // dB
  rmsSide: number; // dB

  // Peak Levels (sample peak)
  peakL: number; // dBFS
  peakR: number; // dBFS

  // Crest Factor
  crestFactor: number; // dB

  // Dynamic Range
  dynamicRange: number; // dB

  // Loudness over time
  loudnessOverTime: LoudnessPoint[];
}

export interface LoudnessPoint {
  time: number; // seconds
  lufs: number;
  peak: number; // dBFS
}

export interface MusicalAnalysis {
  // Key detection
  key: string; // e.g., "C Major", "A Minor"
  keyConfidence: number; // 0-1

  // Scale/Mode
  scale: string; // e.g., "Major", "Minor", "Dorian"

  // Tempo variations
  tempoStability: number; // 0-1
  tempoChanges: TempoChange[];

  // Pitch content
  pitchClasses: PitchClass[];

  // Rhythm
  rhythmComplexity: number; // 0-1
  syncopation: number; // 0-1

  // Energy & Mood
  energy: number; // 0-1
  danceability: number; // 0-1
  valence: number; // 0-1 (musical positiveness)
  acousticness: number; // 0-1
  instrumentalness: number; // 0-1 (likelihood of no vocals)
}

export interface TempoChange {
  time: number; // seconds
  bpm: number;
  confidence: number;
}

export interface PitchClass {
  note: string; // "C", "C#", "D", etc.
  strength: number; // 0-1
  frequency: number; // Hz
}

export interface StereoAnalysis {
  // Stereo Width
  stereoWidth: number; // 0-200% (100% = normal)

  // Correlation
  phaseCorrelation: number; // -1 to +1 (1 = mono, 0 = stereo, -1 = out of phase)

  // Balance
  panBalance: number; // -100 to +100 (0 = centered)

  // Mid/Side Analysis
  midSideRatio: number;
  sideContent: number; // % of side signal

  // Spatial characteristics
  stereoField: StereoField[];
}

export interface StereoField {
  frequency: number; // Hz
  width: number; // stereo width at this frequency
  correlation: number; // phase correlation
}

export interface HarmonicAnalysis {
  // Fundamental frequency
  fundamentalFreq: number; // Hz

  // Harmonics
  harmonics: Harmonic[];

  // Harmonic characteristics
  harmonicToNoiseRatio: number; // dB
  thd: number; // Total Harmonic Distortion %

  // Inharmonicity
  inharmonicity: number; // 0-1

  // Timbre
  spectralContrast: number[];
  mfcc: number[]; // Mel-frequency cepstral coefficients
}

export interface Harmonic {
  number: number; // harmonic number (1 = fundamental)
  frequency: number; // Hz
  magnitude: number; // dB
  phase: number; // radians
}

export interface SpectralData {
  // Time-frequency representation
  spectrogram: SpectrogramData;

  // Detailed frequency bins for reconstruction
  frequencyBins: FrequencyBin[];

  // Window size and overlap used
  fftSize: number;
  hopSize: number;
  windowType: string;

  // Sampling info
  sampleRate: number;
  nyquistFreq: number;
}

export interface SpectrogramData {
  times: number[]; // time axis in seconds
  frequencies: number[]; // frequency axis in Hz
  magnitudes: number[][]; // 2D array [time][frequency]
  phases?: number[][]; // phase information for reconstruction
}

export interface FrequencyBin {
  frequency: number;
  magnitude: number;
  phase: number;
  time: number;
}

export interface QualityMetrics {
  // Clipping detection
  clipping: boolean;
  clippedSamples: number;
  clippingPercentage: number;

  // Noise floor
  noiseFloor: number; // dBFS

  // Signal-to-Noise Ratio
  snr: number; // dB

  // Bit depth utilization
  bitDepthUtilization: number; // %

  // DC Offset
  dcOffsetL: number;
  dcOffsetR: number;

  // Gaps/Silence
  silentSections: SilentSection[];

  // Overall quality score
  qualityScore: number; // 0-100

  // Issues detected
  issues: AudioIssue[];
}

export interface SilentSection {
  startTime: number;
  endTime: number;
  duration: number;
  threshold: number; // dBFS
}

export interface AudioIssue {
  type: 'clipping' | 'dc-offset' | 'phase-issues' | 'noise' | 'low-bitdepth' | 'silence';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: number; // time in seconds
  suggestion?: string;
}

export interface MasteringSuggestions {
  // Recommended processing
  needsNormalization: boolean;
  targetLUFS: number;

  // EQ Suggestions
  eqSuggestions: EQSuggestion[];

  // Compression
  compressionSuggestion?: CompressionSuggestion;

  // Limiting
  limitingSuggestion?: LimitingSuggestion;

  // Stereo enhancement
  stereoEnhancement?: StereoEnhancement;

  // Overall recommendations
  recommendations: string[];
}

export interface EQSuggestion {
  frequency: number; // Hz
  type: 'bell' | 'shelf' | 'highpass' | 'lowpass' | 'notch';
  gain: number; // dB
  q: number; // Q factor
  reason: string;
}

export interface CompressionSuggestion {
  threshold: number; // dB
  ratio: number;
  attack: number; // ms
  release: number; // ms
  knee: number; // dB
  makeupGain: number; // dB
  reason: string;
}

export interface LimitingSuggestion {
  threshold: number; // dB
  ceiling: number; // dB
  release: number; // ms
  reason: string;
}

export interface StereoEnhancement {
  widthAdjustment: number; // % change
  midSideProcessing: boolean;
  reason: string;
}

// Mastering Tool Settings

export interface MasteringSettings {
  // Target loudness
  targetLUFS: number;
  truePeakLimit: number; // dBTP

  // EQ Chain
  eqBands: EQBand[];

  // Dynamics Processing
  compression: CompressionSettings[];
  limiting: LimiterSettings;

  // Stereo Processing
  stereoWidth: number; // %
  midSideProcessing: MidSideSettings;

  // Enhancement
  exciter?: ExciterSettings;
  saturation?: SaturationSettings;

  // Dithering (for bit depth reduction)
  dithering?: DitheringSettings;
}

export interface EQBand {
  id: string;
  enabled: boolean;
  frequency: number; // Hz
  gain: number; // dB
  q: number;
  type: 'bell' | 'lowShelf' | 'highShelf' | 'lowPass' | 'highPass' | 'notch';
}

export interface CompressionSettings {
  id: string;
  enabled: boolean;
  threshold: number; // dB
  ratio: number;
  attack: number; // ms
  release: number; // ms
  knee: number; // dB
  makeupGain: number; // dB
  sidechain?: SidechainSettings;
}

export interface LimiterSettings {
  enabled: boolean;
  threshold: number; // dB
  ceiling: number; // dB
  release: number; // ms
  lookahead: number; // ms
  oversampling: number; // 1x, 2x, 4x, 8x
}

export interface MidSideSettings {
  enabled: boolean;
  midGain: number; // dB
  sideGain: number; // dB
  stereoWidth: number; // %
}

export interface SidechainSettings {
  enabled: boolean;
  sourceFrequency?: number; // Hz for frequency-specific sidechain
  filterType?: 'lowpass' | 'highpass' | 'bandpass';
}

export interface ExciterSettings {
  enabled: boolean;
  amount: number; // %
  harmonics: number; // 2nd, 3rd, etc.
  mix: number; // %
}

export interface SaturationSettings {
  enabled: boolean;
  type: 'tape' | 'tube' | 'transistor' | 'digital';
  drive: number; // %
  mix: number; // %
}

export interface DitheringSettings {
  enabled: boolean;
  type: 'triangular' | 'shaped' | 'none';
  depth: 16 | 24;
  noiseShaping: boolean;
}
