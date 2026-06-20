
import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

/**
 * Benchmark for Key Detection and Chord Progression optimizations.
 */
async function runBenchmark() {
  console.log('⚡ Starting Key/Chord Detection Performance Benchmark...');

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

  // Mock global objects
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};

  // Mock OfflineAudioContext for the baseline simulation
  (global as any).OfflineAudioContext = class {
    constructor() {}
    createBuffer() {
      return {
        numberOfChannels: 1,
        getChannelData: () => new Float32Array(sampleRate * 2),
      };
    }
  };

  const detector = new AdvancedKeyDetection(new (global as any).AudioContext());

  // 1. Simulate Baseline (with allocations)
  console.log('\n--- Phase 1: Baseline Simulation (with AudioBuffer allocations) ---');
  const startBase = performance.now();
  const hopSize = 2;
  const segments = Math.floor(duration / hopSize);

  for (let i = 0; i < segments; i++) {
      // Simulation of extractSegment + detectKey(AudioBuffer)
      const offlineContext = new (global as any).OfflineAudioContext();
      const newBuffer = offlineContext.createBuffer(1, sampleRate * 2, sampleRate);
      const targetData = newBuffer.getChannelData(0);
      const startSample = i * hopSize * sampleRate;
      targetData.set(channelData.subarray(startSample, startSample + sampleRate * 2));

      // Call detectKey with AudioBuffer
      await detector.detectKey(newBuffer as unknown as AudioBuffer);
  }
  const endBase = performance.now();
  const baseTime = endBase - startBase;
  console.log(`Duration: ${baseTime.toFixed(2)}ms for ${segments} segments`);

  // 2. Benchmark Optimized (Zero-copy)
  console.log('\n--- Phase 2: Optimized Pipeline (Zero-copy subarray) ---');
  const startOpt = performance.now();
  const chords = await detector.detectChordProgression(mockAudioBuffer, hopSize);
  const endOpt = performance.now();
  const optTime = endOpt - startOpt;

  console.log(`Duration: ${optTime.toFixed(2)}ms for ${chords.length} segments`);
  console.log(`Speedup: ${(baseTime / optTime).toFixed(2)}x`);

  console.log('\n⚡ Benchmark Complete.');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
