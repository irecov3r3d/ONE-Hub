import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock AudioBuffer for Node environment
class MockAudioBuffer {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  private data: Float32Array;

  constructor({ duration, sampleRate, numberOfChannels }: { duration: number, sampleRate: number, numberOfChannels: number }) {
    this.duration = duration;
    this.sampleRate = sampleRate;
    this.numberOfChannels = numberOfChannels;
    this.length = Math.floor(duration * sampleRate);
    this.data = new Float32Array(this.length);

    // Fill with some synthetic signal (A4 = 440Hz)
    for (let i = 0; i < this.length; i++) {
      this.data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }
  }

  getChannelData(channel: number) {
    return this.data;
  }
}

// Mock AudioContext for Node environment
class MockAudioContext {
  sampleRate = 44100;
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ duration: length / sampleRate, sampleRate, numberOfChannels: channels });
  }
}

// Mock OfflineAudioContext
class MockOfflineAudioContext extends MockAudioContext {
  constructor(channels: number, length: number, sampleRate: number) {
    super();
  }
}

async function runBenchmark() {
  console.log('🚀 Starting AdvancedKeyDetection Performance Benchmark...');

  // Setup mocks
  (global as any).AudioBuffer = MockAudioBuffer;
  (global as any).AudioContext = MockAudioContext;
  (global as any).OfflineAudioContext = MockOfflineAudioContext;

  const ctx = new MockAudioContext() as any;
  const detector = new AdvancedKeyDetection(ctx);

  const duration = 120; // 2 minutes
  const sampleRate = 44100;
  const buffer = new MockAudioBuffer({ duration, sampleRate, numberOfChannels: 1 }) as any;

  console.log(`\n📄 Analyzing ${duration}s track (${sampleRate}Hz)...`);

  // Measure Chord Progression Detection (which uses the optimized segment path)
  const start = performance.now();
  const chords = await detector.detectChordProgression(buffer, 2);
  const end = performance.now();

  console.log(`\n✅ Chord Detection Complete!`);
  console.log(`⏱️ Total Duration: ${(end - start).toFixed(2)}ms`);
  console.log(`⏱️ Avg Segment Duration: ${((end - start) / chords.length).toFixed(2)}ms`);
  console.log(`🎸 Chords Detected: ${chords.length}`);

  // Measure single Key Detection (full buffer)
  const startKey = performance.now();
  await detector.detectKey(buffer);
  const endKey = performance.now();
  console.log(`\n✅ Full Buffer Key Detection: ${(endKey - startKey).toFixed(2)}ms`);

  console.log('\n🌟 Benchmark Finished!');
}

runBenchmark().catch(console.error);
