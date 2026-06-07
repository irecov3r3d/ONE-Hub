import { AdvancedKeyDetection } from '../advancedKeyDetection';

/**
 * Mocking Global Web Audio API for Node environment
 */
const mockAudioBuffer = (length: number, sampleRate: number, numChannels: number) => ({
  length,
  duration: length / sampleRate,
  sampleRate,
  numberOfChannels: numChannels,
  getChannelData: (ch: number) => new Float32Array(length).map(() => Math.random() * 2 - 1),
});

(globalThis as any).window = globalThis;
(globalThis as any).AudioContext = class {
  createAnalyser() { return { fftSize: 2048, frequencyBinCount: 1024, getFloatFrequencyData: () => {} }; }
};
(globalThis as any).OfflineAudioContext = class {
  createBuffer(nc: number, l: number, sr: number) { return mockAudioBuffer(l, sr, nc); }
};

async function benchmark() {
  console.log('--- ⚡ Bolt Key/Chord Optimization Benchmark ---');

  const sampleRate = 44100;
  const durationSeconds = 120; // 2 minute track
  const audioBuffer = mockAudioBuffer(durationSeconds * sampleRate, sampleRate, 2) as any;
  const keyDetector = new AdvancedKeyDetection({} as any);

  const fftSize = 8192;
  const magnitudes = new Float32Array(fftSize / 2).map(() => Math.random());

  // 1. Benchmark detectKeyFromMagnitudes (Cold vs Hot)
  console.log('\n1. Measuring detectKeyFromMagnitudes (Cold)...');
  const startCold = performance.now();
  keyDetector.detectKeyFromMagnitudes(magnitudes, sampleRate);
  const endCold = performance.now();
  console.log(`Cold Execution time: ${(endCold - startCold).toFixed(4)}ms`);

  console.log('\n2. Measuring detectKeyFromMagnitudes (Hot)...');
  const startHot = performance.now();
  const keyResult = keyDetector.detectKeyFromMagnitudes(magnitudes, sampleRate);
  const endHot = performance.now();
  console.log(`Hot Execution time: ${(endHot - startHot).toFixed(4)}ms`);
  console.log(`Key Result: ${keyResult.key} (${keyResult.confidence.toFixed(4)} confidence)`);

  // 3. Benchmark detectChordProgression (Segment efficiency)
  console.log('\n3. Measuring detectChordProgression (120s track, 2s hop = 60 segments)...');
  const startChords = performance.now();
  const chords = await keyDetector.detectChordProgression(audioBuffer, 2);
  const endChords = performance.now();

  console.log(`Detected ${chords.length} chords.`);
  console.log(`Total execution time: ${(endChords - startChords).toFixed(2)}ms`);
  console.log(`Average time per segment (FFT + Key): ${((endChords - startChords) / chords.length).toFixed(2)}ms`);

  // Verification of logic (Identity check)
  console.log('\n4. Verifying Numerical Integrity...');
  const chroma = (keyDetector as any).calculateChromagramFromMagnitudes(magnitudes, sampleRate);
  if (chroma.every((v: number) => v > 0)) {
    console.log('✅ SUCCESS: Chromagram populated correctly.');
  }
}

benchmark().catch(console.error);
