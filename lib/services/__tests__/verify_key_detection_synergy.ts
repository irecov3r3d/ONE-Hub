
import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { FastFFTEngine } from '../fastFFTEngine';

// Mock AudioBuffer
class MockAudioBuffer {
  length: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  private data: Float32Array;

  constructor(options: { length: number; sampleRate: number; numberOfChannels: number }) {
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
    this.numberOfChannels = options.numberOfChannels;
    this.data = new Float32Array(this.length);
    // Fill with some dummy frequency
    for (let i = 0; i < this.length; i++) {
      this.data[i] = Math.sin(2 * Math.PI * 440 * i / this.sampleRate);
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
    return new MockAudioBuffer({ length, sampleRate, numberOfChannels: channels });
  }
}

async function runBenchmark() {
  const ctx = new MockAudioContext() as any;
  const detector = new AdvancedKeyDetection(ctx);
  const fftEngine = new FastFFTEngine(ctx);

  const buffer = new MockAudioBuffer({ length: 44100 * 2, sampleRate: 44100, numberOfChannels: 1 }) as any;

  console.log('--- ⚡ Bolt: Key Detection & Chord Pipeline Synergy Benchmark ---');

  // 1. Test Key Detection Synergy
  console.log('\nMeasuring Key Detection Synergy...');
  const startFFT = performance.now();
  const { linearMagnitudes } = await fftEngine.performFFT(buffer, 8192);
  const fftDuration = performance.now() - startFFT;

  const startSynergy = performance.now();
  const resultSynergy = detector.detectKeyFromMagnitudes(linearMagnitudes, buffer.sampleRate);
  const synergyDuration = performance.now() - startSynergy;

  console.log(`- Pre-calculated FFT: ${fftDuration.toFixed(4)}ms`);
  console.log(`- Synergy Key Detection (from magnitudes): ${synergyDuration.toFixed(4)}ms`);
  console.log(`- Result: ${resultSynergy.key} (${resultSynergy.scale})`);

  // 2. Test Zero-Copy Chord Pipeline
  console.log('\nMeasuring Zero-Copy Chord Progression Pipeline...');
  const startChords = performance.now();
  const chords = await detector.detectChordProgression(buffer, 1.0); // 1s segments
  const chordsDuration = performance.now() - startChords;

  console.log(`- Duration for 2s audio (1s hop): ${chordsDuration.toFixed(4)}ms`);
  console.log(`- Per segment average: ${(chordsDuration / chords.length).toFixed(4)}ms`);
  console.log(`- Detected ${chords.length} chords: ${chords.map(c => c.chord).join(', ')}`);

  console.log('\n--- Benchmark Complete ---');
}

runBenchmark().catch(console.error);
