'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Zap, Download } from 'lucide-react';
import * as Tone from 'tone';

export default function BeatMaker() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(145);
  const [volume, setVolume] = useState(-10);
  const [started, setStarted] = useState(false);
  const [currentSection, setCurrentSection] = useState('verse');

  const kickRef = useRef<Tone.MembraneSynth | null>(null);
  const snareRef = useRef<Tone.NoiseSynth | null>(null);
  const hihatRef = useRef<Tone.MetalSynth | null>(null);
  const openHatRef = useRef<Tone.MetalSynth | null>(null);
  const clapRef = useRef<Tone.NoiseSynth | null>(null);
  const rimRef = useRef<Tone.MetalSynth | null>(null);
  const bassRef = useRef<Tone.MonoSynth | null>(null);
  const subBassRef = useRef<Tone.MonoSynth | null>(null);
  const melodyRef = useRef<Tone.PolySynth | null>(null);
  const lead2Ref = useRef<Tone.Synth | null>(null);
  const padRef = useRef<Tone.PolySynth | null>(null);
  const pluckRef = useRef<Tone.PluckSynth | null>(null);
  const sequenceRef = useRef<Tone.Part | null>(null);

  useEffect(() => {
    // Layered kick with more punch
    kickRef.current = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 10,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.8 }
    }).toDestination();

    snareRef.current = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
    }).toDestination();

    // Clap for layering
    clapRef.current = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 }
    }).toDestination();

    // Rim shot
    rimRef.current = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
      harmonicity: 8,
      modulationIndex: 40
    }).toDestination();

    hihatRef.current = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.08, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5
    }).toDestination();

    openHatRef.current = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.3, release: 0.2 },
      harmonicity: 5.1,
      modulationIndex: 32
    }).toDestination();

    // Main bass with filter
    bassRef.current = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 2, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5, baseFrequency: 200, octaves: 4 }
    }).toDestination();

    // Sub bass for low end
    subBassRef.current = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.5, release: 1 }
    }).toDestination();

    // Complex melody synth
    melodyRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 1 }
    }).toDestination();

    // Lead synth with more character
    lead2Ref.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 1.2 }
    }).toDestination();

    // Pad for atmosphere
    padRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.8, decay: 0.5, sustain: 0.8, release: 2 }
    }).toDestination();

    // Pluck for accents
    pluckRef.current = new Tone.PluckSynth({
      attackNoise: 1,
      dampening: 4000,
      resonance: 0.9
    }).toDestination();

    return () => {
      if (sequenceRef.current) {
        sequenceRef.current.stop();
        sequenceRef.current.dispose();
      }
      kickRef.current?.dispose();
      snareRef.current?.dispose();
      hihatRef.current?.dispose();
      openHatRef.current?.dispose();
      clapRef.current?.dispose();
      rimRef.current?.dispose();
      bassRef.current?.dispose();
      subBassRef.current?.dispose();
      melodyRef.current?.dispose();
      lead2Ref.current?.dispose();
      padRef.current?.dispose();
      pluckRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  useEffect(() => {
    if (kickRef.current) kickRef.current.volume.value = volume;
    if (snareRef.current) snareRef.current.volume.value = volume - 2;
    if (clapRef.current) clapRef.current.volume.value = volume - 8;
    if (rimRef.current) rimRef.current.volume.value = volume - 10;
    if (hihatRef.current) hihatRef.current.volume.value = volume - 6;
    if (openHatRef.current) openHatRef.current.volume.value = volume - 8;
    if (bassRef.current) bassRef.current.volume.value = volume - 2;
    if (subBassRef.current) subBassRef.current.volume.value = volume - 4;
    if (melodyRef.current) melodyRef.current.volume.value = volume - 10;
    if (lead2Ref.current) lead2Ref.current.volume.value = volume - 8;
    if (padRef.current) padRef.current.volume.value = volume - 15;
    if (pluckRef.current) pluckRef.current.volume.value = volume - 12;
  }, [volume]);

  const startBeat = async () => {
    if (!started) {
      await Tone.start();
      setStarted(true);
    }

    // VERSE - Complex trap pattern with rolls and ghost notes
    const versePattern = [
      { time: '0:0:0', kick: true, bass: 'E2', sub: 'E1', hihat: true },
      { time: '0:0:1.5', rim: true },
      { time: '0:0:2', hihat: true },
      { time: '0:0:3', hihat: true, kick: true },
      { time: '0:1:0', snare: true, clap: true, hihat: true },
      { time: '0:1:1', hihat: true },
      { time: '0:1:2', hihat: true, rim: true },
      { time: '0:1:3', hihat: true },
      { time: '0:2:0', kick: true, bass: 'E2', sub: 'E1', hihat: true },
      { time: '0:2:1', kick: true },
      { time: '0:2:2', hihat: true, openHat: true },
      { time: '0:2:2.5', hihat: true },
      { time: '0:2:3', hihat: true },
      { time: '0:2:3.5', hihat: true },
      { time: '0:3:0', snare: true, clap: true, hihat: true },
      { time: '0:3:1', rim: true },
      { time: '0:3:2', hihat: true, kick: true },
      { time: '0:3:3', hihat: true },
      { time: '0:3:3.5', hihat: true }
    ];

    // CHORUS - More energy, more kicks, bass slides
    const chorusPattern = [
      { time: '0:0:0', kick: true, bass: 'G2', sub: 'G1', hihat: true, openHat: true },
      { time: '0:0:1', hihat: true },
      { time: '0:0:1.5', kick: true },
      { time: '0:0:2', hihat: true, rim: true },
      { time: '0:0:3', hihat: true },
      { time: '0:0:3.5', hihat: true, kick: true },
      { time: '0:1:0', snare: true, clap: true, hihat: true, kick: true },
      { time: '0:1:1', hihat: true },
      { time: '0:1:2', hihat: true, kick: true },
      { time: '0:1:2.5', hihat: true },
      { time: '0:1:3', hihat: true },
      { time: '0:1:3.5', hihat: true },
      { time: '0:2:0', kick: true, bass: 'A2', sub: 'A1', hihat: true, openHat: true },
      { time: '0:2:1', hihat: true, rim: true },
      { time: '0:2:1.5', kick: true },
      { time: '0:2:2', hihat: true },
      { time: '0:2:2.5', hihat: true },
      { time: '0:2:3', hihat: true, kick: true },
      { time: '0:2:3.5', hihat: true },
      { time: '0:3:0', snare: true, clap: true, hihat: true },
      { time: '0:3:0.5', rim: true },
      { time: '0:3:1', hihat: true },
      { time: '0:3:1.5', hihat: true },
      { time: '0:3:2', hihat: true, kick: true, bass: 'G2' },
      { time: '0:3:2.5', hihat: true },
      { time: '0:3:3', hihat: true },
      { time: '0:3:3.5', hihat: true, kick: true }
    ];

    // BRIDGE - Syncopated, off-kilter
    const bridgePattern = [
      { time: '0:0:0', kick: true, bass: 'C2', sub: 'C1' },
      { time: '0:0:2', hihat: true },
      { time: '0:0:3.5', rim: true },
      { time: '0:1:0', snare: true, clap: true },
      { time: '0:1:1.5', hihat: true },
      { time: '0:1:2.5', kick: true },
      { time: '0:2:0', kick: true, bass: 'D2', sub: 'D1', openHat: true },
      { time: '0:2:2', rim: true },
      { time: '0:2:3', hihat: true },
      { time: '0:3:0', snare: true, clap: true },
      { time: '0:3:1', hihat: true },
      { time: '0:3:1.5', hihat: true },
      { time: '0:3:2', hihat: true, kick: true },
      { time: '0:3:2.5', hihat: true },
      { time: '0:3:3', hihat: true },
      { time: '0:3:3.5', hihat: true, rim: true }
    ];

    // Complex melodies with arpeggios
    const verseMelody = [
      { time: '0:0:0', notes: ['E3', 'G3'], pad: ['E2', 'G2', 'B2'] },
      { time: '0:0:2', pluck: 'B3' },
      { time: '0:0:3', lead: 'G3' },
      { time: '0:1:0', notes: ['D3', 'F#3'] },
      { time: '0:1:2', pluck: 'A3' },
      { time: '0:2:0', notes: ['C3', 'E3', 'G3'] },
      { time: '0:2:1', lead: 'E4' },
      { time: '0:2:2', pluck: 'G3' },
      { time: '0:2:3', lead: 'D4' },
      { time: '0:3:0', notes: ['D3', 'F#3'] },
      { time: '0:3:2', pluck: 'F#3' },
      { time: '0:3:3', lead: 'A3' }
    ];

    const chorusMelody = [
      { time: '0:0:0', notes: ['G3', 'B3', 'D4'], pad: ['G2', 'B2', 'D3'] },
      { time: '0:0:1', lead: 'E4' },
      { time: '0:0:2', pluck: 'D4' },
      { time: '0:0:3', lead: 'G4' },
      { time: '0:1:0', notes: ['F#3', 'A3', 'C4'] },
      { time: '0:1:1', pluck: 'C4' },
      { time: '0:1:2', lead: 'D4' },
      { time: '0:1:3', pluck: 'A3' },
      { time: '0:2:0', notes: ['E3', 'G3', 'B3', 'D4'] },
      { time: '0:2:1', lead: 'B3' },
      { time: '0:2:2', pluck: 'E4' },
      { time: '0:2:2.5', lead: 'D4' },
      { time: '0:2:3', pluck: 'C4' },
      { time: '0:3:0', notes: ['F#3', 'A3', 'C4'] },
      { time: '0:3:1', lead: 'D4' },
      { time: '0:3:2', pluck: 'A3' },
      { time: '0:3:2.5', lead: 'C4' },
      { time: '0:3:3', pluck: 'F#3' }
    ];

    const bridgeMelody = [
      { time: '0:0:0', notes: ['C3', 'E3', 'G3'], pad: ['C2', 'E2', 'G2'] },
      { time: '0:1:0', pluck: 'G3' },
      { time: '0:2:0', notes: ['D3', 'F#3', 'A3'] },
      { time: '0:2:2', lead: 'A3' },
      { time: '0:3:0', pluck: 'F#3' },
      { time: '0:3:2', lead: 'D4' }
    ];

    let currentPattern = versePattern;
    let currentMelody = verseMelody;
    let barCount = 0;

    sequenceRef.current = new Tone.Part((time, event: any) => {
      if (event.kick) kickRef.current?.triggerAttackRelease('C1', '8n', time);
      if (event.snare) snareRef.current?.triggerAttackRelease('16n', time);
      if (event.clap) clapRef.current?.triggerAttackRelease('16n', time + 0.01);
      if (event.rim) rimRef.current?.triggerAttackRelease('64n', time);
      if (event.hihat) hihatRef.current?.triggerAttackRelease('32n', time);
      if (event.openHat) openHatRef.current?.triggerAttackRelease('16n', time);
      if (event.bass) {
        bassRef.current?.triggerAttackRelease(event.bass, '8n', time);
      }
      if (event.sub) {
        subBassRef.current?.triggerAttackRelease(event.sub, '4n', time);
      }
    }, currentPattern).start(0);

    const melodyPart = new Tone.Part((time, event: any) => {
      if (event.notes) melodyRef.current?.triggerAttackRelease(event.notes, '8n', time);
      if (event.lead) lead2Ref.current?.triggerAttackRelease(event.lead, '16n', time);
      if (event.pluck) pluckRef.current?.triggerAttack(event.pluck, time);
      if (event.pad) padRef.current?.triggerAttackRelease(event.pad, '2n', time);
    }, currentMelody).start(0);

    sequenceRef.current.loop = true;
    sequenceRef.current.loopEnd = '1m';
    melodyPart.loop = true;
    melodyPart.loopEnd = '1m';

    // Change sections every 4 bars
    Tone.Transport.scheduleRepeat(() => {
      barCount++;

      if (barCount % 4 === 0) {
        const cycle = Math.floor(barCount / 4) % 3;

        if (cycle === 0) {
          sequenceRef.current?.clear();
          melodyPart.clear();
          versePattern.forEach(p => sequenceRef.current?.add(p.time, p));
          verseMelody.forEach(m => melodyPart.add(m.time, m));
          setCurrentSection('verse');
        } else if (cycle === 1) {
          sequenceRef.current?.clear();
          melodyPart.clear();
          chorusPattern.forEach(p => sequenceRef.current?.add(p.time, p));
          chorusMelody.forEach(m => melodyPart.add(m.time, m));
          setCurrentSection('chorus');
        } else {
          sequenceRef.current?.clear();
          melodyPart.clear();
          bridgePattern.forEach(p => sequenceRef.current?.add(p.time, p));
          bridgeMelody.forEach(m => melodyPart.add(m.time, m));
          setCurrentSection('bridge');
        }
      }
    }, '1m');

    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stopBeat = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    setIsPlaying(false);
  };

  const resetBeat = () => {
    stopBeat();
    Tone.Transport.position = 0;
    setCurrentSection('verse');
  };

  const handleExport = async () => {
    alert('Export functionality coming soon! Will export the beat as audio file.');
    // TODO: Implement audio recording/export
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-black mb-2 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            FIRE BEAT MAKER
          </h1>
          <p className="text-gray-400 flex items-center justify-center gap-2">
            <Zap size={16} className="text-yellow-500" />
            Complex patterns, layered sounds, real heat
            <Zap size={16} className="text-yellow-500" />
          </p>
        </div>

        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-8 shadow-2xl border border-purple-500/40">
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={isPlaying ? stopBeat : startBeat}
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-black py-5 px-10 rounded-full flex items-center gap-3 transition-all transform hover:scale-105 shadow-xl text-lg"
            >
              {isPlaying ? <><Pause size={28} /> PAUSE</> : <><Play size={28} /> PLAY</>}
            </button>
            <button
              onClick={resetBeat}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-5 px-10 rounded-full flex items-center gap-2 transition-all shadow-lg"
            >
              <RotateCcw size={28} />
            </button>
            <button
              onClick={handleExport}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-5 px-10 rounded-full flex items-center gap-2 transition-all shadow-lg"
            >
              <Download size={24} />
            </button>
          </div>

          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-r from-purple-600/40 to-pink-600/40 border-2 border-purple-400 rounded-full px-8 py-3 shadow-lg">
              <span className="text-sm uppercase tracking-widest font-semibold">Now Playing: </span>
              <span className="font-black text-xl text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text uppercase">
                {currentSection}
              </span>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-lg font-bold flex items-center gap-2">
                  🎵 BPM
                </label>
                <span className="text-purple-400 font-mono text-2xl font-bold">{bpm}</span>
              </div>
              <input
                type="range"
                min="80"
                max="180"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-lg font-bold flex items-center gap-2">
                  <Volume2 size={22} /> VOLUME
                </label>
                <span className="text-purple-400 font-mono text-2xl font-bold">{volume}dB</span>
              </div>
              <input
                type="range"
                min="-30"
                max="0"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-purple-500/30">
              <h3 className="font-bold text-purple-400 mb-3 text-sm uppercase tracking-wider">Drums</h3>
              <div className="space-y-1 text-xs text-gray-300">
                <div>• Layered Kicks + 808s</div>
                <div>• Hi-hat Rolls & Ghost Notes</div>
                <div>• Snare + Clap Layers</div>
                <div>• Rim Shots & Open Hats</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-pink-500/30">
              <h3 className="font-bold text-pink-400 mb-3 text-sm uppercase tracking-wider">Melody</h3>
              <div className="space-y-1 text-xs text-gray-300">
                <div>• Complex Chord Progressions</div>
                <div>• Lead Synth Arpeggios</div>
                <div>• Atmospheric Pads</div>
                <div>• Pluck Accents</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className={`p-5 rounded-xl border-2 transition-all ${currentSection === 'verse' ? 'bg-gradient-to-br from-purple-600/50 to-purple-700/50 border-purple-300 shadow-lg shadow-purple-500/50 scale-105' : 'bg-gray-900/50 border-purple-500/20'}`}>
              <div className="text-3xl mb-2">🎤</div>
              <div className="font-black text-base">VERSE</div>
              <div className="text-xs text-gray-400 mt-1">Trap Rhythms</div>
            </div>
            <div className={`p-5 rounded-xl border-2 transition-all ${currentSection === 'chorus' ? 'bg-gradient-to-br from-pink-600/50 to-red-600/50 border-pink-300 shadow-lg shadow-pink-500/50 scale-105' : 'bg-gray-900/50 border-pink-500/20'}`}>
              <div className="text-3xl mb-2">🔥</div>
              <div className="font-black text-base">CHORUS</div>
              <div className="text-xs text-gray-400 mt-1">Maximum Energy</div>
            </div>
            <div className={`p-5 rounded-xl border-2 transition-all ${currentSection === 'bridge' ? 'bg-gradient-to-br from-indigo-600/50 to-purple-600/50 border-indigo-300 shadow-lg shadow-indigo-500/50 scale-105' : 'bg-gray-900/50 border-indigo-500/20'}`}>
              <div className="text-3xl mb-2">💎</div>
              <div className="font-black text-base">BRIDGE</div>
              <div className="text-xs text-gray-400 mt-1">Syncopated Vibe</div>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-400 mt-6 text-sm">
          🔥 Complex patterns with hi-hat rolls, layered drums, bass slides & melody arpeggios 🔥
        </p>
      </div>
    </div>
  );
}
