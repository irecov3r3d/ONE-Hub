import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

async function verifyOptimization() {
  console.log('⚡ Verifying AdvancedKeyDetection Optimization...');

  const sampleRate = 44100;
  const duration = 120; // 2 minutes
  const length = sampleRate * duration;
  const channelData = new Float32Array(length).fill(0).map(() => Math.random() * 2 - 1);

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData: () => channelData,
  } as unknown as AudioBuffer;

  // Mock global window/AudioContext for service initialization
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};

  const keyDetector = new AdvancedKeyDetection(new (global as any).AudioContext());

  console.log('\n--- Phase 1: Chord Progression Detection (Subarray + Iterative FFT) ---');
  const start = performance.now();
  const chords = await keyDetector.detectChordProgression(mockAudioBuffer, 2);
  const end = performance.now();

  console.log(`Processed ${chords.length} segments in ${(end - start).toFixed(2)}ms`);
  console.log(`Average time per segment: ${((end - start) / chords.length).toFixed(2)}ms`);

  console.log('\n--- Phase 2: Key Detection from Magnitudes ---');
  const fftSize = 8192;
  const magnitudes = new Float32Array(fftSize / 2).fill(0.1);
  const startKey = performance.now();
  const key = keyDetector.detectKeyFromMagnitudes(magnitudes, sampleRate, fftSize);
  const endKey = performance.now();

  console.log(`Key detected in ${(endKey - startKey).toFixed(2)}ms: ${key.key}`);

  console.log('\n⚡ Verification Complete.');
}

verifyOptimization().catch(console.error);
