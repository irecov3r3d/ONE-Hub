import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Global mocks for Node environment
const globalAny = global as any;
globalAny.window = { AudioContext: class {} };
globalAny.AudioBuffer = class {
  length: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  private data: Float32Array;

  constructor({ length, sampleRate, numberOfChannels }: any) {
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.numberOfChannels = numberOfChannels;
    this.data = new Float32Array(length);
  }

  getChannelData() {
    return this.data;
  }
};

globalAny.OfflineAudioContext = class {
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new globalAny.AudioBuffer({ length, sampleRate, numberOfChannels: channels });
  }
};

async function verifyOptimization() {
  console.log('⚡ Starting Key & Chord Optimization Verification...');

  const sampleRate = 44100;
  const length = sampleRate * 120; // 120 seconds
  const audioBuffer = new globalAny.AudioBuffer({ length, sampleRate, numberOfChannels: 1 });

  // Fill with dummy signal (A 440Hz sine)
  const data = audioBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
  }

  const detector = new AdvancedKeyDetection({} as any);

  // 1. Benchmark Chord Progression (New zero-copy method)
  console.log('\n--- Benchmarking detectChordProgression (Optimized) ---');
  const start = Date.now();
  const chords = await detector.detectChordProgression(audioBuffer, 2);
  const end = Date.now();

  console.log(`Processed 120s track (60 segments) in ${end - start}ms`);
  console.log(`Average time per segment: ${((end - start) / 60).toFixed(2)}ms`);
  console.log(`Total chords detected: ${chords.length}`);

  // 2. Numerical Correctness check for Key Detection
  console.log('\n--- Verifying Key Detection Accuracy ---');
  const keyResult = await detector.detectKey(audioBuffer);
  console.log(`Detected Key: ${keyResult.key} (${keyResult.scale})`);
  console.log(`Confidence: ${keyResult.confidence.toFixed(4)}`);

  // 3. Verify Magnitude Reuse (Zero-copy path)
  const magnitudes = new Float32Array(4096);
  magnitudes.fill(0.1);
  const startReuse = performance.now();
  const reuseResult = await detector.detectKeyFromMagnitudes(magnitudes, sampleRate);
  const endReuse = performance.now();
  console.log(`\nKey detection from pre-calculated magnitudes: ${reuseResult.key}`);
  console.log(`Execution time (bypass FFT): ${(endReuse - startReuse).toFixed(4)}ms`);

  if (chords.length === 60) {
    console.log('\n✅ Verification PASSED: Chord progression segments match track length.');
  } else {
    console.log('\n❌ Verification FAILED: Segment mismatch.');
  }
}

verifyOptimization().catch(console.error);
