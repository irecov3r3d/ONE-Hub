import { AudioAnalysisService } from '../audioAnalysisService';
import { performance } from 'perf_hooks';

/**
 * Benchmark script to verify the speedup of spectral flux sampling.
 */
async function runBenchmark() {
  console.log('⚡ Starting Spectral Flux Sampling Benchmark...');

  const sampleRate = 44100;
  const duration = 300; // 5 minutes
  const length = sampleRate * duration;
  const samples = new Float32Array(length);

  // Fill with random noise
  for (let i = 0; i < length; i++) {
    samples[i] = Math.random() * 2 - 1;
  }

  // Mock global window/AudioContext for service initialization
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};

  const service = new AudioAnalysisService();
  const fftSize = 8192;

  console.log(`\nAnalyzing ${duration}s track (${length.toLocaleString()} samples)...`);

  // Measure optimized spectral flux
  const start = performance.now();
  const flux = (service as any).calculateSpectralFlux(samples, fftSize, sampleRate);
  const end = performance.now();

  console.log(`\nOptimized Flux Duration: ${(end - start).toFixed(2)}ms`);
  console.log(`Calculated Flux: ${flux.toFixed(6)}`);

  console.log('\n⚡ Benchmark Complete.');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
