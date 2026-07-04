
import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock AudioContext and AudioBuffer for Node environment
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

class MockAudioBuffer {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  private data: Float32Array;

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.data = new Float32Array(length);

    // Fill with A Major scale frequencies (synthetic signal)
    // A4 = 440Hz
    for (let i = 0; i < length; i++) {
        this.data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }
  }

  getChannelData(channel: number) {
    return this.data;
  }
}

// @ts-ignore
global.AudioBuffer = MockAudioBuffer;
// @ts-ignore
global.OfflineAudioContext = class {
    createBuffer(nc: number, len: number, sr: number) {
        return new MockAudioBuffer(nc, len, sr);
    }
};

async function runBenchmark() {
  console.log('⚡ Starting Key Detection & Chord Progression Performance Benchmark...');

  const sampleRate = 44100;
  const duration = 120; // 120 seconds
  const audioBuffer = new MockAudioBuffer(1, sampleRate * duration, sampleRate) as any as AudioBuffer;

  const keyDetection = new AdvancedKeyDetection(mockAudioContext);

  // 1. Benchmark detectKey (Raw Float32Array vs AudioBuffer)
  console.log('\n--- detectKey Performance ---');
  const startKey = Date.now();
  await keyDetection.detectKey(audioBuffer);
  const endKey = Date.now();
  console.log(`- detectKey (AudioBuffer): ${(endKey - startKey).toFixed(2)}ms`);

  const channelData = audioBuffer.getChannelData(0);
  const startKeyRaw = Date.now();
  await keyDetection.detectKey(channelData, sampleRate);
  const endKeyRaw = Date.now();
  console.log(`- detectKey (Raw Float32Array + Cache): ${(endKeyRaw - startKeyRaw).toFixed(2)}ms`);

  // 2. Benchmark detectChordProgression
  console.log('\n--- detectChordProgression Performance (120s track) ---');
  const startChords = Date.now();
  const chords = await keyDetection.detectChordProgression(audioBuffer, 2);
  const endChords = Date.now();

  console.log(`- Total Duration: ${(endChords - startChords).toFixed(2)}ms`);
  console.log(`- Per 2s segment average: ${((endChords - startChords) / (duration / 2)).toFixed(2)}ms`);
  console.log(`- Total Segments: ${chords.length}`);

  // 3. Functional Verification
  console.log('\n--- Functional Verification ---');
  const result = await keyDetection.detectKey(audioBuffer);
  console.log(`- Detected Key: ${result.key}`);
  console.log(`- Confidence: ${result.confidence.toFixed(4)}`);

  if (result.key.includes('A Major')) {
      console.log('✅ Correctness verified (Detected A Major for 440Hz sine)!');
  } else {
      console.log('⚠️ Expected A Major, but detected ' + result.key);
  }
}

runBenchmark().catch(console.error);
