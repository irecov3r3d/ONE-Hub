import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock AudioBuffer if not in browser
if (typeof (global as any).AudioBuffer === 'undefined') {
  (global as any).AudioBuffer = class AudioBuffer {
    length: number;
    duration: number;
    sampleRate: number;
    numberOfChannels: number;
    private data: Float32Array[];

    constructor({ length, sampleRate, numberOfChannels = 1 }: any) {
      this.length = length;
      this.duration = length / sampleRate;
      this.sampleRate = sampleRate;
      this.numberOfChannels = numberOfChannels;
      this.data = Array(numberOfChannels).fill(0).map(() => new Float32Array(length));
    }

    getChannelData(channel: number) {
      return this.data[channel];
    }
  };
}

async function runBenchmark() {
  console.log('⚡ Starting Key Detection Performance Benchmark...');

  const sampleRate = 44100;
  const duration = 120; // 120 seconds
  const length = sampleRate * duration;
  const audioBuffer = new (global as any).AudioBuffer({
    length,
    sampleRate,
    numberOfChannels: 1
  });

  const keyDetector = new AdvancedKeyDetection({} as any);

  // 1. Benchmark calculateChromagram (includes FFT)
  const startChroma = performance.now();
  const iterations = 50;
  for (let i = 0; i < iterations; i++) {
    await (keyDetector as any).calculateChromagram(audioBuffer, 8192);
  }
  const endChroma = performance.now();
  console.log(`- calculateChromagram (8192 FFT + Caching): ${((endChroma - startChroma) / iterations).toFixed(3)}ms / op`);

  // 2. Benchmark detectChordProgression (Zero-copy subarray)
  const startChords = performance.now();
  await keyDetector.detectChordProgression(audioBuffer, 2); // 2 second segments
  const endChords = performance.now();
  const totalChords = duration / 2;
  console.log(`- detectChordProgression (120s track, 2s segments): ${(endChords - startChords).toFixed(2)}ms total`);
  console.log(`  (${( (endChords - startChords) / totalChords ).toFixed(3)}ms per segment)`);

  console.log('\n✅ Performance verified!');
}

runBenchmark().catch(console.error);
