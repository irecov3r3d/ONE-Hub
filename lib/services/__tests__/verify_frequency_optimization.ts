
import { AudioAnalysisService } from '../audioAnalysisService';
import { FrequencyBand } from '@/types';

// Mock AudioContext and AudioBuffer for Node environment
class MockAudioBuffer {
  duration = 10;
  sampleRate = 44100;
  numberOfChannels = 1;
  length = 441000;
  private data: Float32Array;

  constructor() {
    this.data = new Float32Array(this.length);
    // Fill with some dummy data
    for (let i = 0; i < this.length; i++) {
      this.data[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
    }
  }

  getChannelData() {
    return this.data;
  }
}

(globalThis as any).AudioContext = class {
  decodeAudioData() { return Promise.resolve(new MockAudioBuffer()); }
  createBuffer() { return new MockAudioBuffer(); }
};
(globalThis as any).window = globalThis;

async function runBenchmark() {
  const service = new AudioAnalysisService();
  const fftSize = 8192;

  // Generate dummy spectrum
  const spectrum: FrequencyBand[] = [];
  for (let i = 0; i < fftSize / 2; i++) {
    spectrum.push({
      frequency: i * 44100 / fftSize,
      magnitude: -20 - Math.random() * 60,
      phase: Math.random() * Math.PI
    });
  }

  const audioBuffer = new MockAudioBuffer() as any;
  const mono = audioBuffer.getChannelData();

  console.log('--- Benchmarking Spectral Analysis Optimization ---');

  // We need to access private methods for benchmarking, so we use 'any'
  const serviceAny = service as any;

  // 1. Measure pre-calculation cost
  const startPre = performance.now();
  const magnitudes = new Float32Array(spectrum.length);
  for (let i = 0; i < spectrum.length; i++) {
    magnitudes[i] = Math.pow(10, spectrum[i].magnitude / 20);
  }
  const endPre = performance.now();
  console.log(`Pre-calculation of ${spectrum.length} magnitudes: ${(endPre - startPre).toFixed(4)}ms`);

  // 2. Benchmark optimized functions
  const iterations = 1000;

  const startAnalysis = performance.now();
  for (let i = 0; i < iterations; i++) {
    serviceAny.analyzeFrequencyBand(spectrum, magnitudes, 60, 250, 44100, fftSize, 1.0);
    serviceAny.calculateSpectralCentroid(magnitudes, 44100, fftSize);
    serviceAny.calculateSpectralRolloff(magnitudes, 44100, fftSize);
    serviceAny.calculateSpectralFlatness(spectrum, magnitudes);
  }
  const endAnalysis = performance.now();

  console.log(`Average time per analysis cycle (${iterations} iterations): ${((endAnalysis - startAnalysis) / iterations).toFixed(4)}ms`);

  // 3. Verification of Numerical Correctness for Flatness (the trickiest identity)
  const ln10Over20 = Math.LN10 / 20;
  let logSumIdentity = 0;
  let logSumDirect = 0;

  for (let i = 0; i < spectrum.length; i++) {
    logSumIdentity += spectrum[i].magnitude * ln10Over20;
    logSumDirect += Math.log(Math.pow(10, spectrum[i].magnitude / 20) + 1e-10);
  }

  const diff = Math.abs(logSumIdentity - logSumDirect);
  console.log(`Numerical Verification (Log-Sum Identity Diff): ${diff.toExponential(4)}`);

  if (diff < 1e-10) {
    console.log('✅ PASS: Mathematical identity is correct.');
  } else {
    console.log('❌ FAIL: Significant difference in mathematical identity.');
  }

  console.log('\n--- Benchmarking Note Conversion Optimization ---');
  const dominantFreqs: any[] = [];
  for (let i = 0; i < 50; i++) {
    dominantFreqs.push({ frequency: 20 + Math.random() * 5000, magnitude: -10 - Math.random() * 30 });
  }

  const startNote = performance.now();
  const top10 = dominantFreqs.sort((a, b) => b.magnitude - a.magnitude).slice(0, 10);
  for (const item of top10) {
    serviceAny.frequencyToNote(item.frequency);
  }
  const endNote = performance.now();
  console.log(`Note conversion for top 10: ${(endNote - startNote).toFixed(4)}ms`);
}

runBenchmark().catch(console.error);
