import { AudioAnalyzer } from '../audioAnalyzer';
import { FastFFTEngine } from '../fastFFTEngine';
import { performance } from 'perf_hooks';

/**
 * Benchmark script for AudioAnalyzer FFT optimization.
 */
async function runBenchmark() {
  console.log('⚡ Starting AudioAnalyzer Performance Benchmark...');

  // Mock AudioContext and AudioBuffer
  const sampleRate = 44100;
  const length = sampleRate * 10; // 10 seconds
  const mono = new Float32Array(length).map(() => Math.random() * 2 - 1);

  const mockAudioBuffer = {
    sampleRate,
    length,
    numberOfChannels: 1,
    getChannelData: () => mono,
  } as unknown as AudioBuffer;

  // Mock global for service initialization
  (global as any).window = {
    AudioContext: class {
      state = 'suspended';
      close = async () => { this.state = 'closed'; };
      decodeAudioData = async () => mockAudioBuffer;
    }
  };
  (global as any).AudioContext = (global as any).window.AudioContext;
  (global as any).fetch = async () => ({
    arrayBuffer: async () => new ArrayBuffer(0)
  });

  const fftSize = 2048;

  console.log('\n--- Old Approach (Simulated) ---');
  const startOld = performance.now();
  // Simulate 2 FFTs and 2 Buffer slices
  for (let i = 0; i < 2; i++) {
    const startSample = Math.floor(mono.length / 2) - Math.floor(fftSize / 2);
    const segment = mono.slice(startSample, startSample + fftSize); // slice is slow
    const paddedSamples = new Float32Array(fftSize);
    paddedSamples.set(segment);
    FastFFTEngine.cooleyTukeyFFT(paddedSamples, undefined, FastFFTEngine.getHannWindow(fftSize));
  }
  const endOld = performance.now();
  console.log(`Old Duration: ${(endOld - startOld).toFixed(4)}ms`);

  console.log('\n--- New Optimized Approach ---');
  const startNew = performance.now();
  // 1. Consolidated FFT
  const magnitudes = (AudioAnalyzer as any).performFFT(mono, fftSize, sampleRate);
  // 2. Reuse in metrics
  const clarity = (AudioAnalyzer as any).calculateSpectralClarity(magnitudes, sampleRate);
  const balance = (AudioAnalyzer as any).calculateFrequencyBalance(magnitudes, sampleRate);
  const endNew = performance.now();
  console.log(`New Duration: ${(endNew - startNew).toFixed(4)}ms`);

  const speedup = (endOld - startOld) / (endNew - startNew);
  console.log(`\n🚀 Estimated Speedup: ${speedup.toFixed(2)}x`);

  // Verify Functional Correctness
  console.log('\n--- Verification ---');
  console.log(`Clarity: ${clarity.toFixed(4)}`);
  console.log(`Balance: ${balance.toFixed(4)}`);

  if (clarity >= 0 && clarity <= 1 && balance >= 0 && balance <= 1) {
    console.log('✅ Values within valid range [0, 1]');
  } else {
    console.error('❌ Values out of range!');
    process.exit(1);
  }

  console.log('\n⚡ Benchmark Complete.');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
