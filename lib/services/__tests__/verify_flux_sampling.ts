import { performance } from 'perf_hooks';

// Mock window for Node execution
(global as any).window = {
  AudioContext: class {
    createAnalyser() {
      return { fftSize: 2048, frequencyBinCount: 1024 };
    }
  },
};

import AudioAnalysisService from '../audioAnalysisService';

async function runBenchmark() {
  console.log('⚡ Benchmarking Spectral Flux Sampling Optimization...');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const durationSeconds = 300; // 5-minute audio track
  const samples = new Float32Array(sampleRate * durationSeconds);

  // Generate synthetic multi-frequency signal
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    samples[i] =
      Math.sin(2 * Math.PI * 440 * t) +
      Math.sin(2 * Math.PI * 880 * t * t * 0.05) +
      (Math.random() - 0.5) * 0.1;
  }

  const fftSize = 8192;
  const hopSize = fftSize / 2;

  // Unoptimized full-frame traversal
  const startFull = performance.now();
  let totalFluxFull = 0;
  let frameCountFull = 0;
  for (let i = 0; i < samples.length - fftSize - hopSize; i += hopSize) {
    let flux = 0;
    for (let j = 0; j < fftSize; j++) {
      const diff = samples[i + hopSize + j] - samples[i + j];
      flux += diff * diff;
    }
    totalFluxFull += Math.sqrt(flux / fftSize);
    frameCountFull++;
  }
  const fluxFull = frameCountFull > 0 ? totalFluxFull / frameCountFull : 0;
  const durationFull = performance.now() - startFull;

  // Optimized method in AudioAnalysisService
  const startOpt = performance.now();
  const fluxOpt = (service as any).calculateSpectralFlux(samples, fftSize, sampleRate);
  const durationOpt = performance.now() - startOpt;

  const delta = Math.abs(fluxFull - fluxOpt);
  const speedup = durationFull / durationOpt;

  console.log(`Full Traversal Duration: ${durationFull.toFixed(2)}ms (evaluated ${frameCountFull} frames, flux: ${fluxFull.toFixed(6)})`);
  console.log(`Optimized Duration: ${durationOpt.toFixed(2)}ms (flux: ${fluxOpt.toFixed(6)})`);
  console.log(`Speedup: ${speedup.toFixed(2)}x`);
  console.log(`Absolute Difference: ${delta.toFixed(6)}`);

  if (delta > 0.005) {
    console.error('❌ Verification FAILED: Difference exceeds 0.005 tolerance!');
    process.exit(1);
  } else {
    console.log('✅ Verification PASSED: Spectral flux error is within tight tolerance.');
  }
}

runBenchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});
