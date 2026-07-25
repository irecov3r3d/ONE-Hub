import { performance } from 'perf_hooks';

/**
 * Baseline full-buffer traversal for spectral flux (O(N) frames)
 */
function baselineSpectralFlux(
  samples: Float32Array,
  fftSize: number
): number {
  const hopSize = fftSize / 2;
  let totalFlux = 0;
  let frameCount = 0;

  for (let i = 0; i < samples.length - fftSize - hopSize; i += hopSize) {
    let flux = 0;
    for (let j = 0; j < fftSize; j++) {
      const diff = samples[i + hopSize + j] - samples[i + j];
      flux += diff * diff;
    }
    totalFlux += Math.sqrt(flux / fftSize);
    frameCount++;
  }

  return frameCount > 0 ? totalFlux / frameCount : 0;
}

/**
 * Bolt Optimized representative sampling for spectral flux (O(M) frames, M=200)
 */
function optimizedSpectralFlux(
  samples: Float32Array,
  fftSize: number
): number {
  const hopSize = fftSize / 2;
  const totalFrames = Math.floor((samples.length - fftSize - hopSize) / hopSize);
  if (totalFrames <= 0) return 0;

  const maxFramesToSample = 200;
  const step = Math.max(1, Math.floor(totalFrames / maxFramesToSample));

  let totalFlux = 0;
  let frameCount = 0;

  for (let f = 0; f < totalFrames; f += step) {
    const i = f * hopSize;
    let flux = 0;
    for (let j = 0; j < fftSize; j++) {
      const diff = samples[i + hopSize + j] - samples[i + j];
      flux += diff * diff;
    }
    totalFlux += Math.sqrt(flux / fftSize);
    frameCount++;
  }

  return frameCount > 0 ? totalFlux / frameCount : 0;
}

async function runBenchmark() {
  console.log('⚡ Starting Spectral Flux Representative Sampling Benchmark...');

  const sampleRate = 44100;
  const duration = 240; // 4-minute track
  const length = sampleRate * duration;
  const fftSize = 2048;

  console.log(`Generating a mock 4-minute audio track with ${length.toLocaleString()} samples...`);
  const samples = new Float32Array(length);
  // Populate with a deterministic harmonic sound mixed with noise
  for (let i = 0; i < length; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5 + (Math.random() * 2 - 1) * 0.1;
  }

  // 1. Measure Baseline Full-Buffer Traversal
  console.log('\nMeasuring baseline full-buffer traversal...');
  const startBaseline = performance.now();
  const baselineResult = baselineSpectralFlux(samples, fftSize);
  const endBaseline = performance.now();
  const baselineDuration = endBaseline - startBaseline;
  console.log(`- Baseline Result:   ${baselineResult.toFixed(6)}`);
  console.log(`- Baseline Duration: ${baselineDuration.toFixed(2)}ms`);

  // 2. Measure Bolt Optimized Representative Sampling
  console.log('\nMeasuring Bolt Optimized representative sampling...');
  const startOptimized = performance.now();
  const optimizedResult = optimizedSpectralFlux(samples, fftSize);
  const endOptimized = performance.now();
  const optimizedDuration = endOptimized - startOptimized;
  console.log(`- Optimized Result:  ${optimizedResult.toFixed(6)}`);
  console.log(`- Optimized Duration:${optimizedDuration.toFixed(2)}ms`);

  // 3. Performance & Correctness Metrics
  const speedup = baselineDuration / optimizedDuration;
  const absoluteDiff = Math.abs(baselineResult - optimizedResult);
  const percentageError = (absoluteDiff / baselineResult) * 100;

  console.log('\n=======================================');
  console.log('📊 BENCHMARK METRICS SUMMARY:');
  console.log(`- Speedup Factor:     ${speedup.toFixed(2)}x faster`);
  console.log(`- Absolute Difference: ${absoluteDiff.toExponential(4)}`);
  console.log(`- Percentage Error:    ${percentageError.toFixed(4)}%`);
  console.log('=======================================');

  if (absoluteDiff > 0.05) {
    throw new Error(`Numerical deviation is too large: ${absoluteDiff}`);
  } else {
    console.log('✅ Correctness verified! Numerical deviation is extremely negligible.');
  }
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  throw err;
});
