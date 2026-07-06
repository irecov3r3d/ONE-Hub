
import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock AudioContext and AudioBuffer for Node environment
class MockAudioBuffer {
  length: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  private data: Float32Array;

  constructor({ length, sampleRate }: { length: number; sampleRate: number }) {
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.numberOfChannels = 1;
    this.data = new Float32Array(length);

    // Fill with a synthetic A Major scale signal (A=440Hz, C#=554.37Hz, E=659.25Hz)
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      this.data[i] = 0.3 * Math.sin(2 * Math.PI * 440 * t) +
                     0.2 * Math.sin(2 * Math.PI * 554.37 * t) +
                     0.2 * Math.sin(2 * Math.PI * 659.25 * t);
    }
  }

  getChannelData(channel: number) {
    return this.data;
  }
}

class MockAudioContext {
  sampleRate = 44100;
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ length, sampleRate });
  }
}

// @ts-ignore
global.AudioBuffer = MockAudioBuffer;
// @ts-ignore
global.AudioContext = MockAudioContext;

async function runBenchmark() {
  console.log('⚡ Starting AdvancedKeyDetection Performance Benchmark...');

  const ctx = new MockAudioContext();
  // @ts-ignore
  const detector = new AdvancedKeyDetection(ctx);

  // Create a 120-second synthetic audio buffer
  const sampleRate = 44100;
  const duration = 120;
  const buffer = new MockAudioBuffer({ length: duration * sampleRate, sampleRate });

  console.log(`--- Benchmarking Chord Detection (Duration: ${duration}s, 2s segments) ---`);

  const start = Date.now();
  // @ts-ignore
  const chords = await detector.detectChordProgression(buffer, 2);
  const end = Date.now();

  console.log(`✅ Processed ${chords.length} segments in ${end - start}ms`);
  console.log(`📊 Average time per segment: ${((end - start) / chords.length).toFixed(2)}ms`);

  // Verify results (should detect A Major/m based on our synthetic signal)
  console.log('\n--- Sample Results ---');
  chords.slice(0, 5).forEach(c => {
    console.log(`Time: ${c.time.toFixed(1)}s, Chord: ${c.chord}, Confidence: ${c.confidence.toFixed(2)}`);
  });

  // Hot loop test for Chromagram (using pitch class cache)
  console.log('\n--- Benchmarking Chromagram (Hot Cache) ---');
  const segment = buffer.getChannelData(0).subarray(0, 44100 * 2);

  const startHot = Date.now();
  for (let i = 0; i < 50; i++) {
    // @ts-ignore
    await detector.calculateChromagram(segment, sampleRate);
  }
  const endHot = Date.now();
  console.log(`✅ 50 iterations of 2s chromagram in ${endHot - startHot}ms`);
  console.log(`📊 Average time per chromagram: ${((endHot - startHot) / 50).toFixed(2)}ms`);
}

runBenchmark().catch(console.error);
