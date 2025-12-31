'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Play,
  Pause,
  Upload,
  Zap,
  Settings2,
  Download,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  BarChart3,
  Music,
  Video,
  Smartphone,
  RefreshCw,
  Volume2,
  Layers,
} from 'lucide-react';
import type {
  SocialPlatform,
  PlatformPreset,
  SplitPoint,
  Segment,
  SplitterSettings,
  AudioAnalysis,
  SplitResult,
  ExportedSegment,
} from '@/types';

// Platform presets with icons
const PLATFORMS: { id: SocialPlatform; name: string; icon: string; color: string; maxDuration: number; recommended: number }[] = [
  { id: 'tiktok', name: 'TikTok', icon: '📱', color: '#00f2ea', maxDuration: 180, recommended: 30 },
  { id: 'instagram-reels', name: 'Instagram Reels', icon: '📷', color: '#e1306c', maxDuration: 90, recommended: 30 },
  { id: 'youtube-shorts', name: 'YouTube Shorts', icon: '▶️', color: '#ff0000', maxDuration: 60, recommended: 45 },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: '#1da1f2', maxDuration: 140, recommended: 45 },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877f2', maxDuration: 240, recommended: 60 },
  { id: 'custom', name: 'Custom', icon: '⚙️', color: '#8b5cf6', maxDuration: 300, recommended: 60 },
];

interface VideoAudioSplitterProps {
  uploadedFileUrl?: string;
  onExport?: (segments: ExportedSegment[]) => void;
}

