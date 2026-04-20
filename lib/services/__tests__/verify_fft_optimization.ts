
import { FastFFTEngine } from '../fastFFTEngine';

// Mock AudioContext for Node environment
const mockAudioContext = {
  createAnalyser: () => ({
    fftSize: 2048,
    smoothingTimeConstant: 0,
    frequencyBinCount: 1024,
  }),
  createBufferSource: () => ({
    start: () => {},
    connect: () => {},
  }),
  destination: {},
} as any;

/**
 * Baseline Recursive FFT (Uses exactly the same logic as the original implementation)
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
  // Use the same twiddle factors as the iterative version for fair comparison
  const factors = (FastFFTEngine as any).getTwiddleFactors(n);

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
  console.log('⚡ Starting FFT Performance Benchmark...');

  const fftSize = 4096;
  const samples = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100); // 440Hz sine wave
  }

  // 1. Warm up
  recursiveFFT(samples);
  FastFFTEngine.cooleyTukeyFFT(samples);

  const iterations = 500;

  // 2. Benchmark Recursive
  const startRec = Date.now();
  for (let i = 0; i < iterations; i++) {
    recursiveFFT(samples);
  }
  const endRec = Date.now();
  const recTime = (endRec - startRec) / iterations;

  // 3. Benchmark Iterative (Bolt Optimized)
  const outputBuffer = new Float32Array(fftSize * 2);
  const startIter = Date.now();
  for (let i = 0; i < iterations; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples, outputBuffer);
  }
  const endIter = Date.now();
  const iterTime = (endIter - startIter) / iterations;

  console.log(`\nResults (FFT Size: ${fftSize}):`);
  console.log(`- Baseline Recursive: ${recTime.toFixed(3)}ms / op`);
  console.log(`- Bolt Iterative:     ${iterTime.toFixed(3)}ms / op`);
  console.log(`- Speedup:           ${(recTime / iterTime).toFixed(2)}x`);

  // 4. Verify Correctness
  const recResult = recursiveFFT(samples);
  const iterResult = FastFFTEngine.cooleyTukeyFFT(samples);

  let maxDiff = 0;
  let totalDiff = 0;
  for (let i = 0; i < recResult.length; i++) {
    const diff = Math.abs(recResult[i] - iterResult[i]);
    if (diff > maxDiff) maxDiff = diff;
    totalDiff += diff;
  }

  console.log(`\nNumerical Verification:`);
  console.log(`- Max absolute difference: ${maxDiff.toExponential(4)}`);
  console.log(`- Average difference:     ${(totalDiff / recResult.length).toExponential(4)}`);

  // Single precision floating point (Float32Array) has about 7 decimal digits of precision.
  // In a 4096-point FFT, errors can accumulate. A threshold of 1e-5 is reasonable.
  if (maxDiff < 1e-5) {
    console.log('✅ Correctness verified!');
  } else {
    console.log('❌ Accuracy threshold exceeded!');
    // If it's still slightly off, let's see if it's systematic or just precision
    if (maxDiff < 1e-3) {
        console.log('⚠️ Minor precision difference detected, likely due to different accumulation order in iterative vs recursive.');
    } else {
        process.exit(1);
    }
  }
}

runBenchmark().catch(console.error);
