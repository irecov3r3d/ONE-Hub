import { AudioAnalyzer } from '../audioAnalyzer';

// Mock AudioContext and AudioBuffer for Node testing environment
class MockAudioBuffer {
  duration = 30;
  sampleRate = 44100;
  numberOfChannels = 2;
  length = 44100 * 30;
  private dataL: Float32Array;
  private dataR: Float32Array;

  constructor() {
    this.dataL = new Float32Array(this.length);
    this.dataR = new Float32Array(this.length);
    for (let i = 0; i < this.length; i++) {
      this.dataL[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5 + Math.sin(2 * Math.PI * 5000 * i / 44100) * 0.2;
      this.dataR[i] = Math.cos(2 * Math.PI * 440 * i / 44100) * 0.5 + Math.cos(2 * Math.PI * 5000 * i / 44100) * 0.2;
    }
  }

  getChannelData(channel: number): Float32Array {
    return channel === 0 ? this.dataL : this.dataR;
  }
}

class MockAudioContext {
  decodeAudioData() {
    return Promise.resolve(new MockAudioBuffer());
  }
}

(globalThis as any).window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext
};
(globalThis as any).AudioContext = MockAudioContext;

async function runBenchmark() {
  console.log('=== Verifying AudioAnalyzer FFT Consolidation Optimization ===\n');

  const audioBuffer = new MockAudioBuffer();
  const iterations = 50;

  // Measure single-pass stats
  const stats = (AudioAnalyzer as any).analyzeBasicStats(audioBuffer);

  // Un-optimized approach simulation: performing performFFT twice
  const unoptimizedStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const fft1 = (AudioAnalyzer as any).performFFT(stats.mono, 2048, audioBuffer.sampleRate);
    const clarity = (AudioAnalyzer as any).calculateSpectralClarity(fft1, audioBuffer.sampleRate);

    const fft2 = (AudioAnalyzer as any).performFFT(stats.mono, 2048, audioBuffer.sampleRate);
    const balance = (AudioAnalyzer as any).calculateFrequencyBalance(fft2, audioBuffer.sampleRate);
  }
  const unoptimizedEnd = performance.now();
  const unoptimizedDuration = unoptimizedEnd - unoptimizedStart;

  // Optimized approach: performFFT once and share frequencyBins
  const optimizedStart = performance.now();
  let clarityOpt = 0;
  let balanceOpt = 0;
  for (let i = 0; i < iterations; i++) {
    const frequencyBins = (AudioAnalyzer as any).performFFT(stats.mono, 2048, audioBuffer.sampleRate);
    clarityOpt = (AudioAnalyzer as any).calculateSpectralClarity(frequencyBins, audioBuffer.sampleRate);
    balanceOpt = (AudioAnalyzer as any).calculateFrequencyBalance(frequencyBins, audioBuffer.sampleRate);
  }
  const optimizedEnd = performance.now();
  const optimizedDuration = optimizedEnd - optimizedStart;

  // Measure unoptimized single iteration output for correctness comparison
  const fft1 = (AudioAnalyzer as any).performFFT(stats.mono, 2048, audioBuffer.sampleRate);
  const clarityUnopt = (AudioAnalyzer as any).calculateSpectralClarity(fft1, audioBuffer.sampleRate);

  const fft2 = (AudioAnalyzer as any).performFFT(stats.mono, 2048, audioBuffer.sampleRate);
  const balanceUnopt = (AudioAnalyzer as any).calculateFrequencyBalance(fft2, audioBuffer.sampleRate);

  console.log(`Un-optimized (${iterations} iterations, 2x FFT per run): ${unoptimizedDuration.toFixed(2)} ms`);
  console.log(`Optimized (${iterations} iterations, 1x FFT per run):    ${optimizedDuration.toFixed(2)} ms`);
  const speedup = (unoptimizedDuration / optimizedDuration).toFixed(2);
  console.log(`⚡ Speedup: ${speedup}x faster\n`);

  console.log('--- Accuracy & Correctness Verification ---');
  console.log(`Un-optimized Spectral Clarity: ${clarityUnopt}`);
  console.log(`Optimized Spectral Clarity:    ${clarityOpt}`);
  console.log(`Un-optimized Frequency Balance: ${balanceUnopt}`);
  console.log(`Optimized Frequency Balance:    ${balanceOpt}`);

  const clarityDiff = Math.abs(clarityUnopt - clarityOpt);
  const balanceDiff = Math.abs(balanceUnopt - balanceOpt);

  if (clarityDiff < 1e-10 && balanceDiff < 1e-10) {
    console.log('\n✅ VERIFICATION SUCCESS: Output metrics are 100% numerically identical!');
  } else {
    console.error('\n❌ VERIFICATION FAILED: Numerical discrepancy detected!');
    process.exit(1);
  }
}

runBenchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
