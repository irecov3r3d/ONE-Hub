import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

/**
 * Benchmark script for AdvancedKeyDetection optimizations.
 * Measures execution time for Key Detection from magnitudes and Chord Progression detection.
 */
async function runBenchmark() {
  console.log('⚡ Starting AdvancedKeyDetection Performance Benchmark...');

  // Mock AudioContext and AudioBuffer for Node environment
  const sampleRate = 44100;
  const duration = 120; // 2 minutes
  const length = sampleRate * duration;

  const channelData = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    channelData[i] = Math.random() * 2 - 1;
  }

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData: () => channelData,
  } as unknown as AudioBuffer;

  // Mock global window/AudioContext
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {
    createBufferSource() { return {}; }
    decodeAudioData() { return Promise.resolve(mockAudioBuffer); }
  };
  (global as any).OfflineAudioContext = class {
    constructor() {}
    createBuffer() { return mockAudioBuffer; }
    startRendering() { return Promise.resolve(mockAudioBuffer); }
  };

  const detector = new AdvancedKeyDetection(new (global as any).AudioContext());

  // 1. Benchmark Key Detection from pre-calculated magnitudes
  console.log('\n--- Phase 1: Key Detection from Magnitudes (Synergy) ---');
  const magnitudes8192 = new Float32Array(4096);
  for (let i = 0; i < magnitudes8192.length; i++) magnitudes8192[i] = Math.random();

  const startKey = performance.now();
  const keyResult = detector.detectKeyFromMagnitudes(magnitudes8192, sampleRate);
  const endKey = performance.now();
  console.log(`Duration: ${(endKey - startKey).toFixed(4)}ms`);
  console.log(`Detected Key: ${keyResult.key} (${(keyResult.confidence * 100).toFixed(1)}%)`);

  // 2. Benchmark Chord Progression Detection (Zero-copy)
  console.log('\n--- Phase 2: Chord Progression Detection (2s segments) ---');
  const startChords = performance.now();
  const chords = await detector.detectChordProgression(mockAudioBuffer, 2);
  const endChords = performance.now();
  console.log(`Duration: ${(endChords - startChords).toFixed(2)}ms for ${chords.length} segments`);
  console.log(`Average per segment: ${((endChords - startChords) / chords.length).toFixed(2)}ms`);
  console.log(`First 3 Chords: ${chords.slice(0, 3).map(c => c.chord).join(', ')}`);

  console.log('\n⚡ Benchmark Complete.');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
