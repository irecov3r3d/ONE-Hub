import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

async function runBenchmark() {
  console.log('⚡ Starting AdvancedKeyDetection Performance Benchmark...');

  const sampleRate = 44100;
  const duration = 120; // 2 minutes
  const length = sampleRate * duration;
  const leftChannel = new Float32Array(length);

  // Fill with a sine wave (A4 = 440Hz)
  for (let i = 0; i < length; i++) {
    leftChannel[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
  }

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData: (ch: number) => leftChannel,
  } as unknown as AudioBuffer;

  // Mock global window/AudioContext
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};
  (global as any).OfflineAudioContext = class {
    constructor() {}
    createBuffer(channels: number, length: number, sampleRate: number) {
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        getChannelData: (ch: number) => new Float32Array(length),
      };
    }
  };

  const keyDetector = new AdvancedKeyDetection(new (global as any).AudioContext());

  console.log('\n--- Phase 1: detectKey (Whole Track) ---');
  const startKey = performance.now();
  const keyData = await keyDetector.detectKey(mockAudioBuffer);
  const endKey = performance.now();
  console.log(`Duration: ${(endKey - startKey).toFixed(2)}ms`);
  console.log(`Detected Key: ${keyData.key} (Confidence: ${keyData.confidence.toFixed(2)})`);

  console.log('\n--- Phase 2: detectChordProgression (120s track, 2s hop) ---');
  const startChords = performance.now();
  const chords = await keyDetector.detectChordProgression(mockAudioBuffer, 2);
  const endChords = performance.now();
  console.log(`Duration: ${(endChords - startChords).toFixed(2)}ms for ${chords.length} segments`);
  console.log(`Average per segment: ${((endChords - startChords) / chords.length).toFixed(2)}ms`);

  console.log('\n⚡ Benchmark Complete.');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
