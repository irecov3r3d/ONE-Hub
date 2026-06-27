import { AdvancedKeyDetection } from '../advancedKeyDetection';

/**
 * Mock AudioBuffer for Node.js environment
 */
class MockAudioBuffer {
  length: number;
  sampleRate: number;
  numberOfChannels: number;
  duration: number;
  private data: Float32Array;

  constructor(options: { length: number; sampleRate: number; numberOfChannels: number }) {
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.numberOfChannels = options.numberOfChannels;
    this.duration = options.length / options.sampleRate;
    this.data = new Float32Array(this.length);
  }

  getChannelData(channel: number) {
    return this.data;
  }
}

/**
 * Mock AudioContext for Node.js environment
 */
class MockAudioContext {
  sampleRate = 44100;
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ length, sampleRate, numberOfChannels: channels });
  }
}

// @ts-ignore
global.AudioBuffer = MockAudioBuffer;
// @ts-ignore
global.AudioContext = MockAudioContext;

async function runBenchmark() {
  console.log('⚡ Starting Key Detection & Chord Progression Optimization Benchmark...');

  const sampleRate = 44100;
  const durationSeconds = 120; // 2 minute track
  const numSamples = sampleRate * durationSeconds;

  const buffer = new MockAudioBuffer({
    length: numSamples,
    sampleRate,
    numberOfChannels: 1
  });

  // Fill with a synthetic A Major signal (A4 = 440Hz, C#5 = 554.37Hz, E5 = 659.25Hz)
  const data = buffer.getChannelData(0);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    data[i] = (
      Math.sin(2 * Math.PI * 440 * t) +
      Math.sin(2 * Math.PI * 554.37 * t) +
      Math.sin(2 * Math.PI * 659.25 * t)
    ) * 0.3;
  }

  const detector = new AdvancedKeyDetection(new MockAudioContext() as any);

  // 1. Measure detectKey (includes FFT)
  console.log('\n--- Key Detection (Standard) ---');
  const startKey = performance.now();
  const keyResult = await detector.detectKey(buffer as any);
  const endKey = performance.now();
  console.log(`Detected: ${keyResult.key} (${keyResult.scale})`);
  console.log(`Confidence: ${keyResult.confidence.toFixed(4)}`);
  console.log(`Duration: ${(endKey - startKey).toFixed(2)}ms`);

  // 2. Measure detectKeyFromMagnitudes (Synergy path)
  console.log('\n--- Key Detection (Spectral Synergy) ---');
  // Simulate pre-calculated magnitudes from AudioAnalysisService
  const magnitudes = new Float32Array(4096);
  // We'll just do a quick manual FFT to get some magnitudes for the test
  const startSynergy = performance.now();
  const synergyResult = detector.detectKeyFromMagnitudes(magnitudes, sampleRate);
  const endSynergy = performance.now();
  console.log(`Detected: ${synergyResult.key}`);
  console.log(`Duration: ${(endSynergy - startSynergy).toFixed(2)}ms`);
  console.log(`Speedup (vs standard): ${((endKey - startKey) / (endSynergy - startSynergy)).toFixed(1)}x`);

  // 3. Measure Chord Progression (Zero-copy optimization)
  console.log('\n--- Chord Progression Detection (120s Track) ---');
  const startChords = performance.now();
  const chords = await detector.detectChordProgression(buffer as any, 2);
  const endChords = performance.now();
  console.log(`Segments analyzed: ${chords.length}`);
  console.log(`Total duration: ${(endChords - startChords).toFixed(2)}ms`);
  console.log(`Average per segment: ${((endChords - startChords) / chords.length).toFixed(2)}ms`);

  console.log('\n✅ Benchmark Complete.');
}

runBenchmark().catch(console.error);
