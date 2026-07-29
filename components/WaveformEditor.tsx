'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Scissors,
  Volume2,
  Zap,
  Download,
  RotateCcw,
  RotateCw,
  Sliders,
} from 'lucide-react';

interface WaveformEditorProps {
  audioUrl: string;
  onSave?: (editedUrl: string) => void;
}

export default function WaveformEditor({ audioUrl, onSave }: WaveformEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<{ start: number; end: number } | null>(null);
  const [showEffects, setShowEffects] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load audio and generate waveform
  useEffect(() => {
    if (audioUrl) {
      loadAudio();
    }
  }, [audioUrl]);

  // Update waveform visualization
  useEffect(() => {
    drawWaveform();
  }, [waveformData, currentTime, selectedRegion, trimStart, trimEnd]);

  // Handle time updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setTrimEnd(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const loadAudio = async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Extract waveform data
      const data = extractWaveformData(audioBuffer);
      setWaveformData(data);
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  };

  const extractWaveformData = (audioBuffer: AudioBuffer): number[] => {
    const rawData = audioBuffer.getChannelData(0);
    const samples = 1000; // Number of bars in waveform
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData: number[] = [];

    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j]);
      }
      filteredData.push(sum / blockSize);
    }

    return filteredData;
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const barWidth = width / waveformData.length;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // ⚡ Bolt Optimization: Group bars by state-dependent colors and batch-draw using Path2D
    // This reduces state-change overhead and scales rendering performance from O(N) to O(1) per color group.
    const pathDefault = new Path2D();
    const pathDimmed = new Path2D();
    const pathPlayed = new Path2D();
    const pathSelected = new Path2D();

    waveformData.forEach((value, index) => {
      const barHeight = value * height * 0.8;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;
      const progress = (index / waveformData.length) * duration;

      if (progress < trimStart || progress > trimEnd) {
        pathDimmed.rect(x, y, barWidth - 1, barHeight);
      } else if (selectedRegion && progress >= selectedRegion.start && progress <= selectedRegion.end) {
        pathSelected.rect(x, y, barWidth - 1, barHeight);
      } else if (progress <= currentTime) {
        pathPlayed.rect(x, y, barWidth - 1, barHeight);
      } else {
        pathDefault.rect(x, y, barWidth - 1, barHeight);
      }
    });

    // Draw dimmed (trimmed) bars
    ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
    ctx.fill(pathDimmed);

    // Draw unplayed (default) bars
    ctx.fillStyle = '#8b5cf6';
    ctx.fill(pathDefault);

    // Draw played bars
    ctx.fillStyle = '#ec4899';
    ctx.fill(pathPlayed);

    // Draw selected bars
    ctx.fillStyle = '#10b981';
    ctx.fill(pathSelected);

    // Draw playhead
    const playheadX = (currentTime / duration) * width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(playheadX - 1, 0, 2, height);

    // Draw trim markers
    const trimStartX = (trimStart / duration) * width;
    const trimEndX = (trimEnd / duration) * width;

    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(0, 0, trimStartX, height);
    ctx.fillRect(trimEndX, 0, width - trimEndX, height);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = (x / rect.width) * duration;

    audioRef.current.currentTime = clickTime;
    setCurrentTime(clickTime);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTrim = async () => {
    if (!audioUrl) return;

    // Call API to trim audio
    const response = await fetch('/api/audio/trim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioUrl,
        startTime: trimStart,
        endTime: trimEnd,
      }),
    });

    const data = await response.json();
    onSave?.(data.url);
    alert('Audio trimmed successfully!');
  };

  const handleApplyEffects = async (effect: string) => {
    const response = await fetch('/api/audio/effects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioUrl,
        effect,
      }),
    });

    const data = await response.json();
    onSave?.(data.url);
  };

  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
      <audio ref={audioRef} src={audioUrl} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Waveform Editor</h3>
          <p className="text-sm text-gray-400">Edit and enhance your audio</p>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div ref={containerRef} className="mb-6">
        <canvas
          ref={canvasRef}
          width={1200}
          height={200}
          onClick={handleCanvasClick}
          className="w-full h-48 bg-black/20 rounded-lg cursor-crosshair"
        />
      </div>

      {/* Timeline */}
      <div className="mb-6 flex justify-between text-xs text-gray-400">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={togglePlay}
          className="p-4 bg-purple-500 hover:bg-purple-600 rounded-full transition-colors"
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
            step="0.01"
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
        </div>

        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-gray-400" />
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

      {/* Trim Controls */}
      <div className="mb-6 p-4 bg-black/20 rounded-lg">
        <div className="flex items-center gap-4 mb-3">
          <Scissors className="w-5 h-5 text-purple-400" />
          <h4 className="text-sm font-medium text-white">Trim Audio</h4>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Start Time</label>
            <input
              type="number"
              min="0"
              max={duration}
              step="0.1"
              value={trimStart}
              onChange={(e) => setTrimStart(Number(e.target.value))}
              className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">End Time</label>
            <input
              type="number"
              min={trimStart}
              max={duration}
              step="0.1"
              value={trimEnd}
              onChange={(e) => setTrimEnd(Number(e.target.value))}
              className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <button
          onClick={handleTrim}
          className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
        >
          Apply Trim
        </button>
      </div>

      {/* Effects Panel */}
      <div className="p-4 bg-black/20 rounded-lg">
        <button
          onClick={() => setShowEffects(!showEffects)}
          className="flex items-center gap-2 text-white mb-3"
        >
          <Sliders className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-medium">Audio Effects</span>
        </button>

        {showEffects && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleApplyEffects('reverb')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
            >
              Reverb
            </button>
            <button
              onClick={() => handleApplyEffects('echo')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
            >
              Echo
            </button>
            <button
              onClick={() => handleApplyEffects('bass-boost')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
            >
              Bass Boost
            </button>
            <button
              onClick={() => handleApplyEffects('normalize')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
            >
              Normalize
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
