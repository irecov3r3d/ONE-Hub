import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { FastFFTEngine } from '../fastFFTEngine';

// Mock AudioBuffer for Node environment
class MockAudioBuffer {
  duration: number;
  length: number;
  sampleRate: number;
  numberOfChannels: number;
  private data: Float32Array;

  constructor(options: { length: number; sampleRate: number; numberOfChannels: number }) {
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.numberOfChannels = options.numberOfChannels;
    this.duration = options.length / options.sampleRate;
    this.data = new Float32Array(options.length);
  }

  getChannelData(channel: number) {
    return this.data;
  }

  copyToChannel(source: Float32Array, channelNumber: number, startInChannel: number = 0) {
    this.data.set(source, startInChannel);
  }
}

// @ts-ignore
global.AudioBuffer = MockAudioBuffer;

async function runBenchmark() {
  const sampleRate = 44100;
  const duration = 120; // 120 seconds
  const length = sampleRate * duration;

  const audioBuffer = new MockAudioBuffer({
    length,
    sampleRate,
    numberOfChannels: 1
  }) as unknown as AudioBuffer;

  // Generate a synthetic A Major signal (A4 = 440Hz, C#5 = 554.37Hz, E5 = 659.25Hz)
  const data = audioBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    data[i] = 0.3 * Math.sin(2 * Math.PI * 440 * t) +
              0.2 * Math.sin(2 * Math.PI * 554.37 * t) +
              0.2 * Math.sin(2 * Math.PI * 659.25 * t);
  }

  const audioContext = {} as AudioContext;
  const detector = new AdvancedKeyDetection(audioContext);
  const fftEngine = new FastFFTEngine(audioContext);

  console.log('--- Key Detection Performance & Synergy Verification ---');

  // 1. Standalone Key Detection (includes FFT)
  const startStandalone = performance.now();
  const keyStandalone = await detector.detectKey(audioBuffer);
  const endStandalone = performance.now();
  console.log(`Standalone Key Detection: ${keyStandalone.key} (${(endStandalone - startStandalone).toFixed(2)}ms)`);

  // 2. Integrated Key Detection (Spectral Synergy)
  const { linearMagnitudes } = await fftEngine.performFFT(audioBuffer, 8192);
  const startSynergy = performance.now();
  const keySynergy = await detector.detectKey(audioBuffer, linearMagnitudes);
  const endSynergy = performance.now();
  console.log(`Synergized Key Detection: ${keySynergy.key} (${(endSynergy - startSynergy).toFixed(2)}ms)`);
  console.log(`Speedup: ${((endStandalone - startStandalone) / (endSynergy - startSynergy)).toFixed(2)}x`);

  // 3. Zero-Copy Chord Progression Analysis
  console.log('\n--- Chord Progression (Zero-Copy) ---');
  const startChords = performance.now();
  const chords = await detector.detectChordProgression(audioBuffer, 2);
  const endChords = performance.now();
  console.log(`Analyzed ${chords.length} segments in ${(endChords - startChords).toFixed(2)}ms`);
  console.log(`Average per segment: ${((endChords - startChords) / chords.length).toFixed(2)}ms`);

  if (keySynergy.key.startsWith('A Major')) {
    console.log('\n✅ Accuracy Verified: Detected A Major correctly.');
  } else {
    console.log(`\n❌ Accuracy Warning: Expected A Major, but detected ${keySynergy.key}`);
  }
}

runBenchmark().catch(console.error);
