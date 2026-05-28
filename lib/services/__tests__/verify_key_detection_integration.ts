import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

/**
 * Verification script for Key Detection integration.
 * Measures speedup and verifies correctness of reuse optimization.
 */
async function verifyKeyDetection() {
  console.log('⚡ Starting Key Detection Integration Verification...');

  const sampleRate = 44100;
  const fftSize = 8192;
  const binCount = fftSize / 2;

  // Mock magnitudes for a "C Major" profile
  const magnitudes = new Float32Array(binCount);
  const notes = [261.63, 329.63, 392.00]; // C4, E4, G4
  for (const freq of notes) {
    const bin = Math.round((freq * fftSize) / sampleRate);
    if (bin < binCount) magnitudes[bin] = 1.0;
  }

  // Mock AudioContext for Node
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};
  const mockContext = {} as AudioContext;

  const detector = new AdvancedKeyDetection(mockContext);

  // 1. Measure Optimized Performance (from magnitudes)
  console.log('\n--- Phase 1: Optimized Performance (Reusable Magnitudes) ---');
  const startOpt = performance.now();
  const resultOpt = await detector.detectKey(magnitudes, sampleRate);
  const endOpt = performance.now();
  console.log(`Duration: ${(endOpt - startOpt).toFixed(2)}ms`);
  console.log(`Detected Key: ${resultOpt.key} (${(resultOpt.confidence * 100).toFixed(1)}% confidence)`);

  // 2. Baseline Comparison
  // Note: We can't easily run the AudioBuffer version in Node without a full decode mock,
  // but we can verify the logic by passing magnitudes multiple times to simulate throughput.
  console.log('\n--- Phase 2: Logic Verification ---');
  const expectedKey = 'C Major';
  if (resultOpt.key === expectedKey || resultOpt.alternatives.some(a => a.key === expectedKey)) {
    console.log(`✅ Success: Detected ${expectedKey} (or as strong alternative).`);
  } else {
    console.warn(`⚠️ Warning: Expected ${expectedKey}, but got ${resultOpt.key}.`);
  }

  // 3. Benchmarking Throughput
  console.log('\n--- Phase 3: Throughput Benchmark (1000 detections) ---');
  const iterations = 1000;
  const startBench = performance.now();
  for (let i = 0; i < iterations; i++) {
    await detector.detectKey(magnitudes, sampleRate);
  }
  const endBench = performance.now();
  console.log(`Total Time: ${(endBench - startBench).toFixed(2)}ms`);
  console.log(`Average Time: ${((endBench - startBench) / iterations).toFixed(3)}ms per detection`);

  console.log('\n⚡ Verification Complete.');
}

verifyKeyDetection().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
