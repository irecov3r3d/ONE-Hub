
import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock AudioContext and AudioBuffer for Node environment
class MockAudioBuffer {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  private data: Float32Array;

  constructor(duration: number, sampleRate: number) {
    this.duration = duration;
    this.sampleRate = sampleRate;
    this.numberOfChannels = 1;
    this.length = Math.floor(duration * sampleRate);
    this.data = new Float32Array(this.length);
    for (let i = 0; i < this.length; i++) {
      this.data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }
  }

  getChannelData(channel: number) {
    return this.data;
  }
}

const mockAudioContext = {
  createAnalyser: () => ({
    fftSize: 2048,
    smoothingTimeConstant: 0,
    frequencyBinCount: 1024,
  }),
  createBufferSource: () => ({
    start: () => {},
    connect: () => {},
  }),
  destination: {},
} as any;

// To simulate the "Original" approach, we provide a mock of the OfflineAudioContext
(global as any).OfflineAudioContext = class {
  constructor(channels: number, length: number, sampleRate: number) {}
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer(length / sampleRate, sampleRate);
  }
};

(global as any).AudioBuffer = MockAudioBuffer;

async function runBenchmark() {
  console.log('⚡ Starting Key/Chord Pipeline Optimization Benchmark...');

  const detector = new AdvancedKeyDetection(mockAudioContext);
  const sampleRate = 44100;
  const duration = 120; // 2 minutes
  const audioBuffer = new MockAudioBuffer(duration, sampleRate) as any;

  console.log(`Track Duration: ${duration}s, Sample Rate: ${sampleRate}Hz`);
  console.log(`Analyzing in 2s segments (${duration / 2} segments total)`);

  // 1. Warm up
  await detector.detectChordProgression(audioBuffer, 2);

  // 2. Benchmark Optimized (Zero-copy)
  // The current implementation is already optimized, so we measure it.
  const startOpt = Date.now();
  const results = await detector.detectChordProgression(audioBuffer, 2);
  const endOpt = Date.now();
  const optTime = endOpt - startOpt;

  console.log(`\nResults:`);
  console.log(`- Bolt Optimized (Zero-copy): ${optTime.toFixed(2)}ms`);
  console.log(`- Average per segment:        ${(optTime / results.length).toFixed(2)}ms`);

  // 3. Verification
  if (results.length === duration / 2) {
    console.log(`✅ Pipeline verified! Successfully processed ${results.length} segments.`);
  } else {
    console.log(`❌ Pipeline verification failed. Expected ${duration / 2} segments, got ${results.length}.`);
    process.exit(1);
  }

  console.log('\n💡 Note: The "Baseline" was removed as it relied on OfflineAudioContext which is heavy and not suitable for fast segment analysis.');
}

runBenchmark().catch(console.error);
