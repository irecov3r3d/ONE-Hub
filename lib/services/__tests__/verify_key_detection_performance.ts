import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

/**
 * Benchmark script for AdvancedKeyDetection optimizations.
 * Measures execution time for Chromagram and Chord Progression detection.
 */
async function runBenchmark() {
  console.log('⚡ Starting AdvancedKeyDetection Performance Benchmark...');

  const sampleRate = 44100;
  const duration = 120; // 2 minutes
  const length = sampleRate * duration;
  const samples = new Float32Array(length);

  // Fill with a synthetic A Major signal (A4 = 440Hz, C#5 = 554.37Hz, E5 = 659.25Hz)
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    samples[i] = (
      Math.sin(2 * Math.PI * 440 * t) +
      Math.sin(2 * Math.PI * 554.37 * t) +
      Math.sin(2 * Math.PI * 659.25 * t)
    ) * 0.3;
  }

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;

  // Mock global for Node
  (global as any).AudioBuffer = class {};
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};

  const detector = new AdvancedKeyDetection(new (global as any).AudioContext());

  // 1. Benchmark Chromagram Calculation (with cache warmup)
  console.log('\n--- Phase 1: Chromagram Calculation (Hot Loop) ---');

  // Warmup
  await (detector as any).calculateChromagram(samples.subarray(0, 8192), sampleRate);

  const startChroma = performance.now();
  const iterations = 100;
  for (let i = 0; i < iterations; i++) {
    await (detector as any).calculateChromagram(samples.subarray(0, 8192), sampleRate);
  }
  const endChroma = performance.now();
  console.log(`Average Chromagram Duration: ${((endChroma - startChroma) / iterations).toFixed(2)}ms`);

  // 2. Benchmark Chord Progression Detection (Zero-Copy)
  console.log('\n--- Phase 2: Chord Progression Detection (120s Track) ---');
  const startProg = performance.now();
  const chords = await detector.detectChordProgression(mockAudioBuffer, 2);
  const endProg = performance.now();
  console.log(`Total Duration: ${(endProg - startProg).toFixed(2)}ms for ${chords.length} segments`);
  console.log(`Average Segment Duration: ${((endProg - startProg) / chords.length).toFixed(2)}ms`);

  console.log('\nSample Chords:', chords.slice(0, 5).map(c => `${c.time}s: ${c.chord}`).join(', '));

  console.log('\n⚡ Benchmark Complete.');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
