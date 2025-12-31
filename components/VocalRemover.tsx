'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Music2,
  Play,
  Pause,
  Download,
  Upload,
  RefreshCw,
  Volume2,
  VolumeX,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
} from 'lucide-react';

interface VocalRemoverProps {
  uploadedFileUrl?: string;
  onProcessed?: (urls: { vocals?: string; instrumental?: string }) => void;
}

type ProcessingMode = 'remove-vocals' | 'isolate-vocals' | 'both';

interface ProcessingResult {
  mode: ProcessingMode;
  vocals?: string;
  instrumental?: string;
  processingTime: number;
}

export default function VocalRemover({ uploadedFileUrl, onProcessed }: VocalRemoverProps) {
  // File state
  const [mediaUrl, setMediaUrl] = useState<string>(uploadedFileUrl || '');
  const [fileName, setFileName] = useState<string>('');

  // Processing state
  const [mode, setMode] = useState<ProcessingMode>('remove-vocals');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<'original' | 'vocals' | 'instrumental'>('original');
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Comparison mode
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonBalance, setComparisonBalance] = useState(50); // 0 = original, 100 = processed

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode descriptions
  const modeInfo = {
    'remove-vocals': {
      icon: MicOff,
      title: 'Remove Vocals',
      description: 'Extract instrumental/karaoke version',
      outputLabel: 'Instrumental',
      color: 'from-blue-500 to-cyan-500',
    },
    'isolate-vocals': {
      icon: Mic,
      title: 'Isolate Vocals',
      description: 'Extract vocals/acapella only',
      outputLabel: 'Vocals',
      color: 'from-pink-500 to-purple-500',
    },
    'both': {
      icon: Layers,
      title: 'Split Both',
      description: 'Get both vocals and instrumental',
      outputLabel: 'Both Tracks',
      color: 'from-purple-500 to-pink-500',
    },
  };

  const currentModeInfo = modeInfo[mode];
  const ModeIcon = currentModeInfo.icon;

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setResult(null);
    setProgress(0);
  };

  // Process audio
  const handleProcess = async () => {
    if (!mediaUrl) return;

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const response = await fetch('/api/audio/vocal-remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: mediaUrl,
          mode,
        }),
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (data.success) {
        setResult({
          mode,
          vocals: data.vocals,
          instrumental: data.instrumental,
          processingTime: data.processingTime,
        });
        setProgress(100);
        onProcessed?.({ vocals: data.vocals, instrumental: data.instrumental });
      }
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Audio playback controls
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const getCurrentAudioUrl = () => {
    if (currentTrack === 'original') return mediaUrl;
    if (currentTrack === 'vocals') return result?.vocals || mediaUrl;
    return result?.instrumental || mediaUrl;
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={getCurrentAudioUrl()}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-gradient-to-r ${currentModeInfo.color} rounded-lg`}>
            <ModeIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Vocal Remover & Isolator</h3>
            <p className="text-sm text-gray-400">AI-powered vocal separation</p>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(Object.keys(modeInfo) as ProcessingMode[]).map((modeKey) => {
          const info = modeInfo[modeKey];
          const Icon = info.icon;
          const isSelected = mode === modeKey;

          return (
            <button
              key={modeKey}
              onClick={() => setMode(modeKey)}
              className={`p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? `border-purple-500 bg-purple-500/20`
                  : 'border-white/10 bg-black/20 hover:border-white/30'
              }`}
            >
              <Icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? 'text-purple-400' : 'text-gray-400'}`} />
              <div className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                {info.title}
              </div>
              <div className="text-xs text-gray-500 mt-1">{info.description}</div>
            </button>
          );
        })}
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {!mediaUrl ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-purple-500 hover:bg-purple-500/5 transition-all group"
          >
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-gray-400 group-hover:text-purple-400 transition-colors" />
              <div>
                <p className="text-white font-medium">Upload Audio File</p>
                <p className="text-sm text-gray-400">MP3, WAV, M4A, FLAC supported</p>
              </div>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-black/30 rounded-xl">
            <div className={`p-3 bg-gradient-to-r ${currentModeInfo.color} rounded-lg opacity-50`}>
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium truncate">{fileName || 'Uploaded audio'}</p>
              <p className="text-sm text-gray-400">{formatTime(duration)} duration</p>
            </div>
            <button
              onClick={() => {
                setMediaUrl('');
                setFileName('');
                setResult(null);
              }}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5 text-gray-400 hover:text-red-400" />
            </button>
          </div>
        )}
      </div>

      {/* Process Button */}
      {mediaUrl && !result && (
        <button
          onClick={handleProcess}
          disabled={isProcessing}
          className={`w-full p-4 bg-gradient-to-r ${currentModeInfo.color} hover:opacity-90 disabled:opacity-50 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Processing... {Math.round(progress)}%
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              {currentModeInfo.title}
            </>
          )}
        </button>
      )}

      {/* Progress Bar */}
      {isProcessing && (
        <div className="mt-4">
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${currentModeInfo.color} transition-all duration-300`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-400 mt-2">
            Separating audio tracks with AI...
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4">
          {/* Success Message */}
          <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-xl border border-green-500/30">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-white font-medium">Processing Complete!</p>
              <p className="text-sm text-gray-400">
                Processed in {(result.processingTime / 1000).toFixed(1)}s
              </p>
            </div>
          </div>

          {/* Track Selector */}
          <div className="p-4 bg-black/30 rounded-xl">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Preview Tracks</h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setCurrentTrack('original')}
                className={`p-3 rounded-lg transition-colors ${
                  currentTrack === 'original'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <Music2 className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs">Original</span>
              </button>

              {(mode === 'isolate-vocals' || mode === 'both') && result.vocals && (
                <button
                  onClick={() => setCurrentTrack('vocals')}
                  className={`p-3 rounded-lg transition-colors ${
                    currentTrack === 'vocals'
                      ? 'bg-pink-500/30 text-pink-300'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Mic className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs">Vocals</span>
                </button>
              )}

              {(mode === 'remove-vocals' || mode === 'both') && result.instrumental && (
                <button
                  onClick={() => setCurrentTrack('instrumental')}
                  className={`p-3 rounded-lg transition-colors ${
                    currentTrack === 'instrumental'
                      ? 'bg-blue-500/30 text-blue-300'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <MicOff className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs">Instrumental</span>
                </button>
              )}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="p-4 bg-black/30 rounded-xl">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className={`p-3 bg-gradient-to-r ${currentModeInfo.color} rounded-full transition-transform hover:scale-105`}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" fill="white" />
                ) : (
                  <Play className="w-6 h-6 text-white" fill="white" />
                )}
              </button>

              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => {
                    const time = Number(e.target.value);
                    setCurrentTime(time);
                    if (audioRef.current) {
                      audioRef.current.currentTime = time;
                    }
                  }}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {volume > 0 ? (
                  <Volume2 className="w-4 h-4 text-gray-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                )}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => {
                    const vol = Number(e.target.value);
                    setVolume(vol);
                    if (audioRef.current) {
                      audioRef.current.volume = vol;
                    }
                  }}
                  className="w-20 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          </div>

          {/* A/B Comparison */}
          <div className="p-4 bg-black/30 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-300">A/B Comparison</h4>
              <button
                onClick={() => setComparisonMode(!comparisonMode)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  comparisonMode
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4 inline mr-1" />
                {comparisonMode ? 'On' : 'Off'}
              </button>
            </div>

            {comparisonMode && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Original</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={comparisonBalance}
                  onChange={(e) => setComparisonBalance(Number(e.target.value))}
                  className="flex-1 h-2 bg-gradient-to-r from-gray-500 to-purple-500 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-400">Processed</span>
              </div>
            )}
          </div>

          {/* Download Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {(mode === 'isolate-vocals' || mode === 'both') && result.vocals && (
              <button className="flex items-center justify-center gap-2 p-3 bg-pink-500/20 hover:bg-pink-500/30 rounded-xl text-pink-300 font-medium transition-colors">
                <Download className="w-5 h-5" />
                Download Vocals
              </button>
            )}

            {(mode === 'remove-vocals' || mode === 'both') && result.instrumental && (
              <button className="flex items-center justify-center gap-2 p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl text-blue-300 font-medium transition-colors">
                <Download className="w-5 h-5" />
                Download Instrumental
              </button>
            )}
          </div>

          {/* Process Another */}
          <button
            onClick={() => {
              setResult(null);
              setProgress(0);
            }}
            className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
          >
            Process Another File
          </button>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 p-4 bg-black/20 rounded-xl">
        <h4 className="text-sm font-medium text-gray-300 mb-2">How It Works</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Uses AI-powered source separation (Spleeter/Demucs)</li>
          <li>• Preserves audio quality during extraction</li>
          <li>• Works best with stereo audio files</li>
          <li>• Processing time depends on track length</li>
        </ul>
      </div>
    </div>
  );
}
