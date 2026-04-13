
import { FastFFTEngine } from '../fastFFTEngine';

/**
 * Baseline Recursive FFT (Current Implementation)
 * Captured here to compare performance and verify correctness.
 */
function recursiveFFT(samples: Float32Array, twiddleCache: Map<number, Float32Array>): Float32Array {
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

  const fftEven = recursiveFFT(even, twiddleCache);
  const fftOdd = recursiveFFT(odd, twiddleCache);

  const result = new Float32Array(n * 2);

  // Get twiddles (mimicking internal getTwiddleFactors)
  let factors = twiddleCache.get(n);
  if (!factors) {
    factors = new Float32Array(n);
    for (let k = 0; k < n / 2; k++) {
      const angle = -2 * Math.PI * k / n;
      factors[k * 2] = Math.cos(angle);
      factors[k * 2 + 1] = Math.sin(angle);
    }
    twiddleCache.set(n, factors);
  }

  for (let k = 0; k < n / 2; k++) {
    const cos = factors[k * 2];
    const sin = factors[k * 2 + 1];
    const tReal = cos * fftOdd[k * 2] - sin * fftOdd[k * 2 + 1];
    const tImag = sin * fftOdd[k * 2] + cos * fftOdd[k * 2 + 1];

    result[k * 2] = fftEven[k * 2] + tReal;
    result[k * 2 + 1] = fftEven[k * 2 + 1] + tImag;
    result[(k + n / 2) * 2] = fftEven[k * 2] - tReal;
    result[(k + n / 2) * 2 + 1] = fftEven[k * 2 + 1] - tImag;
  }

  return result;
}

async function runBenchmark() {
  console.log('⚡ Starting FFT Optimization Benchmark...');

  const fftSize = 8192;
  const iterations = 500;
  const samples = new Float32Array(fftSize);

  // Fill with a test signal (sine wave + noise)
  for (let i = 0; i < fftSize; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100) + (Math.random() * 0.1);
  }

  const twiddleCache = new Map<number, Float32Array>();

  // 1. Benchmark Baseline (Recursive)
  console.log(`\n--- Baseline: Recursive FFT (${iterations} iterations) ---`);
  const startBaseline = Date.now();
  for (let i = 0; i < iterations; i++) {
    recursiveFFT(samples, twiddleCache);
  }
  const endBaseline = Date.now();
  const baselineTime = endBaseline - startBaseline;
  console.log(`Total Time: ${baselineTime}ms`);
  console.log(`Average Time: ${(baselineTime / iterations).toFixed(3)}ms`);

  // 2. Benchmark Optimized (Iterative In-Place)
  console.log(`\n--- Optimized: Iterative In-Place FFT (${iterations} iterations) ---`);
  const startOptimized = Date.now();
  for (let i = 0; i < iterations; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples);
  }
  const endOptimized = Date.now();
  const optimizedTime = endOptimized - startOptimized;
  console.log(`Total Time: ${optimizedTime}ms`);
  console.log(`Average Time: ${(optimizedTime / iterations).toFixed(3)}ms`);
  console.log(`Speedup: ${(baselineTime / optimizedTime).toFixed(2)}x`);

  // 3. Verify Correctness
  const baselineResult = recursiveFFT(samples, twiddleCache);
  const optimizedResult = FastFFTEngine.cooleyTukeyFFT(samples);

  let error = 0;
  for (let i = 0; i < baselineResult.length; i++) {
    error += Math.abs(baselineResult[i] - optimizedResult[i]);
  }
  console.log(`\nVerification error (vs baseline): ${error.toExponential(4)}`);

  if (error < 1e-5) {
    console.log('✅ Optimization verified! Results are mathematically equivalent.');
  } else {
    console.log('❌ Optimization failed verification! Significant deviation detected.');
  }
}

// Mock window and AudioContext for Node environment
(globalThis as any).window = {};
(globalThis as any).AudioContext = class {
  createAnalyser() { return { fftSize: 2048 }; }
};
(globalThis as any).OfflineAudioContext = class {};

runBenchmark().catch(console.error);
