
import { AudioAnalysisService } from '../audioAnalysisService';
import { FrequencyBand } from '@/types';

// Mock AudioContext and AudioBuffer
class MockAudioBuffer {
  duration = 10;
  sampleRate = 44100;
  numberOfChannels = 1;
  length = 441000;
  getChannelData() { return new Float32Array(this.length); }
}

(global as any).window = {
  AudioContext: class {
    createBuffer() { return new MockAudioBuffer(); }
    decodeAudioData() { return Promise.resolve(new MockAudioBuffer()); }
  }
};

async function benchmark() {
  const service = new AudioAnalysisService();
  const spectrum: FrequencyBand[] = [];
  const N = 8192;
  for (let i = 0; i < N; i++) {
    spectrum.push({
      frequency: (i * 44100) / (N * 2),
      magnitude: -Math.random() * 60,
      phase: 0
    });
  }

  const audioBuffer = new MockAudioBuffer() as any;
  const mono = new Float32Array(audioBuffer.length);

  console.log('⚡ Starting Frequency Analysis Benchmark...');

  // Warm up
  for (let i = 0; i < 100; i++) {
    await (service as any).analyzeFrequency(audioBuffer, mono, spectrum);
  }

  const start = performance.now();
  const iterations = 1000;
  for (let i = 0; i < iterations; i++) {
    await (service as any).analyzeFrequency(audioBuffer, mono, spectrum);
  }
  const end = performance.now();

  console.log(`Average analysis time: ${((end - start) / iterations).toFixed(3)}ms`);
}

benchmark();
