'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Loader2,
  Music,
  Mic,
  MicOff,
  Drum,
  Guitar,
  Piano,
  Waves,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings2,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Package,
  Headphones,
} from 'lucide-react';
import type { StemFiles } from '@/types';

interface StemSeparatorProps {
  audioUrl: string;
  onStemsGenerated?: (stems: StemFiles) => void;
}

type StemModel = '2stems' | '4stems' | '5stems' | '6stems';
type StemQuality = 'fast' | 'standard' | 'high' | 'maximum';

interface StemTrack {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  url?: string;
  volume: number;
  muted: boolean;
  solo: boolean;
}

const STEM_MODELS: { id: StemModel; name: string; stems: string[]; description: string }[] = [
  {
    id: '2stems',
    name: '2 Stems',
    stems: ['Vocals', 'Instrumental'],
    description: 'Fast separation into vocals and instrumental',
  },
  {
    id: '4stems',
    name: '4 Stems',
    stems: ['Vocals', 'Drums', 'Bass', 'Other'],
    description: 'Standard separation for most music',
  },
  {
    id: '5stems',
    name: '5 Stems',
    stems: ['Vocals', 'Drums', 'Bass', 'Piano', 'Other'],
    description: 'Includes piano isolation',
  },
  {
    id: '6stems',
    name: '6 Stems',
    stems: ['Vocals', 'Drums', 'Bass', 'Piano', 'Guitar', 'Other'],
    description: 'Maximum separation with guitar',
  },
];

const QUALITY_OPTIONS: { id: StemQuality; name: string; description: string }[] = [
  { id: 'fast', name: 'Fast', description: '~30 seconds, good quality' },
  { id: 'standard', name: 'Standard', description: '~1 minute, better quality' },
  { id: 'high', name: 'High', description: '~2 minutes, high quality' },
  { id: 'maximum', name: 'Maximum', description: '~5 minutes, best quality' },
];

