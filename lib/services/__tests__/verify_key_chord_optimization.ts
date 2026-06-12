import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { FastFFTEngine } from '../fastFFTEngine';

// Mock Web Audio API
class AudioContextMock {
  sampleRate = 44100;
  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      length: length,
      sampleRate: sampleRate,
      getChannelData: () => new Float32Array(length),
    };
  }
}

(global as any).AudioContext = AudioContextMock;
(global as any).window = { AudioContext: AudioContextMock };

async function benchmark() {
  const ctx = new AudioContextMock() as any;
  const detector = new AdvancedKeyDetection(ctx);
  const fftEngine = new FastFFTEngine(ctx);

  const duration = 120.5; // 2 minutes
  const sampleRate = 44100;
  const length = Math.floor(duration * sampleRate);
  const audioBuffer = ctx.createBuffer(1, length, sampleRate);
  (audioBuffer as any).duration = duration;
  const data = audioBuffer.getChannelData(0);

  // Fill with some "musical" noise
  for (let i = 0; i < length; i++) {
    data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5 + Math.random() * 0.1;
  }

  console.log('--- ⚡ Bolt: Key & Chord Detection Benchmark ---');

  // 1. Benchmark Key Detection (Standalone vs Magnitude Reuse)
  console.log('\n[1] Key Detection Performance:');

  const start1 = performance.now();
  await detector.detectKey(audioBuffer);
  const end1 = performance.now();
  console.log(`Original detectKey (includes 8192 FFT): ${(end1 - start1).toFixed(2)}ms`);

  const { linearMagnitudes } = await fftEngine.performFFT(audioBuffer, 8192);
  const start2 = performance.now();
  detector.detectKeyFromMagnitudes(linearMagnitudes, sampleRate);
  const end2 = performance.now();
  console.log(`Optimized detectKeyFromMagnitudes (O(1) reuse): ${(end2 - start2).toFixed(2)}ms`);
  console.log(`Speedup for integrated analysis: ${((end1 - start1) / (end2 - start2)).toFixed(1)}x`);

  // 2. Benchmark Chord Progression (Subarray Optimization)
  console.log('\n[2] Chord Progression Performance (120s track, 2s segments):');
  const start3 = performance.now();
  const chords = await detector.detectChordProgression(audioBuffer, 2);
  const end3 = performance.now();
  console.log(`Optimized detectChordProgression (subarray + multiple windows): ${(end3 - start3).toFixed(2)}ms`);
  console.log(`Total segments: ${chords.length}`);
  console.log(`Avg per segment: ${((end3 - start3) / chords.length).toFixed(2)}ms`);

  // 3. Verification of correctness
  const mapping = (detector as any).getPitchClassMapping(8192, sampleRate);
  console.log('\n[3] Cache Verification:');
  console.log(`Pitch class cache size: ${AdvancedKeyDetection['pitchClassCache'].size}`);
  console.log(`Mapping length: ${mapping.length}`);
}

benchmark().catch(console.error);
