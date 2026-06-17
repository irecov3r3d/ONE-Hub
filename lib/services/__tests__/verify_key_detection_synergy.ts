import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

/**
 * Benchmark script for AdvancedKeyDetection optimizations.
 * Measures execution time for Key Detection and Chord Progression.
 */
async function runBenchmark() {
  console.log('⚡ Starting AdvancedKeyDetection Performance Benchmark...');

  const sampleRate = 44100;
  const duration = 120; // 2 minutes
  const length = sampleRate * duration;

  const monoChannel = new Float32Array(length);
  // Fill with random noise
  for (let i = 0; i < length; i++) {
    monoChannel[i] = Math.random() * 2 - 1;
  }

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData: () => monoChannel,
  } as unknown as AudioBuffer;

  // Mock global window/AudioContext for service initialization
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {
    createBuffer() {
      return {
        getChannelData: () => new Float32Array(1024),
        length: 1024,
        sampleRate: 44100,
        numberOfChannels: 1
      };
    }
  };

  const detector = new AdvancedKeyDetection(new (global as any).AudioContext());

  // 1. Benchmark detectKeyFromMagnitudes
  console.log('\n--- Phase 1: Key Detection from Magnitudes (O(M) with Cache) ---');
  const magnitudes = new Float32Array(4096);
  for (let i = 0; i < magnitudes.length; i++) magnitudes[i] = Math.random();

  // First run to prime cache
  detector.detectKeyFromMagnitudes(magnitudes, sampleRate);

  const startKey = performance.now();
  const keyResult = detector.detectKeyFromMagnitudes(magnitudes, sampleRate);
  const endKey = performance.now();
  console.log(`Duration: ${(endKey - startKey).toFixed(4)}ms`);
  console.log(`Detected Key: ${keyResult.key} (${(keyResult.confidence * 100).toFixed(1)}%)`);

  // 2. Benchmark detectChordProgression
  console.log('\n--- Phase 2: Chord Progression Detection (Zero-Copy) ---');
  const startChords = performance.now();
  const chords = await detector.detectChordProgression(mockAudioBuffer, 2);
  const endChords = performance.now();
  console.log(`Duration: ${(endChords - startChords).toFixed(2)}ms for ${duration}s track`);
  console.log(`Segments processed: ${chords.length}`);
  console.log(`Avg time per segment: ${((endChords - startChords) / chords.length).toFixed(2)}ms`);

  console.log('\n⚡ Benchmark Complete.');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