const STEM_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  vocals: { icon: Mic, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  instrumental: { icon: Music, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  drums: { icon: Drum, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  bass: { icon: Waves, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  piano: { icon: Piano, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  guitar: { icon: Guitar, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  other: { icon: Sparkles, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
};

export default function StemSeparator({ audioUrl, onStemsGenerated }: StemSeparatorProps) {
  // Settings state
  const [model, setModel] = useState<StemModel>('4stems');
  const [quality, setQuality] = useState<StemQuality>('standard');
  const [showSettings, setShowSettings] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  // Results state
  const [stems, setStems] = useState<StemTrack[]>([]);
  const [hasResults, setHasResults] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [masterVolume, setMasterVolume] = useState(1);

  // Audio refs
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const masterRef = useRef<HTMLAudioElement>(null);

  // Get current model info
  const currentModel = STEM_MODELS.find(m => m.id === model) || STEM_MODELS[1];

  // Initialize stems based on model
  const initializeStems = (stemUrls: Record<string, string>) => {
    const tracks: StemTrack[] = [];

    for (const [key, url] of Object.entries(stemUrls)) {
      const config = STEM_CONFIG[key.toLowerCase()] || STEM_CONFIG.other;
      tracks.push({
        id: key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        icon: config.icon,
        color: config.color,
        bgColor: config.bgColor,
        url,
        volume: 1,
        muted: false,
        solo: false,
      });
    }

    setStems(tracks);
    setHasResults(true);
  };

  // Process audio
  const separateStems = async () => {
    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Analyzing audio...');

    try {
      // Simulate processing steps
      const steps = [
        { step: 'Analyzing audio...', progress: 10 },
        { step: 'Loading AI model...', progress: 20 },
        { step: 'Separating frequencies...', progress: 40 },
        { step: 'Isolating stems...', progress: 60 },
        { step: 'Enhancing quality...', progress: 80 },
        { step: 'Finalizing...', progress: 95 },
      ];

      for (const s of steps) {
        setCurrentStep(s.step);
        setProgress(s.progress);
        await new Promise(r => setTimeout(r, 800));
      }

      const response = await fetch('/api/audio/stems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl,
          model,
          quality,
        }),
      });

      if (!response.ok) throw new Error('Failed to separate stems');

      const data = await response.json();
      initializeStems(data.stems);
      onStemsGenerated?.(data.stems);
      setProgress(100);
      setCurrentStep('Complete!');
    } catch (error) {
      console.error('Error separating stems:', error);
      setCurrentStep('Error processing audio');
    } finally {
      setIsProcessing(false);
    }
  };

  // Playback controls
  const togglePlayback = () => {
    const hasSoloTrack = stems.some(s => s.solo);

    stems.forEach(stem => {
      const audio = audioRefs.current[stem.id];
      if (!audio) return;

      const shouldPlay = hasSoloTrack ? stem.solo : !stem.muted;

      if (isPlaying) {
        audio.pause();
      } else if (shouldPlay) {
        audio.currentTime = currentTime;
        audio.play();
      }
    });

    setIsPlaying(!isPlaying);
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
    stems.forEach(stem => {
      const audio = audioRefs.current[stem.id];
      if (audio) audio.currentTime = time;
    });
  };

  // Volume controls
  const updateStemVolume = (stemId: string, volume: number) => {
    setStems(prev =>
      prev.map(s => (s.id === stemId ? { ...s, volume } : s))
    );
    const audio = audioRefs.current[stemId];
    if (audio) audio.volume = volume * masterVolume;
  };

  const toggleMute = (stemId: string) => {
    setStems(prev =>
      prev.map(s => {
        if (s.id === stemId) {
          const newMuted = !s.muted;
          const audio = audioRefs.current[stemId];
          if (audio) audio.muted = newMuted;
          return { ...s, muted: newMuted };
        }
        return s;
      })
    );
  };

  const toggleSolo = (stemId: string) => {
    setStems(prev => {
      const newStems = prev.map(s => ({
        ...s,
        solo: s.id === stemId ? !s.solo : s.solo,
      }));

      // Update audio playback based on solo
      const hasSoloTrack = newStems.some(s => s.solo);
      newStems.forEach(s => {
        const audio = audioRefs.current[s.id];
        if (audio && isPlaying) {
          if (hasSoloTrack) {
            audio.muted = !s.solo;
          } else {
            audio.muted = s.muted;
          }
        }
      });

      return newStems;
    });
  };

  // Download functions
  const downloadStem = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAll = () => {
    stems.forEach(stem => {
      if (stem.url) {
        setTimeout(() => downloadStem(stem.url!, stem.name), 100);
      }
    });
  };

  // Time update handler
  useEffect(() => {
    if (stems.length === 0) return;

    const firstAudio = audioRefs.current[stems[0].id];
    if (!firstAudio) return;

    const handleTimeUpdate = () => setCurrentTime(firstAudio.currentTime);
    const handleLoadedMetadata = () => setDuration(firstAudio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    firstAudio.addEventListener('timeupdate', handleTimeUpdate);
    firstAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
    firstAudio.addEventListener('ended', handleEnded);

    return () => {
      firstAudio.removeEventListener('timeupdate', handleTimeUpdate);
      firstAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      firstAudio.removeEventListener('ended', handleEnded);
    };
  }, [stems]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Reset
  const reset = () => {
    setStems([]);
    setHasResults(false);
    setProgress(0);
    setIsPlaying(false);
    setCurrentTime(0);
    audioRefs.current = {};
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
      {/* Hidden audio elements for each stem */}
      {stems.map(stem => (
        <audio
          key={stem.id}
          ref={el => { if (el) audioRefs.current[stem.id] = el; }}
          src={stem.url}
          preload="auto"
        />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Headphones className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Full Stem Separation</h3>
            <p className="text-sm text-gray-400">AI-powered clean stem extraction</p>
          </div>
        </div>

        {!hasResults && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-purple-500/30 text-purple-300' : 'hover:bg-white/10 text-gray-400'
            }`}
          >
            <Settings2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && !hasResults && !isProcessing && (
        <div className="mb-6 p-4 bg-black/30 rounded-xl border border-white/10">
          {/* Model Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Separation Model
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STEM_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`p-3 rounded-lg text-left transition-all ${
                    model === m.id
                      ? 'bg-purple-500/30 border-purple-500 border'
                      : 'bg-white/5 border-transparent border hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium text-white text-sm">{m.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{m.stems.join(', ')}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quality
            </label>
            <div className="grid grid-cols-4 gap-2">
              {QUALITY_OPTIONS.map(q => (
                <button
                  key={q.id}
                  onClick={() => setQuality(q.id)}
                  className={`p-2 rounded-lg text-center transition-all ${
                    quality === q.id
                      ? 'bg-purple-500/30 border-purple-500 border'
                      : 'bg-white/5 border-transparent border hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium text-white text-xs">{q.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Model Info */}
      {!hasResults && !isProcessing && (
        <div className="mb-6 p-4 bg-black/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Selected Configuration</span>
            <span className="text-xs text-purple-400">{currentModel.name} • {QUALITY_OPTIONS.find(q => q.id === quality)?.name}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentModel.stems.map(stem => {
              const config = STEM_CONFIG[stem.toLowerCase()] || STEM_CONFIG.other;
              const Icon = config.icon;
              return (
                <div
                  key={stem}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor}`}
                >
                  <Icon className={`w-3 h-3 ${config.color}`} />
                  <span className={`text-xs font-medium ${config.color}`}>{stem}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Process Button */}
      {!hasResults && !isProcessing && (
        <button
          onClick={separateStems}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Separate into {currentModel.stems.length} Clean Stems
        </button>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            <span className="text-white font-medium">{currentStep}</span>
          </div>

          <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-center text-sm text-gray-400">{progress}% complete</p>

          {/* Processing animation */}
          <div className="grid grid-cols-6 gap-2">
            {currentModel.stems.map((stem, i) => (
              <div
                key={stem}
                className={`h-2 rounded-full transition-all duration-500 ${
                  progress > (i + 1) * (100 / currentModel.stems.length)
                    ? 'bg-purple-500'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">
          {/* Success Header */}
          <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/30">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-green-300 font-medium">
              {stems.length} stems extracted successfully
            </span>
          </div>

          {/* Master Playback Controls */}
          <div className="p-4 bg-black/30 rounded-xl">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlayback}
                className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full hover:scale-105 transition-transform"
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
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={masterVolume}
                  onChange={(e) => {
                    const vol = Number(e.target.value);
                    setMasterVolume(vol);
                    stems.forEach(stem => {
                      const audio = audioRefs.current[stem.id];
                      if (audio) audio.volume = stem.volume * vol;
                    });
                  }}
                  className="w-20 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Stem Mixer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Stem Mixer</span>
              <span className="text-xs text-gray-500">Click S to solo, M to mute</span>
            </div>

            {stems.map(stem => {
              const Icon = stem.icon;
              const hasSoloActive = stems.some(s => s.solo);
              const isAudible = stem.solo || (!hasSoloActive && !stem.muted);

              return (
                <div
                  key={stem.id}
                  className={`p-3 rounded-xl transition-all ${
                    isAudible ? 'bg-black/30' : 'bg-black/10 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Stem Icon & Name */}
                    <div className={`p-2 rounded-lg ${stem.bgColor}`}>
                      <Icon className={`w-5 h-5 ${stem.color}`} />
                    </div>
                    <div className="w-24">
                      <span className="text-white font-medium text-sm">{stem.name}</span>
                    </div>

                    {/* Solo/Mute Buttons */}
                    <button
                      onClick={() => toggleSolo(stem.id)}
                      className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                        stem.solo
                          ? 'bg-yellow-500 text-black'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      S
                    </button>
                    <button
                      onClick={() => toggleMute(stem.id)}
                      className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                        stem.muted
                          ? 'bg-red-500 text-white'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      M
                    </button>

                    {/* Volume Slider */}
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={stem.volume}
                        onChange={(e) => updateStemVolume(stem.id, Number(e.target.value))}
                        className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                      <span className="text-xs text-gray-400 w-8 text-right">
                        {Math.round(stem.volume * 100)}%
                      </span>
                    </div>

                    {/* Download */}
                    <button
                      onClick={() => stem.url && downloadStem(stem.url, stem.name)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title={`Download ${stem.name}`}
                    >
                      <Download className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={downloadAll}
              className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-medium transition-all"
            >
              <Package className="w-5 h-5" />
              Download All Stems
            </button>
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Process Another
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-black/20 rounded-xl">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Stem Separation</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Uses Demucs/Spleeter AI models for clean extraction</li>
          <li>• Higher quality = longer processing but cleaner stems</li>
          <li>• 6-stem model provides maximum instrument isolation</li>
          <li>• Output format: High-quality WAV files</li>
        </ul>
      </div>
    </div>
  );
}
