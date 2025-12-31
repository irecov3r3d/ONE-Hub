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

// ============================================
// Auto-Splitter Types for Social Media Clips
// ============================================

export type SocialPlatform = 'tiktok' | 'instagram-reels' | 'youtube-shorts' | 'twitter' | 'facebook' | 'custom';

export interface PlatformPreset {
  id: SocialPlatform;
  name: string;
  maxDuration: number; // in seconds
  recommendedDuration: number; // optimal clip length
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5';
  description: string;
}

export interface SplitPoint {
  id: string;
  time: number; // in seconds
  type: 'auto' | 'manual';
  confidence: number; // 0-1, how confident the detection is
  reason?: 'beat-drop' | 'silence' | 'energy-peak' | 'transition' | 'scene-change' | 'user-defined';
  label?: string;
}

export interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  score: number; // 0-100, quality/engagement score
  features: SegmentFeatures;
  selected: boolean;
  outputUrl?: string;
  thumbnailUrl?: string;
}

export interface SegmentFeatures {
  avgEnergy: number; // 0-1
  peakEnergy: number;
  hasBeatDrop: boolean;
  hasVocals: boolean;
  tempo?: number;
  dominantFrequencies?: number[];
  silenceRatio: number; // 0-1, how much silence in segment
}

export interface SplitterSettings {
  // Detection settings
  detectionMethod: 'auto' | 'beat' | 'energy' | 'silence' | 'manual';
  sensitivityThreshold: number; // 0-100
  silenceThreshold: number; // dB, typically -40 to -20
  minSilenceDuration: number; // seconds
  beatSensitivity: number; // 0-100

  // Segment settings
  targetPlatform: SocialPlatform;
  minSegmentDuration: number; // seconds
  maxSegmentDuration: number; // seconds
  preferredSegmentCount?: number;

  // Quality settings
  prioritizeEngagement: boolean; // prefer high-energy segments
  avoidSilence: boolean;
  crossfadeDuration: number; // seconds for transitions
  fadeInDuration: number;
  fadeOutDuration: number;

  // Output settings
  outputFormat: 'mp3' | 'mp4' | 'wav' | 'webm';
  outputQuality: 'low' | 'medium' | 'high' | 'maximum';
  includeVisualizer: boolean;
  visualizerStyle?: VisualizerSettings['type'];
}

export interface SplitterJob {
  id: string;
  mediaUrl: string;
  mediaType: 'audio' | 'video';
  fileName: string;
  totalDuration: number;
  status: 'idle' | 'analyzing' | 'detecting' | 'splitting' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep?: string;
  settings: SplitterSettings;

  // Results
  splitPoints: SplitPoint[];
  segments: Segment[];
  selectedSegments: string[]; // segment IDs

  // Metadata
  createdAt: Date;
  completedAt?: Date;
  error?: string;

  // Audio analysis
  waveformData?: number[];
  energyProfile?: number[];
  beatMarkers?: number[];
}

export interface SplitResult {
  jobId: string;
  segments: ExportedSegment[];
  totalSegments: number;
  totalDuration: number;
  processingTime: number;
}

export interface ExportedSegment {
  id: string;
  index: number;
  url: string;
  fileName: string;
  startTime: number;
  endTime: number;
  duration: number;
  format: string;
  fileSize: number;
  thumbnailUrl?: string;
  score: number;
}

export interface AudioAnalysis {
  duration: number;
  sampleRate: number;
  channels: number;
  bitrate: number;

  // Extracted features
  waveform: number[]; // normalized amplitude values
  energyProfile: number[]; // RMS energy over time
  beatMarkers: number[]; // timestamps of detected beats
  bpm?: number;

  // Silence detection
  silenceRegions: TimeRange[];

  // Peak detection
  peaks: Peak[];

  // Frequency analysis
  spectralCentroid?: number[];
  spectralFlux?: number[];
}

export interface TimeRange {
  start: number;
  end: number;
  duration: number;
}

export interface Peak {
  time: number;
  amplitude: number;
  type: 'transient' | 'sustained' | 'beat';
}
