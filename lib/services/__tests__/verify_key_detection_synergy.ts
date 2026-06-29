
import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { FastFFTEngine } from '../fastFFTEngine';

// Mock AudioBuffer
class MockAudioBuffer {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  private data: Float32Array;

  constructor(options: { duration: number; sampleRate: number; numberOfChannels: number }) {
    this.duration = options.duration;
    this.sampleRate = options.sampleRate;
    this.numberOfChannels = options.numberOfChannels;
    this.length = Math.floor(options.duration * options.sampleRate);
    this.data = new Float32Array(this.length);

    // Generate a simple A Major triad signal (A4=440Hz, C#5=554.37Hz, E5=659.25Hz)
    for (let i = 0; i < this.length; i++) {
      const t = i / this.sampleRate;
      this.data[i] = 0.3 * (
        Math.sin(2 * Math.PI * 440 * t) +
        Math.sin(2 * Math.PI * 554.37 * t) +
        Math.sin(2 * Math.PI * 659.25 * t)
      );
    }
  }

  getChannelData(channel: number) {
    return this.data;
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel?: number) {
    destination.set(this.data.subarray(startInChannel || 0, (startInChannel || 0) + destination.length));
  }
}

// @ts-ignore
global.AudioBuffer = MockAudioBuffer;
// @ts-ignore
global.window = { AudioContext: class {} };

async function runBenchmark() {
  console.log('⚡ Starting Key Detection Synergy Benchmark...');

  const sampleRate = 44100;
  const audioBuffer = new MockAudioBuffer({ duration: 120, sampleRate, numberOfChannels: 1 }) as unknown as AudioBuffer;
  const fftEngine = new FastFFTEngine({} as any);
  const keyDetector = new AdvancedKeyDetection({} as any);

  // 1. Measure standard path (performs FFT)
  console.log('\n--- Standard Path (includes FFT) ---');
  const startStd = performance.now();
  const resStd = await keyDetector.detectKey(audioBuffer);
  const endStd = performance.now();
  console.log(`Key: ${resStd.key}, Confidence: ${resStd.confidence.toFixed(4)}`);
  console.log(`Duration: ${(endStd - startStd).toFixed(2)}ms`);

  // 2. Measure synergistic path (reuses magnitudes)
  console.log('\n--- Synergistic Path (reuses magnitudes) ---');
  const { linearMagnitudes } = await fftEngine.performFFT(audioBuffer, 8192);

  const startSyn = performance.now();
  const resSyn = keyDetector.detectKeyFromMagnitudes(linearMagnitudes, sampleRate);
  const endSyn = performance.now();
  console.log(`Key: ${resSyn.key}, Confidence: ${resSyn.confidence.toFixed(4)}`);
  console.log(`Duration: ${(endSyn - startSyn).toFixed(2)}ms`);

  const speedup = (endStd - startStd) / (endSyn - startSyn);
  console.log(`\n🚀 Spectral Synergy Speedup: ${speedup.toFixed(2)}x`);

  // 3. Measure Chord Progression (Zero-Copy)
  console.log('\n--- Chord Progression (Zero-Copy Subarray) ---');
  const startChord = performance.now();
  const chords = await keyDetector.detectChordProgression(audioBuffer, 2);
  const endChord = performance.now();
  console.log(`Detected ${chords.length} segments in ${(endChord - startChord).toFixed(2)}ms`);
  console.log(`Average per segment: ${((endChord - startChord) / chords.length).toFixed(2)}ms`);

  console.log('\n✅ Benchmark Complete.');
}

runBenchmark().catch(console.error);
