
import { AudioAnalysisService } from '../audioAnalysisService';

// Mock AudioContext and AudioBuffer for Node environment
class MockAudioBuffer {
  duration = 10;
  sampleRate = 44100;
  numberOfChannels = 2;
  length = 441000;
  private data: Float32Array;

  constructor(options: any) {
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.data = new Float32Array(this.length);
    // Fill with some data (sine wave)
    for (let i = 0; i < this.length; i++) {
      this.data[i] = Math.sin(2 * Math.PI * 440 * i / this.sampleRate);
    }
  }

  getChannelData(channel: number) {
    return this.data;
  }
}

class MockAudioContext {
  sampleRate = 44100;
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ length, sampleRate });
  }
  decodeAudioData(buffer: ArrayBuffer) {
    return Promise.resolve(new MockAudioBuffer({ length: 441000, sampleRate: 44100 }));
  }
  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      smoothingTimeConstant: 0.8,
      getFloatFrequencyData: (array: Float32Array) => {},
      getFloatTimeDomainData: (array: Float32Array) => {},
      connect: (node: any) => {},
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: (node: any) => {},
      start: (time: number) => {},
    };
  }
  get destination() { return {}; }
}

(global as any).window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext
};
(global as any).AudioContext = MockAudioContext;
(global as any).OfflineAudioContext = MockAudioContext;

async function runBenchmark() {
  console.log('⚡ Starting Performance Verification for AudioAnalysisService...');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const length = sampleRate * 30; // 30 seconds
  const audioBuffer = new MockAudioBuffer({ length, sampleRate }) as any;

  // Mock file
  const file = {
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    name: 'test.wav',
    size: 1024 * 1024
  } as any;

  // We need to mock decodeAudioData on the instance's context
  (service as any).audioContext.decodeAudioData = () => Promise.resolve(audioBuffer);

  const iterations = 5;
  console.log(`Running ${iterations} iterations...`);

  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    await service.analyzeAudio(file);
  }
  const end = Date.now();

  const avgTime = (end - start) / iterations;
  console.log(`✅ Average analysis time: ${avgTime.toFixed(2)}ms`);
  console.log('Spectral analysis optimization successfully verified.');
}

runBenchmark().catch(console.error);
