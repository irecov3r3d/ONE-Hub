'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic,
  Pause,
  Play,
  Square,
  Volume2,
  Wand2,
  AudioWaveform,
} from 'lucide-react';

type EqSettings = {
  low: number;
  mid: number;
  high: number;
};

type VoiceTrack = {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  buffer: AudioBuffer;
  duration: number;
  volume: number;
  pan: number;
  eq: EqSettings;
};

type TrackNodes = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  panner: StereoPannerNode;
  low: BiquadFilterNode;
  mid: BiquadFilterNode;
  high: BiquadFilterNode;
};

const defaultEq: EqSettings = {
  low: 0,
  mid: 0,
  high: 0,
};

const formatDuration = (value: number) => {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function VoiceMemoRecorder() {
  const [tracks, setTracks] = useState<VoiceTrack[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [activeRecordingLabel, setActiveRecordingLabel] = useState('Take 1');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const trackNodesRef = useRef<Map<string, TrackNodes>>(new Map());

  const nextTakeLabel = useMemo(
    () => `Take ${tracks.length + 1}`,
    [tracks.length],
  );

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  const resetPlayback = useCallback(async () => {
    trackNodesRef.current.forEach(nodes => {
      nodes.source.stop();
    });
    trackNodesRef.current.clear();

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handleRecordStart = useCallback(async () => {
    setRecordingError('');
    setActiveRecordingLabel(nextTakeLabel);
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const context = new AudioContext();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = await context.decodeAudioData(arrayBuffer);
        await context.close();

        setTracks(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: activeRecordingLabel,
            blob,
            url,
            buffer,
            duration: buffer.duration,
            volume: 0.9,
            pan: 0,
            eq: { ...defaultEq },
          },
        ]);
        setActiveRecordingLabel(`Take ${tracks.length + 2}`);
        cleanupStream();
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setRecordingError('Microphone access is required to record your memo.');
      cleanupStream();
    }
  }, [activeRecordingLabel, cleanupStream, isRecording, nextTakeLabel, tracks.length]);

  const handleRecordStop = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const handlePlay = useCallback(async () => {
    if (!tracks.length || isPlaying) return;
    const context = new AudioContext();
    audioContextRef.current = context;

    const nodeMap = new Map<string, TrackNodes>();

    tracks.forEach(track => {
      const source = context.createBufferSource();
      source.buffer = track.buffer;

      const gain = context.createGain();
      gain.gain.value = track.volume;

      const panner = context.createStereoPanner();
      panner.pan.value = track.pan;

      const low = context.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 120;
      low.gain.value = track.eq.low;

      const mid = context.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1;
      mid.gain.value = track.eq.mid;

      const high = context.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.value = 8000;
      high.gain.value = track.eq.high;

      source
        .connect(low)
        .connect(mid)
        .connect(high)
        .connect(panner)
        .connect(gain)
        .connect(context.destination);

      nodeMap.set(track.id, { source, gain, panner, low, mid, high });
      source.start(0);
    });

    trackNodesRef.current = nodeMap;
    setIsPlaying(true);

    const longest = Math.max(...tracks.map(track => track.duration), 0);
    if (longest > 0) {
      setTimeout(() => {
        resetPlayback();
      }, longest * 1000 + 250);
    }
  }, [isPlaying, resetPlayback, tracks]);

  const handleStopPlayback = useCallback(async () => {
    await resetPlayback();
  }, [resetPlayback]);

  const updateTrack = useCallback(
    (id: string, updater: (track: VoiceTrack) => VoiceTrack) => {
      setTracks(prev => prev.map(track => (track.id === id ? updater(track) : track)));
    },
    [],
  );

  const handleSettingChange = useCallback(
    (id: string, key: keyof VoiceTrack, value: number) => {
      updateTrack(id, track => ({ ...track, [key]: value }));
      const nodes = trackNodesRef.current.get(id);
      if (!nodes) return;
      if (key === 'volume') nodes.gain.gain.value = value;
      if (key === 'pan') nodes.panner.pan.value = value;
    },
    [updateTrack],
  );

  const handleEqChange = useCallback(
    (id: string, band: keyof EqSettings, value: number) => {
      updateTrack(id, track => ({
        ...track,
        eq: { ...track.eq, [band]: value },
      }));
      const nodes = trackNodesRef.current.get(id);
      if (!nodes) return;
      if (band === 'low') nodes.low.gain.value = value;
      if (band === 'mid') nodes.mid.gain.value = value;
      if (band === 'high') nodes.high.gain.value = value;
    },
    [updateTrack],
  );

  useEffect(() => {
    return () => {
      cleanupStream();
      resetPlayback();
    };
  }, [cleanupStream, resetPlayback]);

  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-cyan-300/20 bg-gradient-to-br from-slate-900/80 via-slate-950/80 to-cyan-900/40 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">Neon Memo Dock</h2>
                <p className="text-sm text-cyan-200">
                  Capture quick takes, dub layers, and shape tone in one dock.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-cyan-100">
              <span className="rounded-full border border-cyan-200/30 bg-cyan-500/10 px-3 py-1">
                {tracks.length} takes
              </span>
              <span className="rounded-full border border-cyan-200/30 bg-cyan-500/10 px-3 py-1">
                Live pan + volume
              </span>
              <span className="rounded-full border border-cyan-200/30 bg-cyan-500/10 px-3 py-1">
                3-band EQ
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={isRecording ? handleRecordStop : handleRecordStart}
              className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                isRecording
                  ? 'bg-rose-500/90 text-white hover:bg-rose-500'
                  : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isRecording ? 'Stop recording' : 'Record memo'}
            </button>
            <button
              type="button"
              onClick={isPlaying ? handleStopPlayback : handlePlay}
              disabled={!tracks.length}
              className="flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? 'Stop playback' : 'Play mix'}
            </button>
          </div>
        </div>
        {recordingError && (
          <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {recordingError}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          {tracks.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-cyan-200/30 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-10 text-center">
              <AudioWaveform className="mx-auto h-12 w-12 text-cyan-300" />
              <h3 className="mt-4 text-xl font-semibold text-white">
                Capture your first memo
              </h3>
              <p className="mt-2 text-sm text-cyan-100/80">
                Hit record to start a take. Add more takes to dub layers on top.
              </p>
            </div>
          ) : (
            tracks.map(track => (
              <div
                key={track.id}
                className="rounded-[28px] border border-cyan-200/20 bg-gradient-to-br from-slate-950/80 to-slate-900/70 p-6 shadow-lg shadow-slate-950/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{track.name}</h3>
                    <p className="text-sm text-cyan-100/70">
                      {formatDuration(track.duration)} · Dub-ready memo
                    </p>
                  </div>
                  <audio
                    controls
                    src={track.url}
                    className="w-36 accent-cyan-400"
                  />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-cyan-100/80">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-cyan-200" />
                      Volume
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.01}
                      value={track.volume}
                      onChange={event =>
                        handleSettingChange(track.id, 'volume', Number(event.target.value))
                      }
                      className="w-full accent-cyan-400"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-cyan-100/80">
                    <div className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4 text-cyan-200" />
                      Pan
                    </div>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={track.pan}
                      onChange={event =>
                        handleSettingChange(track.id, 'pan', Number(event.target.value))
                      }
                      className="w-full accent-cyan-400"
                    />
                  </label>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {(['low', 'mid', 'high'] as const).map(band => (
                    <label key={band} className="space-y-2 text-sm text-cyan-100/80">
                      <span className="block uppercase tracking-wide text-xs text-cyan-200/70">
                        {band}
                      </span>
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.5}
                        value={track.eq[band]}
                        onChange={event =>
                          handleEqChange(track.id, band, Number(event.target.value))
                        }
                        className="w-full accent-cyan-400"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-cyan-200/20 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6">
            <h3 className="text-lg font-semibold text-white">Dub Checklist</h3>
            <ul className="mt-4 space-y-3 text-sm text-cyan-100/80">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                Record a base memo, then stack takes for harmonies or emphasis.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                Pan takes left/right to widen the stereo image.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                Use EQ sliders to tame lows, boost clarity, or soften highs.
              </li>
            </ul>
          </div>
          <div className="rounded-[28px] border border-cyan-200/20 bg-gradient-to-br from-cyan-500/10 via-slate-950/70 to-indigo-500/10 p-6">
            <h3 className="text-lg font-semibold text-white">Session Notes</h3>
            <p className="mt-3 text-sm text-cyan-100/80">
              Record as many takes as you want. Each dub sits in your mix until you
              hit play. Adjust sliders live to shape the MVP mixdown.
            </p>
            <div className="mt-4 rounded-2xl border border-cyan-200/20 bg-slate-950/70 p-4 text-xs text-cyan-100/80">
              <p>Next up: {nextTakeLabel}</p>
              <p className="mt-1 text-cyan-200">
                Tip: Keep your mic 6 inches away for a warm voice memo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
