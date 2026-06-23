
import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { AudioAnalysisService } from '../audioAnalysisService';
import { FastFFTEngine } from '../fastFFTEngine';

// Mock AudioBuffer
class MockAudioBuffer {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  private data: Float32Array;

  constructor(channels: number, length: number, sampleRate: number) {
    this.duration = length / sampleRate;
    this.sampleRate = sampleRate;
    this.numberOfChannels = channels;
    this.length = length;
    this.data = new Float32Array(length);

    // Fill with a synthetic signal: A Major Chord (A, C#, E)
    const freqs = [440, 554.37, 659.25];
    for (let i = 0; i < length; i++) {
      let val = 0;
      for (const f of freqs) {
        val += Math.sin(2 * Math.PI * f * i / sampleRate);
      }
      this.data[i] = val / freqs.length;
    }
  }

  getChannelData(channel: number) {
    return this.data;
  }
}

// Mock window and AudioContext
(global as any).window = {};
(global as any).AudioBuffer = MockAudioBuffer;
(global as any).AudioContext = class {
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer(channels, length, sampleRate);
  }
  close() { return Promise.resolve(); }
};

async function runBenchmark() {
  console.log('🔬 Verifying Key Detection Synergy and Performance...\n');

  const sampleRate = 44100;
  const duration = 2; // 2 seconds for basic test
  const length = sampleRate * duration;
  const audioBuffer = new MockAudioBuffer(1, length, sampleRate) as any as AudioBuffer;

  const keyDetector = new AdvancedKeyDetection(new (global as any).AudioContext());
  const fftEngine = new FastFFTEngine(new (global as any).AudioContext());

  // 1. Measure raw FFT + Key Detection (Old baseline)
  const startRaw = performance.now();
  const keyResultRaw = await keyDetector.detectKey(audioBuffer);
  const endRaw = performance.now();
  console.log(`[Baseline] detectKey (with internal FFT): ${(endRaw - startRaw).toFixed(2)}ms`);
  console.log(`Result: ${keyResultRaw.key}, Confidence: ${keyResultRaw.confidence.toFixed(2)}`);

  // 2. Measure Integrated Synergy (New)
  const { linearMagnitudes } = await fftEngine.performFFT(audioBuffer, 8192);
  const startSynergy = performance.now();
  const keyResultSynergy = keyDetector.detectKeyFromMagnitudes(linearMagnitudes, sampleRate);
  const endSynergy = performance.now();
  console.log(`[Optimized] detectKeyFromMagnitudes (spectral reuse): ${(endSynergy - startSynergy).toFixed(2)}ms`);
  console.log(`Result: ${keyResultSynergy.key}, Confidence: ${keyResultSynergy.confidence.toFixed(2)}`);

  const speedup = (endRaw - startRaw) / (endSynergy - startSynergy);
  console.log(`⚡ Speedup for Key Detection sub-routine: ${speedup.toFixed(2)}x\n`);

  // 3. Measure Chord Progression (Zero-Copy)
  const longDuration = 120; // 2 minutes
  const longBuffer = new MockAudioBuffer(1, sampleRate * longDuration, sampleRate) as any as AudioBuffer;

  console.log(`🔬 Benchmarking Chord Progression (120s track, 2s segments)...`);
  const startChord = performance.now();
  const chords = await keyDetector.detectChordProgression(longBuffer, 2);
  const endChord = performance.now();
  console.log(`[Optimized] detectChordProgression (Zero-Copy): ${(endChord - startChord).toFixed(2)}ms`);
  console.log(`Processed ${chords.length} segments. Average per segment: ${((endChord - startChord) / chords.length).toFixed(2)}ms\n`);

  // Numerical Accuracy Check
  const expectedKey = 'A Major'; // 440Hz is A4
  console.log(`🎯 Accuracy Check: Expected ${expectedKey}, Got ${keyResultSynergy.key}`);
  if (keyResultSynergy.key === expectedKey) {
    console.log('✅ Key detection correctly identified synthetic A4 signal.');
  } else {
    console.log('⚠️ Key detection mismatch (Expected A Major for 440Hz). check profile rotation.');
  }
}

runBenchmark().catch(console.error);
