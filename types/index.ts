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

// Re-export automation types
export * from './automation';
