import { AudioAnalysisService } from '../audioAnalysisService';
import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { FastFFTEngine } from '../fastFFTEngine';
import { performance } from 'perf_hooks';

/**
 * ⚡ Bolt Benchmark: Spectral Synergy & Zero-Copy Key Detection
 * Verifies the speedup of reusing 8192-point magnitudes and cached pitch mapping.
 */
async function runSynergyBenchmark() {
  console.log('⚡ Starting Bolt Spectral Synergy Benchmark...');

  const sampleRate = 44100;
  const fftSize = 8192;
  const numChannels = 2;
  const duration = 10; // 10 seconds for benchmark
  const length = sampleRate * duration;

  // Mock Global Environment
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};

  // Create Mock AudioBuffer
  const left = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    // Generate a strong A4 (440Hz) tone to ensure deterministic key detection
    left[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
  }

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: numChannels,
    getChannelData: (ch: number) => left, // Simple mono-in-stereo for benchmark
  } as unknown as AudioBuffer;

  const keyDetector = new AdvancedKeyDetection({} as AudioContext);
  const fftEngine = new FastFFTEngine({} as AudioContext);

  console.log('\n--- Phase 1: Baseline (Individual FFT + No Cache) ---');
  // Warm up once to initialize any static caches that AREN'T being benchmarked
  await keyDetector.detectKey(mockAudioBuffer);

  const startBaseline = performance.now();
  const baselineResult = await keyDetector.detectKey(mockAudioBuffer);
  const endBaseline = performance.now();
  console.log(`Baseline Duration: ${(endBaseline - startBaseline).toFixed(2)}ms`);
  console.log(`Detected Key: ${baselineResult.key} (${(baselineResult.confidence * 100).toFixed(1)}%)`);

  console.log('\n--- Phase 2: Synergized (Spectral Reuse + Pitch Cache) ---');
  // 1. Simulate AudioAnalysisService performing the initial FFT
  const { linearMagnitudes } = await fftEngine.performFFT(mockAudioBuffer, fftSize);

  // 2. Measure the "Hot" detection (spectral reuse)
  const startSynergy = performance.now();
  const synergyResult = keyDetector.detectKeyFromMagnitudes(linearMagnitudes, sampleRate);
  const endSynergy = performance.now();

  console.log(`Synergized Duration: ${(endSynergy - startSynergy).toFixed(2)}ms`);
  console.log(`Detected Key: ${synergyResult.key} (${(synergyResult.confidence * 100).toFixed(1)}%)`);

  const speedup = (endBaseline - startBaseline) / (endSynergy - startSynergy);
  console.log(`\n⚡ INTEGRATED SPEEDUP: ${speedup.toFixed(2)}x`);

  // Verification
  const isMatch = baselineResult.key === synergyResult.key;
  console.log(`Numerical Accuracy Verified: ${isMatch ? '✅ MATCH' : '❌ MISMATCH'}`);

  if (!isMatch) {
    process.exit(1);
  }

  console.log('\n--- Phase 3: Chord Progression (Zero-Copy Subarrays) ---');
  const startChords = performance.now();
  const chords = await keyDetector.detectChordProgression(mockAudioBuffer, 2);
  const endChords = performance.now();
  console.log(`Chord Progression Duration: ${(endChords - startChords).toFixed(2)}ms for ${chords.length} segments`);
  console.log(`Average Segment Processing: ${((endChords - startChords) / chords.length).toFixed(2)}ms`);

  console.log('\n⚡ Benchmark Complete.');
}

runSynergyBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
