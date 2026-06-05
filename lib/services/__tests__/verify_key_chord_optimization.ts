
import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { FastFFTEngine } from '../fastFFTEngine';
import { performance } from 'perf_hooks';

async function runVerify() {
  console.log('⚡ Starting Key & Chord Detection Optimization Verification...');

  // Mock AudioContext and AudioBuffer
  const sampleRate = 44100;
  const duration = 120; // 2 minutes
  const length = sampleRate * duration;
  const channelData = new Float32Array(length);
  for (let i = 0; i < length; i++) channelData[i] = Math.random() * 2 - 1;

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData: () => channelData,
  } as unknown as AudioBuffer;

  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};
  (global as any).OfflineAudioContext = class {
    createBuffer() { return { getChannelData: () => new Float32Array(8192) }; }
  };

  const detector = new AdvancedKeyDetection(new (global as any).AudioContext());

  // 1. Verify detectKeyFromMagnitudes Speedup
  console.log('\n--- Phase 1: Key Detection Reuse ---');
  const { linearMagnitudes } = await (detector as any).fftEngine.performFFT(mockAudioBuffer, 8192);

  const startFull = performance.now();
  await detector.detectKey(mockAudioBuffer);
  const endFull = performance.now();
  console.log(`Full detectKey (with FFT): ${(endFull - startFull).toFixed(4)}ms`);

  const startReuse = performance.now();
  detector.detectKeyFromMagnitudes(linearMagnitudes, sampleRate);
  const endReuse = performance.now();
  console.log(`detectKeyFromMagnitudes (reuse): ${(endReuse - startReuse).toFixed(4)}ms`);
  console.log(`Speedup: ${((endFull - startFull) / (endReuse - startReuse)).toFixed(2)}x`);

  // 2. Verify detectChordProgression Optimization
  console.log('\n--- Phase 2: Chord Progression Optimization ---');
  const hopSize = 2; // 2 second segments = 60 segments
  const startChords = performance.now();
  const chords = await detector.detectChordProgression(mockAudioBuffer, hopSize);
  const endChords = performance.now();

  console.log(`detectChordProgression (60 segments): ${(endChords - startChords).toFixed(2)}ms`);
  console.log(`Average per segment: ${((endChords - startChords) / chords.length).toFixed(2)}ms`);
  console.log(`Total chords detected: ${chords.length}`);

  if (chords.length === 60) {
    console.log('✅ Correct number of segments processed.');
  } else {
    console.log('❌ Unexpected number of segments.');
  }

  console.log('\n⚡ Verification Complete.');
}

runVerify().catch(console.error);
