'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  AudioWaveform,
  Scissors,
  Download,
  Image as ImageIcon,
  Library,
  Zap,
  Mic,
  Bot,
  Mic,
  Move,
  Pause,
  Play,
  Rewind,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
} from 'lucide-react';
import SongGenerator from '@/components/SongGenerator';
import SongLibrary from '@/components/SongLibrary';
import FileUpload from '@/components/FileUpload';
import LyricEditor from '@/components/LyricEditor';
import WaveformEditor from '@/components/WaveformEditor';
import StemSeparator from '@/components/StemSeparator';
import AlbumArtGenerator from '@/components/AlbumArtGenerator';
import ExportPanel from '@/components/ExportPanel';
import BeatMaker from '@/components/BeatMaker';
import VoiceController from '@/components/VoiceController';
import AIAssistant from '@/components/AIAssistant';
import type { UploadedFile, ParsedCommand } from '@/types';
import VoiceMemoRecorder from '@/components/VoiceMemoRecorder';
import type { UploadedFile } from '@/types';

export interface Song {
  id: string;
  name: string;
  createdAt: number;
  duration: number;
  blobUrl: string;
  pan: number;
  gain: number;
  muted: boolean;
}

type Tab =
  | 'generate'
  | 'beatmaker'
  | 'upload'
  | 'lyrics'
  | 'waveform'
  | 'stems'
  | 'albumart'
  | 'export'
  | 'library'
  | 'voice';

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [lyrics, setLyrics] = useState('');
  const [showVoice, setShowVoice] = useState(true);
  const [showAI, setShowAI] = useState(true);

  const handleSongGenerated = (song: Song) => {
    setSongs(prev => [song, ...prev]);
    setCurrentSong(song);
  };

  const handleMasterOutput = (value: number) => {
    ensureAudioContext();
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = value;
    }
  };

  const handleVoiceCommand = (command: ParsedCommand) => {
    console.log('Voice command received:', command);

    // Navigate to tabs
    if (command.action === 'navigate_to_tab') {
      const tab = command.parameters.tab as Tab;
      if (tab) setActiveTab(tab);
    } else if (command.action === 'navigate_to_beat_maker') {
      setActiveTab('beatmaker');
    } else if (command.action === 'play_audio') {
      // Trigger play on current audio
      console.log('Play audio command');
    } else if (command.action === 'stop_audio') {
      // Trigger stop on current audio
      console.log('Stop audio command');
    } else if (command.action === 'generate_song') {
      setActiveTab('generate');
      // TODO: Auto-fill form with command parameters
    }

    // Add more command handling as needed
  };

  const tabs = [
    { id: 'generate' as Tab, label: 'Generate', icon: Sparkles },
    { id: 'beatmaker' as Tab, label: 'Beat Maker', icon: Zap },
    { id: 'upload' as Tab, label: 'Upload', icon: Upload },
    { id: 'lyrics' as Tab, label: 'Lyrics', icon: Type },
    { id: 'waveform' as Tab, label: 'Editor', icon: AudioWaveform },
    { id: 'stems' as Tab, label: 'Stems', icon: Scissors },
    { id: 'albumart' as Tab, label: 'Album Art', icon: ImageIcon },
    { id: 'export' as Tab, label: 'Export', icon: Download },
    { id: 'library' as Tab, label: 'Library', icon: Library },
    { id: 'voice' as Tab, label: 'Voice Memo', icon: Mic },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Music className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">OnEstudiO</h1>
                <p className="text-purple-300 text-sm">
                  AI-Powered Music Production Suite
                </p>
              </div>
            </div>

            {/* Voice & AI Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowVoice(!showVoice)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  showVoice
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Mic size={16} />
                Voice
              </button>
              <button
                onClick={() => setShowAI(!showAI)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  showAI
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Bot size={16} />
                AI Assistant
              </button>
            </div>
          </div>
          <TransportControls
            tracks={tracks}
            transportState={transportState}
            sessionDuration={sessionDuration}
            trackNodesRef={trackNodesRef}
            handlePlay={handlePlay}
            handlePause={handlePause}
            handleRewind={handleRewind}
            handleFastForward={handleFastForward}
            handleScrub={handleScrub}
            setSpectralVisible={setSpectralVisible}
          />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex gap-6">
          {/* Left Sidebar - Voice Control */}
          {showVoice && (
            <div className="w-80 flex-shrink-0">
              <VoiceController onCommand={handleVoiceCommand} />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1">
            {/* Beat Maker Tab */}
            {activeTab === 'beatmaker' && <BeatMaker />}

            {/* Generate Tab */}
            {activeTab === 'generate' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">Create Your Song</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWorkspace('recording')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-sm"
                >
                  <CirclePlus className="w-4 h-4" />
                  Add Track
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
                  <Layers className="w-4 h-4" />
                  Add Bus
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {timelineSlots.map((track, index) =>
                track ? (
                  <div
                    key={track.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/30" />
                      <div>
                        <p className="font-semibold">{track.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                          <Tag className="w-3 h-3" />
                          Recorded • {track.duration.toFixed(1)}s
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <div className="h-10 rounded-lg bg-gradient-to-r from-purple-500/30 via-blue-500/30 to-transparent border border-white/10" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-300">
                      <span className="flex items-center gap-1">
                        <Move className="w-4 h-4" />
                        Drag
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-4 h-4" />
                        Fade In/Out
                      </span>
                      <button className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20">
                        Merge
                      </button>
                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 hover:bg-white/20"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={`empty-${index}`}
                    className="flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-400"
                  >
                    <span>Empty track slot</span>
                    <span className="text-purple-300">Add a recording</span>
                  </div>
                ),
              )}
            </div>
          </div>

          {workspace === 'mixing' && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Mixing Room</h2>
                  <p className="text-gray-300 text-sm">
                    Dial in panning, compression, gate, 12-band EQ, and reverb.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <CassetteTape className="w-4 h-4" />
                  Session: “Broken Phone Memo Vault”
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <h3 className="text-sm font-semibold mb-4">Mixer Channels</h3>
                    {tracks.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        Record a take to unlock channel controls.
                      </p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {tracks.slice(0, 4).map(track => (
                          <div
                            key={track.id}
                            className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-gray-300"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-white">{track.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-purple-300">Bus A</span>
                                <button
                                  onClick={() => handleTrackMute(track.id)}
                                  className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${track.muted
                                    ? 'bg-red-500/60 text-white'
                                    : 'bg-white/10 hover:bg-white/20'
                                  }`}
                                >
                                  {track.muted ? 'Muted' : 'Mute'}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <label className="flex items-center justify-between">
                                <span>Pan L/R</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-400">L</span>
                                  <input
                                    type="range"
                                    min={-1}
                                    max={1}
                                    step={0.01}
                                    value={track.pan}
                                    onChange={event =>
                                      handleTrackPan(track.id, Number(event.target.value))
                                    }
                                    className="w-24 accent-purple-400"
                                  />
                                  <span className="text-[10px] text-gray-400">R</span>
                                </div>
                              </label>
                              <label className="flex items-center justify-between">
                                <span>Gain</span>
                                <input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.01}
                                  value={track.gain}
                                  onChange={event =>
                                    handleTrackGain(track.id, Number(event.target.value))
                                  }
                                  className="w-24 accent-purple-400"
                                />
                              </label>
                              <label className="flex items-center justify-between">
                                <span>Reverb</span>
                                <input type="range" className="w-24 accent-purple-400" />
                              </label>
                              <label className="flex items-center justify-between">
                                <span>Compression</span>
                                <input type="range" className="w-24 accent-purple-400" />
                              </label>
                              <label className="flex items-center justify-between">
                                <span>Gate</span>
                                <input type="range" className="w-24 accent-purple-400" />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <h3 className="text-sm font-semibold mb-3">12-Band EQ</h3>
                    <div className="grid grid-cols-6 gap-2 text-xs text-gray-400">
                      {Array.from({ length: 12 }, (_, index) => (
                        <div key={index} className="flex flex-col items-center gap-2">
                          <div className="h-20 w-6 rounded-full bg-gradient-to-t from-purple-600/70 to-white/10" />
                          <span>{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <h3 className="text-sm font-semibold mb-3">Bus &amp; Output</h3>
                    <div className="space-y-3 text-xs text-gray-300">
                      <div className="flex items-center justify-between">
                        <span>Bus Compression</span>
                        <span className="text-white">Glue 35%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Limiter</span>
                        <span className="text-white">Ceiling -0.3 dB</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Output Gain</span>
                        <span className="text-white">-1.2 dB</span>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <label className="text-xs text-gray-400">Output Level</label>
                      <input type="range" className="w-full accent-purple-400" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <h3 className="text-sm font-semibold mb-3">Master Out</h3>
                    <div className="space-y-3 text-xs text-gray-300">
                      <div className="flex items-center justify-between">
                        <span>Master Bus</span>
                        <span className="text-white">Stereo Out</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Peak</span>
                        <span className="text-white">-0.6 dB</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Limiter</span>
                        <span className="text-white">Soft Clip</span>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <label className="text-xs text-gray-400">Master Output</label>
                      <input
                        type="range"
                        min={0}
                        max={1.5}
                        step={0.01}
                        defaultValue={0.9}
                        onChange={event => handleMasterOutput(Number(event.target.value))}
                        className="w-full accent-purple-400"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <h3 className="text-sm font-semibold mb-3">Export Options</h3>
                    <div className="grid gap-2 text-xs text-gray-300">
                      <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20">
                        Export All Tracks
                      </button>
                      <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20">
                        Export Stems
                      </button>
                      <button className="px-3 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 font-semibold">
                        Render Mixdown
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Session Vault</h3>
              <Headphones className="w-5 h-5 text-purple-300" />
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2">
                <span>Lyric Scratchpad</span>
                <span className="text-xs text-purple-300">Synced</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2">
                <span>Hook Concepts</span>
                <span className="text-xs text-purple-300">Tagged</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2">
                <span>Audio Vault</span>
                <span className="text-xs text-purple-300">{tracks.length} items</span>
              </div>
            </div>
            <button className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
              <Tag className="w-4 h-4" />
              Tag &amp; Store Everything
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Realtime Analysis</h3>
              <Gauge className="w-5 h-5 text-purple-300" />
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-center justify-between">
                <span>Pitch Detection</span>
                <span className="text-white">E♭4</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Noise Floor</span>
                <span className="text-white">-54 dB</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Latency</span>
                <span className="text-white">8.2 ms</span>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-black/40 p-3 text-xs text-gray-300">
              Auto-tune follows pitch changes instantly, with realtime correction previews.
            </div>
          </div>

          {workspace === 'recording' && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Recording Room</h3>
                  <p className="text-gray-300 text-sm">
                    Capture vocals with pitch detection, auto-tune, and vault tagging.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <CassetteTape className="w-4 h-4" />
                  Session: “Broken Phone Memo Vault”
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <h4 className="text-sm font-semibold mb-3">Live Capture</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-300 mb-4">
                    <Mic className="w-4 h-4 text-purple-300" />
                    Input: Default Mic • {recordingState === 'recording' ? 'Recording' : 'Ready'}
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs text-gray-400">Input Gain</label>
                    <input type="range" className="w-full accent-purple-400" />
                    <label className="text-xs text-gray-400">Monitor Mix</label>
                    <input type="range" className="w-full accent-purple-400" />
                  </div>
                  <button
                    onClick={handleRecordToggle}
                    disabled={recordingState === 'saving'}
                    className={`mt-4 w-full py-3 rounded-lg font-semibold ${recordingState === 'recording'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-purple-500 hover:bg-purple-600'
                    } ${recordingState === 'saving' ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {recordingState === 'recording'
                      ? 'Stop Recording'
                      : recordingState === 'saving'
                        ? 'Saving...'
                        : 'Arm & Record'}
                  </button>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <h4 className="text-sm font-semibold mb-3">Pitch Intelligence</h4>
                  <div className="flex items-center justify-between text-sm text-gray-300 mb-4">
                    <span className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-purple-300" />
                      Auto-Tune Follow
                    </span>
                    <span className="px-3 py-1 rounded-full bg-purple-500/30 text-xs">
                      Active
                    </span>
                  </div>
                  <div className="space-y-3 text-xs text-gray-300">
                    <div className="flex items-center justify-between">
                      <span>Key Target</span>
                      <span className="text-white">A Minor</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pitch Detection</span>
                      <span className="text-white">Realtime</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Correction Speed</span>
                      <span className="text-white">Fast</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <h4 className="text-sm font-semibold mb-3">Voice FX Presets</h4>
                  <div className="grid gap-3 text-sm text-gray-300">
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span>Broken Phone</span>
                      <span className="text-xs text-purple-300">Preset</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span>Warm Tube</span>
                      <span className="text-xs text-purple-300">Preset</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span>Airy Double</span>
                      <span className="text-xs text-purple-300">Preset</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <h4 className="text-sm font-semibold mb-3">Vault Tags &amp; Storage</h4>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-300 mb-3">
                    {['Hook Ideas', 'Verse Vault', 'Freestyle', 'Adlibs'].map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-white/10">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
                    <FolderLock className="w-4 h-4" />
                    Save to Vault
                  </button>
                </div>
              </div>
            </div>
            <SongLibrary songs={songs} />
          </div>
        )}
          </div>

          {/* Right Sidebar - AI Assistant */}
          {showAI && (
            <div className="w-96 flex-shrink-0">
              <div className="sticky top-24 h-[calc(100vh-8rem)]">
                <AIAssistant
                  context={{
                    activeTab,
                    currentSong,
                    songsCount: songs.length,
                  }}
                  className="h-full"
                />
              </div>
            </div>
          )}
        </div>

          <SpectralVisualizer
            analyserRef={analyserRef}
            spectralVisible={spectralVisible}
          />
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/30 backdrop-blur-md mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-gray-500 text-sm">
            OnEstudiO - AI-Powered Music Production Suite • Built with Next.js & Tone.js • Open Source
          </p>
        </div>
      </footer>
    </main>
  );
}

/**
 * ⚡ Bolt Optimization: Localized high-frequency re-renders.
 * By moving the 60fps spectral state and its update logic into this memoized component,
 * we prevent the entire dashboard (Home) from re-rendering on every animation frame.
 */
const SpectralVisualizer = React.memo(function SpectralVisualizer({
  analyserRef,
  spectralVisible,
}: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  spectralVisible: boolean;
}) {
  const [spectralBars, setSpectralBars] = useState<number[]>(
    Array.from({ length: spectralBarCount }, () => 12),
  );

  useEffect(() => {
    if (!spectralVisible || !analyserRef.current) return;
    let frame = 0;
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const updateBars = () => {
      analyser.getByteFrequencyData(data);
      const bucketSize = Math.floor(data.length / spectralBarCount);
      const nextBars = Array.from({ length: spectralBarCount }, (_, index) => {
        const start = index * bucketSize;
        const end = start + bucketSize;
        let sum = 0;
        for (let i = start; i < end; i += 1) {
          sum += data[i];
        }
        return Math.max(6, Math.round((sum / bucketSize / 255) * 100));
      });
      setSpectralBars(nextBars);
      frame = requestAnimationFrame(updateBars);
    };

    updateBars();
    return () => cancelAnimationFrame(frame);
  }, [spectralVisible, analyserRef]);

  if (!spectralVisible) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Spectral Analysis</h3>
        <SlidersHorizontal className="w-5 h-5 text-purple-300" />
      </div>
      <div className="flex items-end gap-2 h-32">
        {spectralBars.map((height, index) => (
          <div
            key={index}
            style={{ height: `${height}%` }}
            className="flex-1 rounded-full bg-gradient-to-t from-purple-600/80 to-pink-400/40"
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Toggle spectral view on demand to keep the main workspace focused.
      </p>
    </div>
  );
});

/**
 * ⚡ Bolt Optimization: Localized playback progress updates.
 * Moving transportTime state here prevents the entire application from re-rendering
 * multiple times per second during audio playback.
 */
const TransportControls = React.memo(function TransportControls({
  tracks,
  transportState,
  sessionDuration,
  trackNodesRef,
  handlePlay,
  handlePause,
  handleRewind,
  handleFastForward,
  handleScrub,
  setSpectralVisible,
}: {
  tracks: Track[];
  transportState: 'stopped' | 'playing' | 'paused';
  sessionDuration: number;
  trackNodesRef: React.RefObject<Map<string, any>>;
  handlePlay: (startTime: number) => void;
  handlePause: () => void;
  handleRewind: () => void;
  handleFastForward: () => void;
  handleScrub: (value: number) => void;
  setSpectralVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [transportTime, setTransportTime] = useState(0);

  useEffect(() => {
    let frame = 0;
    const updateTransport = () => {
      if (transportState === 'playing') {
        const firstNode = trackNodesRef.current?.values().next().value;
        if (firstNode) {
          setTransportTime(firstNode.audio.currentTime);
        }
        frame = requestAnimationFrame(updateTransport);
      } else if (transportState === 'stopped') {
        setTransportTime(0);
      }
    };
    updateTransport();
    return () => cancelAnimationFrame(frame);
  }, [transportState, trackNodesRef]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => handlePlay(transportTime)}
        disabled={tracks.length === 0}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
      >
        <Play className="w-4 h-4" />
        Play
      </button>
      <button
        onClick={handlePause}
        disabled={tracks.length === 0}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
      >
        <Pause className="w-4 h-4" />
        Pause
      </button>
      <button
        onClick={handleRewind}
        disabled={tracks.length === 0}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
      >
        <Rewind className="w-4 h-4" />
        Rewind
      </button>
      <button
        onClick={() => {
          handleFastForward();
          const firstNode = trackNodesRef.current?.values().next().value;
          if (firstNode) {
            setTransportTime(firstNode.audio.currentTime);
          }
        }}
        disabled={tracks.length === 0}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
      >
        <FastForward className="w-4 h-4" />
        Fast Forward
      </button>
      <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/10 text-sm">
        <AudioWaveform className="w-4 h-4 text-purple-300" />
        <span className="text-gray-300">Scrub Wheel</span>
        <input
          type="range"
          min={0}
          max={sessionDuration || 0}
          step={0.01}
          value={transportTime}
          onChange={event => {
            const val = Number(event.target.value);
            setTransportTime(val);
            handleScrub(val);
          }}
          disabled={sessionDuration === 0}
          className="w-24 accent-purple-400"
        />
      </div>
      <button
        onClick={() => setSpectralVisible(prev => !prev)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
      >
        <AudioLines className="w-4 h-4" />
        Spectral View
      </button>
    </div>
  );
});
