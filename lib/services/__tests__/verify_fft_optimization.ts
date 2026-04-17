
import { FastFFTEngine } from '../fastFFTEngine';

// Mock AudioContext for Node environment
class MockAudioContext {
  sampleRate = 44100;
  createAnalyser() {
    return {
      fftSize: 2048,
      smoothingTimeConstant: 0,
      frequencyBinCount: 1024,
      getFloatFrequencyData: () => {},
      getFloatTimeDomainData: () => {},
      connect: () => {},
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
    };
  }
  destination = {};
}

// Mock OfflineAudioContext
class MockOfflineAudioContext extends MockAudioContext {
  constructor(channels: number, length: number, sampleRate: number) {
    super();
  }
  startRendering() {
    return Promise.resolve();
  }
}

(global as any).window = {
  AudioContext: MockAudioContext,
};
(global as any).AudioContext = MockAudioContext;
(global as any).OfflineAudioContext = MockOfflineAudioContext;

/**
 * Baseline recursive FFT for comparison (original implementation)
 */
function recursiveFFT(samples: Float32Array): Float32Array {
  const n = samples.length;
  if (n <= 1) {
    const result = new Float32Array(n * 2);
    result[0] = samples[0];
    result[1] = 0;
    return result;
  }
  const even = new Float32Array(n / 2);
  const odd = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    even[i] = samples[i * 2];
    odd[i] = samples[i * 2 + 1];
  }
  const fftEven = recursiveFFT(even);
  const fftOdd = recursiveFFT(odd);
  const result = new Float32Array(n * 2);
  for (let k = 0; k < n / 2; k++) {
    const angle = -2 * Math.PI * k / n;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tr = cos * fftOdd[k * 2] - sin * fftOdd[k * 2 + 1];
    const ti = sin * fftOdd[k * 2] + cos * fftOdd[k * 2 + 1];
    result[k * 2] = fftEven[k * 2] + tr;
    result[k * 2 + 1] = fftEven[k * 2 + 1] + ti;
    result[(k + n / 2) * 2] = fftEven[k * 2] - tr;
    result[(k + n / 2) * 2 + 1] = fftEven[k * 2 + 1] - ti;
  }
  return result;
}

async function runBenchmark() {
  const fftSize = 4096;
  const samples = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100) + 0.5 * Math.sin(2 * Math.PI * 880 * i / 44100);
  }

  console.log(`Running FFT Benchmark (Size: ${fftSize})...`);

  // 1. Correctness Check
  const complexBuffer = new Float32Array(fftSize * 2);
  for (let i = 0; i < fftSize; i++) {
    complexBuffer[i * 2] = samples[i];
    complexBuffer[i * 2 + 1] = 0;
  }

  const baselineResult = recursiveFFT(samples);
  FastFFTEngine.cooleyTukeyFFT(complexBuffer);

  let maxDiff = 0;
  for (let i = 0; i < complexBuffer.length; i++) {
    const diff = Math.abs(complexBuffer[i] - baselineResult[i]);
    if (diff > maxDiff) maxDiff = diff;
  }

  console.log(`Accuracy Check: Max difference between iterative and recursive: ${maxDiff.toExponential()}`);
  if (maxDiff > 1e-10) {
    console.error('FAILED: Iterative FFT output differs significantly from recursive baseline.');
    process.exit(1);
  }
  console.log('PASSED: Mathematical correctness verified.');

  // 2. Performance Check
  const iterations = 1000;

  // Warm up
  for (let i = 0; i < 100; i++) {
    recursiveFFT(samples);
    const b = new Float32Array(fftSize * 2);
    FastFFTEngine.cooleyTukeyFFT(b);
  }

  const startRecursive = performance.now();
  for (let i = 0; i < iterations; i++) {
    recursiveFFT(samples);
  }
  const endRecursive = performance.now();
  const recursiveTime = endRecursive - startRecursive;

  const startIterative = performance.now();
  const perfBuffer = new Float32Array(fftSize * 2);
  for (let i = 0; i < iterations; i++) {
    // In-place means we don't reallocate the buffer every time in a real use case,
    // but here we clear it to be fair to the "work" being done.
    perfBuffer.fill(0);
    for(let j=0; j<fftSize; j++) perfBuffer[j*2] = samples[j];
    FastFFTEngine.cooleyTukeyFFT(perfBuffer);
  }
  const endIterative = performance.now();
  const iterativeTime = endIterative - startIterative;

  console.log(`\nResults over ${iterations} iterations:`);
  console.log(`Recursive Baseline: ${recursiveTime.toFixed(2)}ms (${(recursiveTime / iterations).toFixed(4)}ms per FFT)`);
  console.log(`Iterative Optimized: ${iterativeTime.toFixed(2)}ms (${(iterativeTime / iterations).toFixed(4)}ms per FFT)`);
  console.log(`Speedup: ${(recursiveTime / iterativeTime).toFixed(2)}x`);

  const memorySaved = (fftSize * 4 * Math.log2(fftSize) * iterations) / (1024 * 1024);
  console.log(`Estimated Memory Churn Saved: ~${memorySaved.toFixed(2)} MB`);
}

runBenchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
