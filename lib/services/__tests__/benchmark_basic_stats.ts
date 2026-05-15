
import { AudioAnalysisService } from '../audioAnalysisService';

// Mocking AudioContext for Node environment
class MockAudioBuffer {
  duration = 300; // 5 minutes
  sampleRate = 44100;
  numberOfChannels = 2;
  length = 44100 * 300;
  private channels: Float32Array[];
  constructor() {
    this.channels = [
      new Float32Array(this.length),
      new Float32Array(this.length)
    ];
    // Fill with some data
    for (let i = 0; i < this.length; i++) {
      this.channels[0][i] = Math.sin(i * 0.01) * 0.5;
      this.channels[1][i] = Math.cos(i * 0.01) * 0.5;
    }
  }
  getChannelData(idx: number) { return this.channels[idx]; }
}

class MockAudioContext {
  decodeAudioData() { return Promise.resolve(new MockAudioBuffer()); }
  createBuffer() { return new MockAudioBuffer(); }
}

(globalThis as any).window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext
};
(globalThis as any).AudioContext = MockAudioContext;

async function runBenchmark() {
  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const length = sampleRate * 300; // 5 minutes
  const channelData = [new Float32Array(length), new Float32Array(length)];

  console.log('Generating 5 minutes of stereo audio data...');
  for (let i = 0; i < length; i++) {
    channelData[0][i] = Math.sin(i * 0.01) * 0.5;
    channelData[1][i] = Math.cos(i * 0.01) * 0.5;
  }

  console.log('--- Benchmarking AudioAnalysisService.analyzeBasicStats ---');

  // Warm up
  for (let i = 0; i < 3; i++) {
    (service as any).analyzeBasicStats(channelData, sampleRate);
  }

  const iterations = 5;
  let totalTime = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    (service as any).analyzeBasicStats(channelData, sampleRate);
    const end = performance.now();
    const duration = end - start;
    console.log(`Iteration ${i + 1}: ${duration.toFixed(2)}ms`);
    totalTime += duration;
  }

  console.log(`Average execution time: ${(totalTime / iterations).toFixed(2)}ms`);
  console.log('--- Benchmark Complete ---');
}

runBenchmark().catch(console.error);
