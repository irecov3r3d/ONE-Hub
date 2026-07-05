
import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock AudioBuffer for Node.js environment
class MockAudioBuffer {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  private data: Float32Array;

  constructor(options: { length: number; sampleRate: number; numberOfChannels: number }) {
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.numberOfChannels = options.numberOfChannels;
    this.duration = this.length / this.sampleRate;
    this.data = new Float32Array(this.length);
    // Fill with some synthetic data (A4 sine wave)
    for (let i = 0; i < this.length; i++) {
      this.data[i] = Math.sin(2 * Math.PI * 440 * i / this.sampleRate);
    }
  }

  getChannelData(channel: number) {
    return this.data;
  }
}

// Make AudioBuffer available globally for the instanceof check in FastFFTEngine
(global as any).AudioBuffer = MockAudioBuffer;

// Mock AudioContext
class MockAudioContext {
  sampleRate = 44100;
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ length, sampleRate, numberOfChannels: channels });
  }
}

// Mock OfflineAudioContext
class MockOfflineAudioContext extends MockAudioContext {
  constructor(channels: number, length: number, sampleRate: number) {
    super();
  }
}

async function runBenchmark() {
  console.log('🚀 Starting Key Detection Performance Benchmark...');

  const sampleRate = 44100;
  const duration = 120; // 120 seconds of audio
  const audioBuffer = new MockAudioBuffer({
    length: sampleRate * duration,
    sampleRate,
    numberOfChannels: 1
  }) as any as AudioBuffer;

  const audioContext = new MockAudioContext() as any as AudioContext;
  const keyDetection = new AdvancedKeyDetection(audioContext);

  // Benchmarking the new optimized path
  console.log('⏱️  Benchmarking optimized zero-copy chord progression analysis (120s track)...');
  const start = Date.now();
  const chords = await keyDetection.detectChordProgression(audioBuffer, 2);
  const end = Date.now();

  console.log(`✅ Processed ${chords.length} segments in ${end - start}ms`);
  console.log(`📊 Average time per 2s segment: ${((end - start) / chords.length).toFixed(2)}ms`);

  // To estimate the old path's performance (OfflineAudioContext + allocations)
  // we would see significant GC pressure and overhead from context creation.
  // In a real browser, creating 60 OfflineAudioContexts is very expensive.
}

runBenchmark().catch(console.error);
