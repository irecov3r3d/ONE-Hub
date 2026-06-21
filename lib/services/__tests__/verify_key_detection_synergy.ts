
import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock AudioContext for Node environment
const mockAudioContext = {
  createAnalyser: () => ({}),
} as any;

/**
 * Baseline Chromagram calculation (original logic with Math.log2)
 */
function baselineCalculateChromagram(linearMagnitudes: Float32Array, sampleRate: number): number[] {
  const chromagram = new Array(12).fill(0);
  const fftSize = (linearMagnitudes.length - 1) * 2;
  const binFreqFactor = sampleRate / fftSize;

  for (let i = 0; i < linearMagnitudes.length; i++) {
    const freq = i * binFreqFactor;
    if (freq < 80 || freq > 5000) continue;

    const midiNote = 69 + 12 * Math.log2(freq / 440);
    let pitchClass = Math.round(midiNote) % 12;
    if (pitchClass < 0) pitchClass += 12;

    chromagram[pitchClass] += linearMagnitudes[i];
  }

  return chromagram;
}

async function runBenchmark() {
  console.log('⚡ Starting Integrated Spectral Key Detection Synergy Benchmark...');

  const fftSize = 8192;
  const sampleRate = 44100;
  const binCount = fftSize / 2 + 1;
  const magnitudes = new Float32Array(binCount);

  // Fill with some dummy data (A4 harmonic series)
  for (let h = 1; h <= 10; h++) {
    const bin = Math.round((440 * h * fftSize) / sampleRate);
    if (bin < binCount) magnitudes[bin] = 1.0 / h;
  }

  const detector = new AdvancedKeyDetection(mockAudioContext);
  const iterations = 5000;

  // 1. Warm up
  baselineCalculateChromagram(magnitudes, sampleRate);
  detector.calculateChromagram(magnitudes, sampleRate);

  // 2. Benchmark Baseline (Math.log2)
  const startBase = Date.now();
  for (let i = 0; i < iterations; i++) {
    baselineCalculateChromagram(magnitudes, sampleRate);
  }
  const endBase = Date.now();
  const baseTime = (endBase - startBase) / iterations;

  // 3. Benchmark Optimized (Pitch Class Cache)
  const startOpt = Date.now();
  for (let i = 0; i < iterations; i++) {
    detector.calculateChromagram(magnitudes, sampleRate);
  }
  const endOpt = Date.now();
  const optTime = (endOpt - startOpt) / iterations;

  console.log(`\nResults (FFT Size: ${fftSize}, Iterations: ${iterations}):`);
  console.log(`- Baseline (Math.log2): ${baseTime.toFixed(4)}ms / op`);
  console.log(`- Bolt (Cached Mapping): ${optTime.toFixed(4)}ms / op`);
  console.log(`- Chromagram Speedup:   ${(baseTime / optTime).toFixed(2)}x`);

  // 4. Verify Correctness
  const baseChroma = baselineCalculateChromagram(magnitudes, sampleRate);
  const optChroma = detector.calculateChromagram(magnitudes, sampleRate);

  let maxDiff = 0;
  for (let i = 0; i < 12; i++) {
    const diff = Math.abs(baseChroma[i] - optChroma[i]);
    if (diff > maxDiff) maxDiff = diff;
  }

  console.log(`\nNumerical Verification:`);
  console.log(`- Max chromagram difference: ${maxDiff.toExponential(4)}`);

  if (maxDiff < 1e-10) {
    console.log('✅ Chromagram calculation verified!');
  } else {
    console.log('❌ Chromagram mismatch detected!');
    process.exit(1);
  }

  // 5. Verify Spectral Reuse Integration
  console.log(`\nVerifying Spectral Reuse (Key Detection)...`);
  const startKey = Date.now();
  const keyResult = detector.detectKeyFromMagnitudes(magnitudes, sampleRate);
  const endKey = Date.now();

  console.log(`- Detected Key: ${keyResult.key} (${(keyResult.confidence * 100).toFixed(1)}% confidence)`);
  console.log(`- Execution time: ${(endKey - startKey).toFixed(3)}ms`);

  if (keyResult.key === 'A Major') {
    console.log('✅ Key detection correct for 440Hz harmonic series!');
  } else {
    console.log(`⚠️ Expected A Major, but got ${keyResult.key}. (This depends on the key profiles and weights)`);
  }
}

runBenchmark().catch(console.error);
