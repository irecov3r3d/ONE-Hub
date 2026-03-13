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

// Voice Interaction Types
export interface VoiceCommand {
  id: string;
  transcript: string;
  confidence: number;
  timestamp: Date;
  parsed?: ParsedCommand;
  executed: boolean;
  result?: any;
  error?: string;
}

export interface ParsedCommand {
  intent: VoiceIntent;
  action: string;
  parameters: Record<string, any>;
  target?: string; // What component/feature to control
  confidence: number;
}

export type VoiceIntent =
  | 'generate'
  | 'edit'
  | 'play'
  | 'stop'
  | 'navigate'
  | 'adjust'
  | 'export'
  | 'query'
  | 'help'
  | 'beat-maker'
  | 'unknown';

export interface VoiceSettings {
  enabled: boolean;
  language: string;
  continuous: boolean;
  interimResults: boolean;
  autoStart: boolean;
  feedback: 'visual' | 'audio' | 'both' | 'none';
}

export interface AIAssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  context?: Record<string, any>;
  suggestions?: string[];
}

export interface AIAssistantState {
  messages: AIAssistantMessage[];
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  currentContext: Record<string, any>;
}

// Beat Maker Types
export interface BeatPattern {
  id: string;
  name: string;
  section: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro';
  events: BeatEvent[];
  duration: string; // Tone.js time format (e.g., '1m', '4n')
  bpm: number;
}

export interface BeatEvent {
  time: string; // Tone.js time format (e.g., '0:0:0', '0:1:2')
  instrument: BeatInstrument;
  note?: string; // For melodic instruments
  velocity?: number;
  duration?: string;
}

export type BeatInstrument =
  | 'kick'
  | 'snare'
  | 'hihat'
  | 'openHat'
  | 'clap'
  | 'rim'
  | 'bass'
  | 'subBass'
  | 'melody'
  | 'lead'
  | 'pad'
  | 'pluck';

export interface BeatMakerState {
  isPlaying: boolean;
  bpm: number;
  volume: number;
  currentSection: 'verse' | 'chorus' | 'bridge';
  patterns: Record<string, BeatPattern>;
  activePattern: string;
}

export interface BeatExportOptions {
  format: 'audio' | 'midi' | 'pattern-json';
  quality?: string;
  includeMetadata: boolean;
}
