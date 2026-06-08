
import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock Web Audio API
class MockAudioBuffer {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  private channelData: Float32Array;

  constructor({ duration, sampleRate, numberOfChannels }: { duration: number, sampleRate: number, numberOfChannels: number }) {
    this.duration = duration;
    this.sampleRate = sampleRate;
    this.numberOfChannels = numberOfChannels;
    this.length = Math.floor(duration * sampleRate);
    this.channelData = new Float32Array(this.length);
    // Fill with some dummy data
    for (let i = 0; i < this.length; i++) {
      this.channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }
  }

  getChannelData(channel: number) {
    return this.channelData;
  }
}

class MockAudioContext {
  sampleRate = 44100;
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ duration: length / sampleRate, sampleRate, numberOfChannels: channels });
  }
}

// @ts-ignore
globalThis.AudioBuffer = MockAudioBuffer;
// @ts-ignore
globalThis.AudioContext = MockAudioContext;
// @ts-ignore
globalThis.OfflineAudioContext = MockAudioContext;

async function runBenchmark() {
  const sampleRate = 44100;
  const duration = 120; // 2 minutes
  const audioBuffer = new MockAudioBuffer({ duration, sampleRate, numberOfChannels: 2 }) as any as AudioBuffer;

  const keyDetector = new AdvancedKeyDetection(new MockAudioContext() as any);

  console.log('⚡ Starting Key/Chord Detection Pipeline Benchmark...');
  console.log(`Track Duration: ${duration}s`);
  console.log(`Sample Rate: ${sampleRate}Hz`);

  const start = performance.now();

  const chords = await keyDetector.detectChordProgression(audioBuffer, 2);

  const end = performance.now();
  const totalTime = end - start;

  console.log('\n--- Results ---');
  console.log(`Total Processing Time: ${totalTime.toFixed(2)}ms`);
  console.log(`Number of segments: ${chords.length}`);
  console.log(`Average time per segment: ${(totalTime / chords.length).toFixed(2)}ms`);

  // Basic validation
  if (chords.length > 0 && chords[0].chord) {
    console.log('\n✅ Pipeline verification successful.');
    console.log(`Detected first chord: ${chords[0].chord} (Confidence: ${chords[0].confidence.toFixed(2)})`);
  } else {
    console.error('\n❌ Pipeline verification failed: No chords detected.');
    process.exit(1);
  }
}

runBenchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
