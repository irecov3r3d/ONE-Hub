import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock AudioBuffer for Node.js environment
class MockAudioBuffer {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  private data: Float32Array;

  constructor(options: { duration: number; sampleRate: number; numberOfChannels: number }) {
    this.duration = options.duration;
    this.sampleRate = options.sampleRate;
    this.numberOfChannels = options.numberOfChannels;
    this.length = Math.floor(this.duration * this.sampleRate);
    this.data = new Float32Array(this.length);

    // Fill with a synthetic A Major signal (A4 = 440Hz, C#5 = 554.37Hz, E5 = 659.25Hz)
    for (let i = 0; i < this.length; i++) {
      const t = i / this.sampleRate;
      this.data[i] = (
        Math.sin(2 * Math.PI * 440 * t) +
        Math.sin(2 * Math.PI * 554.37 * t) +
        Math.sin(2 * Math.PI * 659.25 * t)
      ) / 3;
    }
  }

  getChannelData(channel: number) {
    return this.data;
  }
}

// Mock AudioContext
class MockAudioContext {
  sampleRate = 44100;
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ duration: length / sampleRate, sampleRate, numberOfChannels: channels });
  }
}

async function runBenchmark() {
  console.log('⚡ Starting AdvancedKeyDetection Benchmark (Zero-Copy Optimization)');

  const ctx = new MockAudioContext() as any;
  const detector = new AdvancedKeyDetection(ctx);
  const duration = 120; // 120 seconds
  const buffer = new MockAudioBuffer({ duration, sampleRate: 44100, numberOfChannels: 1 }) as any;

  console.log(`Track Duration: ${duration}s`);
  console.log(`Total Samples: ${buffer.length}`);

  // Measure Chord Progression Detection (which uses segments)
  console.log('\n--- Chord Progression Detection ---');
  const start = performance.now();
  const chords = await detector.detectChordProgression(buffer, 2);
  const end = performance.now();

  console.log(`Detected ${chords.length} segments`);
  console.log(`Total Time: ${(end - start).toFixed(2)}ms`);
  console.log(`Avg Time per Segment: ${((end - start) / chords.length).toFixed(2)}ms`);

  // Verify Accuracy (A Major)
  const result = await detector.detectKey(buffer);
  console.log('\n--- Key Detection Accuracy ---');
  console.log(`Detected Key: ${result.key}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);

  if (result.key === 'A Major') {
    console.log('✅ Accuracy Verified');
  } else {
    console.log('❌ Unexpected Key detected');
  }
}

runBenchmark().catch(console.error);
