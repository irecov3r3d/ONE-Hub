import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

async function runBenchmark() {
  console.log('⚡ Starting AdvancedKeyDetection Performance Benchmark...');

  const sampleRate = 44100;

  // Mock AudioContext
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};
  const mockAudioContext = {} as AudioContext;

  const detector = new AdvancedKeyDetection(mockAudioContext);

  // 1. Benchmark calculateChromagramFromSamples
  console.log('\n--- Phase 1: Chromagram Calculation (Optimized) ---');

  // Create a mock AudioBuffer (10 seconds)
  const duration = 10;
  const length = sampleRate * duration;
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const iterations = 100;
  // First run to prime the cache
  await (detector as any).calculateChromagramFromSamples(data, sampleRate);

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await (detector as any).calculateChromagramFromSamples(data, sampleRate);
  }
  const end = performance.now();
  console.log(`Average calculateChromagramFromSamples duration: ${((end - start) / iterations).toFixed(2)}ms`);

  // 2. Benchmark detectChordProgression (Zero-copy optimization)
  console.log('\n--- Phase 2: Chord Progression Detection (Zero-copy) ---');

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData: () => data,
  } as unknown as AudioBuffer;

  const startProg = performance.now();
  await detector.detectChordProgression(mockAudioBuffer, 2);
  const endProg = performance.now();
  console.log(`detectChordProgression (10s audio, 2s segments) duration: ${(endProg - startProg).toFixed(2)}ms`);
  console.log(`Per-segment average: ${((endProg - startProg) / 5).toFixed(2)}ms`);

  console.log('\n⚡ Benchmark Complete.');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
