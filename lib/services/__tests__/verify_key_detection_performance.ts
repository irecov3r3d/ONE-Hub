import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

/**
 * Benchmark for AdvancedKeyDetection optimizations.
 * Measures the speed and efficiency of the new zero-copy chord progression analysis.
 */
async function runBenchmark() {
  console.log('⚡ Starting AdvancedKeyDetection Performance Benchmark...');

  const sampleRate = 44100;
  const duration = 120; // 2 minutes
  const length = sampleRate * duration;
  const channelData = new Float32Array(length);

  // Generate a synthetic A Major signal (A4 = 440Hz, C#5 = 554.37Hz, E5 = 659.25Hz)
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    channelData[i] = (
      Math.sin(2 * Math.PI * 440 * t) +
      Math.sin(2 * Math.PI * 554.37 * t) +
      Math.sin(2 * Math.PI * 659.25 * t)
    ) * 0.3;
  }

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData: () => channelData,
  } as unknown as AudioBuffer;

  // Mock global window/AudioContext/OfflineAudioContext for Node
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};
  (global as any).OfflineAudioContext = class {
    constructor() {}
    createBuffer(ch: number, len: number, sr: number) {
      return {
        numberOfChannels: ch,
        length: len,
        sampleRate: sr,
        getChannelData: () => new Float32Array(len)
      };
    }
  };

  const keyDetector = new AdvancedKeyDetection({} as AudioContext);

  // 1. Benchmark single key detection
  console.log('\n--- Phase 1: Single Key Detection ---');
  const startKey = performance.now();
  const keyResult = await keyDetector.detectKey(mockAudioBuffer);
  const endKey = performance.now();
  console.log(`Key: ${keyResult.key}, Confidence: ${keyResult.confidence.toFixed(2)}`);
  console.log(`Duration: ${(endKey - startKey).toFixed(2)}ms`);

  // 2. Benchmark chord progression (Zero-Copy)
  console.log('\n--- Phase 2: Chord Progression Analysis (Zero-Copy) ---');
  const hopSize = 2; // 2 second segments
  const startChords = performance.now();
  const chords = await keyDetector.detectChordProgression(mockAudioBuffer, hopSize);
  const endChords = performance.now();

  console.log(`Processed ${chords.length} segments of ${hopSize}s each`);
  console.log(`Total Duration: ${(endChords - startChords).toFixed(2)}ms`);
  console.log(`Average per segment: ${((endChords - startChords) / chords.length).toFixed(2)}ms`);

  // Verification of result consistency
  console.log(`First segment chord: ${chords[0].chord}, Confidence: ${chords[0].confidence.toFixed(2)}`);

  console.log('\n⚡ Benchmark Complete.');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