export default function VideoAudioSplitter({ uploadedFileUrl, onExport }: VideoAudioSplitterProps) {
  // File state
  const [mediaUrl, setMediaUrl] = useState<string>(uploadedFileUrl || '');
  const [mediaType, setMediaType] = useState<'audio' | 'video'>('audio');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Platform state
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('tiktok');
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);

  // Analysis state
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Split state
  const [splitPoints, setSplitPoints] = useState<SplitPoint[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Partial<SplitterSettings>>({
    detectionMethod: 'auto',
    sensitivityThreshold: 50,
    minSegmentDuration: 15,
    maxSegmentDuration: 60,
    prioritizeEngagement: true,
    avoidSilence: true,
    fadeInDuration: 0.2,
    fadeOutDuration: 0.5,
  });

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportResult, setExportResult] = useState<SplitResult | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current platform info
  const currentPlatform = PLATFORMS.find(p => p.id === selectedPlatform) || PLATFORMS[0];

  // Update settings when platform changes
  useEffect(() => {
    const platform = PLATFORMS.find(p => p.id === selectedPlatform);
    if (platform) {
      setSettings(prev => ({
        ...prev,
        maxSegmentDuration: platform.recommended,
        minSegmentDuration: Math.floor(platform.recommended / 2),
      }));
    }
  }, [selectedPlatform]);

  // Draw waveform with split points
  useEffect(() => {
    if (analysis) {
      drawWaveform();
    }
  }, [analysis, splitPoints, segments, currentTime]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMediaType(file.type.startsWith('video/') ? 'video' : 'audio');

    // Create object URL for preview
    const url = URL.createObjectURL(file);
    setMediaUrl(url);

    // Reset state
    setAnalysis(null);
    setSplitPoints([]);
    setSegments([]);
    setExportResult(null);
  };

  // Analyze media
  const handleAnalyze = async () => {
    if (!mediaUrl) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch('/api/splitter/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaUrl }),
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
        setDuration(data.analysis.duration);
        setAnalysisProgress(100);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Detect split points
  const handleDetect = async () => {
    if (!analysis) return;

    setIsDetecting(true);

    try {
      const response = await fetch('/api/splitter/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          settings: {
            ...settings,
            targetPlatform: selectedPlatform,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSplitPoints(data.splitPoints);
        setSegments(data.segments);
      }
    } catch (error) {
      console.error('Detection failed:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  // Quick split - one-click workflow
  const handleQuickSplit = async () => {
    if (!mediaUrl) return;

    setIsLoading(true);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/splitter/quick-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl,
          platform: selectedPlatform,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setExportResult(data.result);
      }
    } catch (error) {
      console.error('Quick split failed:', error);
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  // Export selected segments
  const handleExport = async () => {
    if (!mediaUrl || segments.length === 0) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 5, 90));
      }, 200);

      const response = await fetch('/api/splitter/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl,
          segments: segments.filter(s => s.selected),
          settings: {
            ...settings,
            targetPlatform: selectedPlatform,
          },
        }),
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (data.success) {
        setExportResult(data.result);
        setExportProgress(100);
        onExport?.(data.result.segments);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle segment selection
  const toggleSegmentSelection = (segmentId: string) => {
    setSegments(prev =>
      prev.map(s =>
        s.id === segmentId ? { ...s, selected: !s.selected } : s
      )
    );
  };

  // Play specific segment
  const playSegment = (segment: Segment) => {
    const media = audioRef.current || videoRef.current;
    if (!media) return;

    media.currentTime = segment.startTime;
    media.play();
    setIsPlaying(true);
    setPlayingSegmentId(segment.id);

    // Stop at segment end
    const checkEnd = () => {
      if (media.currentTime >= segment.endTime) {
        media.pause();
        setIsPlaying(false);
        setPlayingSegmentId(null);
        media.removeEventListener('timeupdate', checkEnd);
      }
    };
    media.addEventListener('timeupdate', checkEnd);
  };

  // Draw waveform visualization
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analysis) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const { waveform, energyProfile } = analysis;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);

    // Draw waveform bars
    const barWidth = width / waveform.length;
    waveform.forEach((value, index) => {
      const barHeight = value * height * 0.8;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;
      const time = (index / waveform.length) * duration;

      // Find which segment this bar belongs to
      const segment = segments.find(s => time >= s.startTime && time < s.endTime);

      // Color based on segment state
      let color = 'rgba(139, 92, 246, 0.6)'; // Default purple

      if (segment) {
        if (segment.selected) {
          // Use gradient based on engagement score
          const hue = 260 + (segment.score / 100) * 60; // Purple to pink
          color = `hsla(${hue}, 80%, 60%, 0.9)`;
        } else {
          color = 'rgba(139, 92, 246, 0.3)';
        }
      }

      if (time <= currentTime) {
        color = segment?.selected ? '#ec4899' : 'rgba(236, 72, 153, 0.5)';
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw split point markers
    splitPoints.forEach(point => {
      const x = (point.time / duration) * width;

      // Marker line
      ctx.strokeStyle = point.type === 'auto' ? '#10b981' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Marker dot
      ctx.fillStyle = point.type === 'auto' ? '#10b981' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, 10, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw playhead
    const playheadX = (currentTime / duration) * width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(playheadX - 1, 0, 3, height);
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate total selected duration
  const selectedDuration = segments
    .filter(s => s.selected)
    .reduce((sum, s) => sum + s.duration, 0);

  const selectedCount = segments.filter(s => s.selected).length;

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
      {/* Hidden media elements */}
      {mediaUrl && mediaType === 'audio' && (
        <audio
          ref={audioRef}
          src={mediaUrl}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => { setIsPlaying(false); setPlayingSegmentId(null); }}
        />
      )}
      {mediaUrl && mediaType === 'video' && (
        <video
          ref={videoRef}
          src={mediaUrl}
          className="hidden"
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onEnded={() => { setIsPlaying(false); setPlayingSegmentId(null); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Auto Clip Splitter</h3>
            <p className="text-sm text-gray-400">AI-powered social media clip generator</p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Settings2 className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Platform Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Target Platform</label>
        <div className="relative">
          <button
            onClick={() => setShowPlatformSelector(!showPlatformSelector)}
            className="w-full flex items-center justify-between p-4 bg-black/30 border border-white/20 rounded-xl text-white hover:border-purple-500 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentPlatform.icon}</span>
              <div className="text-left">
                <div className="font-medium">{currentPlatform.name}</div>
                <div className="text-xs text-gray-400">
                  Max {currentPlatform.maxDuration}s • Recommended {currentPlatform.recommended}s clips
                </div>
              </div>
            </div>
            {showPlatformSelector ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showPlatformSelector && (
            <div className="absolute z-10 w-full mt-2 bg-gray-900 border border-white/20 rounded-xl overflow-hidden shadow-xl">
              {PLATFORMS.map(platform => (
                <button
                  key={platform.id}
                  onClick={() => {
                    setSelectedPlatform(platform.id);
                    setShowPlatformSelector(false);
                  }}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-white/10 transition-colors ${
                    selectedPlatform === platform.id ? 'bg-purple-500/20' : ''
                  }`}
                >
                  <span className="text-2xl">{platform.icon}</span>
                  <div className="text-left flex-1">
                    <div className="font-medium text-white">{platform.name}</div>
                    <div className="text-xs text-gray-400">
                      Max {platform.maxDuration}s • Best at {platform.recommended}s
                    </div>
                  </div>
                  {selectedPlatform === platform.id && (
                    <CheckCircle2 className="w-5 h-5 text-purple-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
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
                <p className="text-white font-medium">Upload Audio or Video</p>
                <p className="text-sm text-gray-400">MP3, WAV, MP4, MOV supported</p>
              </div>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-black/30 rounded-xl">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              {mediaType === 'audio' ? (
                <Music className="w-6 h-6 text-purple-400" />
              ) : (
                <Video className="w-6 h-6 text-purple-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium truncate">{fileName || 'Uploaded file'}</p>
              <p className="text-sm text-gray-400">
                {formatTime(duration)} • {mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}
              </p>
            </div>
            <button
              onClick={() => {
                setMediaUrl('');
                setFileName('');
                setAnalysis(null);
                setSplitPoints([]);
                setSegments([]);
                setExportResult(null);
              }}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5 text-gray-400 hover:text-red-400" />
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {mediaUrl && !analysis && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 p-4 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 rounded-xl text-white font-medium transition-colors"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Analyzing... {analysisProgress}%
              </>
            ) : (
              <>
                <BarChart3 className="w-5 h-5" />
                Analyze Media
              </>
            )}
          </button>

          <button
            onClick={handleQuickSplit}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 rounded-xl text-white font-medium transition-all"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Quick Split
              </>
            )}
          </button>
        </div>
      )}

      {/* Waveform Visualization */}
      {analysis && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300">Waveform & Split Points</h4>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Auto-detected
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Manual
              </span>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={1200}
            height={150}
            onClick={(e) => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const clickTime = (x / rect.width) * duration;
              const media = audioRef.current || videoRef.current;
              if (media) {
                media.currentTime = clickTime;
                setCurrentTime(clickTime);
              }
            }}
            className="w-full h-36 bg-black/30 rounded-lg cursor-crosshair"
          />

          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Detect Split Points Button */}
          {splitPoints.length === 0 && (
            <button
              onClick={handleDetect}
              disabled={isDetecting}
              className="w-full mt-4 flex items-center justify-center gap-2 p-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 rounded-xl text-white font-medium transition-colors"
            >
              {isDetecting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Detecting optimal splits...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Detect Split Points
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-black/30 rounded-xl border border-white/10">
          <h4 className="text-sm font-medium text-white mb-4">Detection Settings</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Detection Method</label>
              <select
                value={settings.detectionMethod}
                onChange={(e) => setSettings(prev => ({ ...prev, detectionMethod: e.target.value as any }))}
                className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="auto">Auto (Best)</option>
                <option value="beat">Beat-based</option>
                <option value="energy">Energy-based</option>
                <option value="silence">Silence-based</option>
                <option value="manual">Manual only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Sensitivity: {settings.sensitivityThreshold}%</label>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.sensitivityThreshold}
                onChange={(e) => setSettings(prev => ({ ...prev, sensitivityThreshold: Number(e.target.value) }))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Min Clip Length (s)</label>
              <input
                type="number"
                min="5"
                max="60"
                value={settings.minSegmentDuration}
                onChange={(e) => setSettings(prev => ({ ...prev, minSegmentDuration: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Clip Length (s)</label>
              <input
                type="number"
                min="15"
                max="180"
                value={settings.maxSegmentDuration}
                onChange={(e) => setSettings(prev => ({ ...prev, maxSegmentDuration: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="col-span-2 flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.prioritizeEngagement}
                  onChange={(e) => setSettings(prev => ({ ...prev, prioritizeEngagement: e.target.checked }))}
                  className="w-4 h-4 rounded bg-black/50 border-white/20 accent-purple-500"
                />
                Prioritize high-energy sections
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.avoidSilence}
                  onChange={(e) => setSettings(prev => ({ ...prev, avoidSilence: e.target.checked }))}
                  className="w-4 h-4 rounded bg-black/50 border-white/20 accent-purple-500"
                />
                Avoid silent sections
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Segments List */}
      {segments.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300">
              Generated Clips ({selectedCount} of {segments.length} selected)
            </h4>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Total: {formatTime(selectedDuration)}</span>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer ${
                  segment.selected
                    ? 'bg-purple-500/20 border border-purple-500/50'
                    : 'bg-black/20 border border-transparent hover:border-white/20'
                }`}
                onClick={() => toggleSegmentSelection(segment.id)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playSegment(segment);
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {playingSegmentId === segment.id && isPlaying ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Clip {index + 1}</span>
                    {segment.features.hasBeatDrop && (
                      <span className="px-2 py-0.5 bg-pink-500/30 rounded text-xs text-pink-300">
                        Beat Drop
                      </span>
                    )}
                    {segment.features.hasVocals && (
                      <span className="px-2 py-0.5 bg-blue-500/30 rounded text-xs text-blue-300">
                        Vocals
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatTime(segment.startTime)} - {formatTime(segment.endTime)} ({formatTime(segment.duration)})
                  </div>
                </div>

                {/* Engagement Score */}
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className={`font-bold ${
                      segment.score >= 70 ? 'text-green-400' :
                      segment.score >= 40 ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                      {Math.round(segment.score)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">score</span>
                </div>

                {/* Selection Checkbox */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  segment.selected
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-gray-500'
                }`}>
                  {segment.selected && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Section */}
      {segments.length > 0 && selectedCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-white font-medium">Ready to Export</h4>
              <p className="text-sm text-gray-400">
                {selectedCount} clips • {formatTime(selectedDuration)} total
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 rounded-xl text-white font-medium transition-all"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Exporting... {exportProgress}%
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export Clips
                </>
              )}
            </button>
          </div>

          {isExporting && (
            <div className="h-2 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Export Results */}
      {exportResult && (
        <div className="mt-6 p-4 bg-green-500/10 rounded-xl border border-green-500/30">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <div>
              <h4 className="text-white font-medium">Export Complete!</h4>
              <p className="text-sm text-gray-400">
                {exportResult.totalSegments} clips exported in {(exportResult.processingTime / 1000).toFixed(1)}s
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {exportResult.segments.map((segment) => (
              <div
                key={segment.id}
                className="flex items-center justify-between p-3 bg-black/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-gray-400" />
                  <span className="text-white text-sm">{segment.fileName}</span>
                </div>
                <button
                  className="flex items-center gap-1 px-3 py-1 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400 text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            ))}
          </div>

          <button
            className="w-full mt-4 flex items-center justify-center gap-2 p-3 bg-green-500 hover:bg-green-600 rounded-xl text-white font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Download All as ZIP
          </button>
        </div>
      )}
    </div>
  );
}
