import { AudioAnalysisService } from '../audioAnalysisService';
import { performance } from 'perf_hooks';

/**
 * Benchmark script for AudioAnalysisService optimizations.
 * Measures execution time for Basic Stats, Frequency Analysis, and Peak Detection.
 */
async function runBenchmark() {
  console.log('⚡ Starting AudioAnalysisService Performance Benchmark...');

  // Mock AudioContext and AudioBuffer for Node environment
  const sampleRate = 44100;
  const duration = 240; // 4 minutes
  const length = sampleRate * duration;

  const leftChannel = new Float32Array(length);
  const rightChannel = new Float32Array(length);

  // Fill with random noise
  for (let i = 0; i < length; i++) {
    leftChannel[i] = Math.random() * 2 - 1;
    rightChannel[i] = Math.random() * 2 - 1;
  }

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 2,
    getChannelData: (ch: number) => (ch === 0 ? leftChannel : rightChannel),
  } as unknown as AudioBuffer;

  // Mock global window/AudioContext for service initialization
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};

  const service = new AudioAnalysisService();

  // 1. Benchmark analyzeBasicStats
  console.log('\n--- Phase 1: Basic Stats Collection (O(N) Loop) ---');
  const startStats = performance.now();
  const stats = (service as any).analyzeBasicStats([leftChannel, rightChannel], sampleRate);
  const endStats = performance.now();
  console.log(`Duration: ${(endStats - startStats).toFixed(2)}ms for ${length.toLocaleString()} samples`);

  // 2. Phase 2: Frequency Analysis
  console.log('\n--- Phase 2: Frequency Analysis (Spectral Features) ---');
  const fftSize = 8192;
  const spectrum = new Array(fftSize / 2).fill(0).map((_, i) => ({
    frequency: (i * sampleRate) / fftSize,
    magnitude: -Math.random() * 60,
    phase: Math.random() * Math.PI,
  }));

  const startFreq = performance.now();
  // We call it multiple times to simulate the full analysis overhead
  const freqAnalysis = await (service as any).analyzeFrequency(mockAudioBuffer, stats.mono, spectrum);
  const endFreq = performance.now();
  console.log(`Duration: ${(endFreq - startFreq).toFixed(2)}ms for ${spectrum.length} bins`);

  // 3. Phase 3: Dominant Frequency Detection
  console.log('\n--- Phase 3: Dominant Frequency Detection ---');
  const startPeaks = performance.now();
  const peaks = (service as any).findDominantFrequencies(spectrum, sampleRate, fftSize);
  const endPeaks = performance.now();
  console.log(`Duration: ${(endPeaks - startPeaks).toFixed(2)}ms`);
  console.log('Top 3 Peaks:', peaks.slice(0, 3).map((p: any) => `${p.frequency.toFixed(1)}Hz (${p.note})`).join(', '));

  console.log('\n⚡ Benchmark Complete.');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
