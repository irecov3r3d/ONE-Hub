import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { FastFFTEngine } from '../fastFFTEngine';
import { performance } from 'perf_hooks';

/**
 * Benchmark script for AdvancedKeyDetection optimizations.
 * Measures speedup of detectKeyFromMagnitudes and detectChordProgression.
 */
async function runBenchmark() {
  console.log('⚡ Starting AdvancedKeyDetection Performance Benchmark...');

  const sampleRate = 44100;
  const duration = 120; // 2 minutes
  const length = sampleRate * duration;

  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = Math.random() * 2 - 1;
  }

  // Mock AudioContext and AudioBuffer
  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;

  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {
    createAnalyser() { return {}; }
  };

  const keyDetector = new AdvancedKeyDetection({} as AudioContext);

  // 1. Benchmark detectKeyFromMagnitudes (Spectral Synergy)
  console.log('\n--- Phase 1: detectKeyFromMagnitudes (Spectral Synergy) ---');
  const fftSize = 8192;
  const magnitudes = new Float32Array(fftSize / 2);
  for (let i = 0; i < magnitudes.length; i++) magnitudes[i] = Math.random();

  // Warm up the pitch class cache
  keyDetector.detectKeyFromMagnitudes(magnitudes, sampleRate);

  const startKey = performance.now();
  const iterations = 100;
  for (let i = 0; i < iterations; i++) {
    keyDetector.detectKeyFromMagnitudes(magnitudes, sampleRate);
  }
  const endKey = performance.now();
  console.log(`Duration: ${((endKey - startKey) / iterations).toFixed(4)}ms per call (averaged over ${iterations} calls)`);

  // 2. Benchmark detectChordProgression (Zero-Copy)
  console.log('\n--- Phase 2: detectChordProgression (Zero-Copy & Averaging) ---');
  const startChord = performance.now();
  const chords = await keyDetector.detectChordProgression(mockAudioBuffer, 2);
  const endChord = performance.now();
  console.log(`Duration: ${(endChord - startChord).toFixed(2)}ms for ${duration}s track (${chords.length} segments)`);
  console.log(`Average per segment: ${((endChord - startChord) / chords.length).toFixed(2)}ms`);

  console.log('\n⚡ Benchmark Complete.');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
