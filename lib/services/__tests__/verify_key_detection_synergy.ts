import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { FastFFTEngine } from '../fastFFTEngine';

// Mock AudioBuffer if not in browser
if (typeof (global as any).AudioBuffer === 'undefined') {
  (global as any).AudioBuffer = class AudioBuffer {
    length: number;
    sampleRate: number;
    numberOfChannels: number;
    duration: number;
    private data: Float32Array[];

    constructor(options: { length: number; sampleRate: number; numberOfChannels?: number }) {
      this.length = options.length;
      this.sampleRate = options.sampleRate;
      this.numberOfChannels = options.numberOfChannels || 1;
      this.duration = this.length / this.sampleRate;
      this.data = Array(this.numberOfChannels).fill(0).map(() => new Float32Array(this.length));
    }

    getChannelData(channel: number) {
      return this.data[channel];
    }
    copyFromChannel() {}
    copyToChannel() {}
  };
}

async function verifyKeyDetectionSynergy() {
  console.log('⚡ Benchmarking Spectral Key Detection Synergy...');

  const sampleRate = 44100;
  const duration = 5; // 5 seconds
  const length = sampleRate * duration;
  const audioBuffer = new (global as any).AudioBuffer({
    length,
    sampleRate,
    numberOfChannels: 1
  });

  // Generate a synthetic A Major signal (A=440Hz, C#=554.37Hz, E=659.25Hz)
  const data = audioBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    data[i] =
      0.5 * Math.sin(2 * Math.PI * 440 * t) +    // A
      0.3 * Math.sin(2 * Math.PI * 554.37 * t) + // C#
      0.2 * Math.sin(2 * Math.PI * 659.25 * t);  // E
  }

  const fftEngine = new FastFFTEngine({} as any);
  const keyDetector = new AdvancedKeyDetection({} as any);

  // 1. Measure standard (redundant) path
  console.log('\n--- Path A: Standard (Redundant FFT) ---');
  const startA = performance.now();
  const resultA = await keyDetector.detectKey(audioBuffer);
  const endA = performance.now();
  console.log(`Key: ${resultA.key} (Confidence: ${resultA.confidence.toFixed(2)})`);
  console.log(`Execution Time: ${(endA - startA).toFixed(2)}ms`);

  // 2. Measure optimized (shared magnitude) path
  console.log('\n--- Path B: Optimized (Shared Magnitudes) ---');
  // First, simulate the shared FFT pass
  const { linearMagnitudes } = await fftEngine.performFFT(audioBuffer, 8192);

  const startB = performance.now();
  const resultB = keyDetector.detectKeyFromMagnitudes(linearMagnitudes, sampleRate);
  const endB = performance.now();

  console.log(`Key: ${resultB.key} (Confidence: ${resultB.confidence.toFixed(2)})`);
  console.log(`Execution Time: ${(endB - startB).toFixed(2)}ms`);

  const speedup = (endA - startA) / (endB - startB);
  console.log(`\n🚀 Optimization Result: ${speedup.toFixed(2)}x speedup`);

  // 3. Numerical Integrity Check
  console.log('\n--- Numerical Integrity ---');
  const keysMatch = resultA.key === resultB.key;
  console.log(`Keys Match: ${keysMatch ? '✅' : '❌'}`);

  let chromaDiff = 0;
  for (let i = 0; i < 12; i++) {
    chromaDiff += Math.abs(resultA.chromagram[i] - resultB.chromagram[i]);
  }
  console.log(`Chromagram Integrity: ${chromaDiff < 0.0001 ? '✅' : '❌'} (Diff: ${chromaDiff.toExponential()})`);

  if (keysMatch && chromaDiff < 0.0001) {
    console.log('\n✨ Verification Successful! Spectral synergy is numerically accurate and measurably faster.');
  } else {
    console.error('\n❌ Verification Failed: Numerical mismatch detected.');
    process.exit(1);
  }
}

verifyKeyDetectionSynergy().catch(err => {
  console.error(err);
  process.exit(1);
});
