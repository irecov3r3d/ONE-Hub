import { AudioAnalysisService } from '../audioAnalysisService';
import { FrequencyBand } from '@/types';

// Mock AudioContext for Node environment
class MockAudioContext {
  sampleRate = 44100;
  decodeAudioData() { return Promise.resolve(new MockAudioBuffer()); }
}

class MockAudioBuffer {
  duration = 10;
  sampleRate = 44100;
  numberOfChannels = 2;
  length = 441000;
  getChannelData() { return new Float32Array(441000); }
}

(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).window = globalThis;

async function benchmark() {
  console.log('--- ⚡ Frequency Analysis Optimization Benchmark ---');

  const service = new AudioAnalysisService();
  const fftSize = 8192;
  const sampleRate = 44100;
  const spectrum: FrequencyBand[] = [];

  // Generate mock spectrum
  for (let i = 0; i < fftSize / 2; i++) {
    spectrum.push({
      frequency: (i * sampleRate) / fftSize,
      magnitude: -100 + Math.random() * 100,
      phase: 0,
    });
  }

  const audioBuffer = new MockAudioBuffer() as any;
  const mono = new Float32Array(audioBuffer.length);

  // Measure performance
  const iterations = 100;
  const start = Date.now();

  for (let i = 0; i < iterations; i++) {
    await (service as any).analyzeFrequency(audioBuffer, mono, spectrum);
  }

  const end = Date.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  console.log(`Total time for ${iterations} analyses: ${totalTime}ms`);
  console.log(`Average time per analysis: ${avgTime.toFixed(4)}ms`);

  // Verify correctness (manual check of result structure)
  const result = await (service as any).analyzeFrequency(audioBuffer, mono, spectrum);

  if (result.subBass && result.dominantFrequencies.length <= 10 && result.spectralCentroid >= 0) {
    console.log('✅ Logic Verification: PASSED');
    console.log(`- Dominant Frequencies: ${result.dominantFrequencies.length}`);
    console.log(`- Spectral Centroid: ${result.spectralCentroid.toFixed(2)} Hz`);
    console.log(`- Spectral Flatness: ${result.spectralFlatness.toFixed(4)}`);
  } else {
    console.log('❌ Logic Verification: FAILED');
  }
}

benchmark().catch(console.error);
