import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock Web Audio API
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
    // Fill with some "musical" noise
    for (let i = 0; i < this.length; i++) {
      this.data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5;
    }
  }

  getChannelData(channel: number) {
    return this.data;
  }
}

// Global mocks
(global as any).AudioBuffer = MockAudioBuffer;
(global as any).AudioContext = class {
  createAnalyser() { return {}; }
  decodeAudioData() { return Promise.resolve({}); }
};
(global as any).window = { AudioContext: (global as any).AudioContext };
(global as any).OfflineAudioContext = class {
  constructor(channels: number, length: number, sampleRate: number) {}
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer(length / sampleRate, sampleRate);
  }
};

async function benchmark() {
  const sampleRate = 44100;
  const duration = 60; // 60 seconds
  const buffer = new MockAudioBuffer(duration, sampleRate) as unknown as AudioBuffer;
  const detector = new AdvancedKeyDetection(new (global as any).AudioContext());

  console.log(`🚀 Benchmarking AdvancedKeyDetection.detectChordProgression...`);
  console.log(`Track duration: ${duration}s, Sample rate: ${sampleRate}Hz`);

  const start = Date.now();
  const chords = await detector.detectChordProgression(buffer, 2);
  const end = Date.now();

  const totalTime = end - start;
  const timePerSegment = totalTime / chords.length;

  console.log(`\n📊 Results:`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Segments processed: ${chords.length}`);
  console.log(`Average time per 2s segment: ${timePerSegment.toFixed(2)}ms`);

  if (timePerSegment < 10) {
    console.log(`\n⚡ Bolt: Performance is LIGHTNING FAST! (<10ms per segment)`);
  } else if (timePerSegment < 50) {
    console.log(`\n⚡ Bolt: Performance is EXCELLENT! (<50ms per segment)`);
  } else {
    console.log(`\n⚠️ Bolt: Performance could be better. (>50ms per segment)`);
  }
}

benchmark().catch(console.error);
