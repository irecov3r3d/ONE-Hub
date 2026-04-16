
import { AudioAnalysisService } from '../audioAnalysisService';

// Mock window and AudioContext for Node environment
(global as any).window = {
  AudioContext: class {
    createAnalyser() { return { fftSize: 2048, frequencyBinCount: 1024 }; }
  },
  webkitAudioContext: class {}
};

async function verifyLoudnessOptimization() {
  console.log('--- Verifying Loudness Analysis Optimization ---');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const duration = 60; // 60 seconds
  const mono = new Float32Array(sampleRate * duration);

  // Fill with dummy signal
  for (let i = 0; i < mono.length; i++) {
    mono[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5;
    if (i % 1000 === 0) mono[i] = 0.9;
  }

  function originalCalculateLoudnessOverTime(mono: Float32Array, sampleRate: number) {
    const windowSize = Math.floor(sampleRate * 0.4);
    const hopSize = Math.floor(sampleRate * 0.1);
    const results = [];
    for (let i = 0; i < mono.length - windowSize; i += hopSize) {
      let sumSquares = 0;
      let peak = 0;
      for (let j = 0; j < windowSize; j++) {
        const sample = mono[i + j];
        sumSquares += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }
      const rms = Math.sqrt(sumSquares / windowSize);
      const lufs = -0.691 + 10 * Math.log10(rms * rms + 1e-10);
      const peakdB = peak > 0 ? 20 * Math.log10(peak) : -100;
      results.push({ time: i / sampleRate, lufs, peak: peakdB });
    }
    return results;
  }

  console.log('Running original implementation...');
  const startOld = Date.now();
  const expected = originalCalculateLoudnessOverTime(mono, sampleRate);
  const endOld = Date.now();
  console.log(`Original took: ${endOld - startOld}ms`);

  console.log('Running optimized implementation (AudioAnalysisService)...');
  const startNew = Date.now();
  const actual = (service as any).calculateLoudnessOverTime(mono, sampleRate);
  const endNew = Date.now();
  console.log(`Optimized took: ${endNew - startNew}ms`);

  // Verify
  if (expected.length !== actual.length) {
    throw new Error(`Length mismatch: expected ${expected.length}, got ${actual.length}`);
  }
  for (let i = 0; i < expected.length; i++) {
    const diffLUFS = Math.abs(expected[i].lufs - actual[i].lufs);
    const diffPeak = Math.abs(expected[i].peak - actual[i].peak);
    if (diffLUFS > 0.0001 || diffPeak > 0.0001) {
      console.error(`Mismatch at index ${i}:`);
      console.error(`Expected: LUFS=${expected[i].lufs}, Peak=${expected[i].peak}`);
      console.error(`Actual:   LUFS=${actual[i].lufs}, Peak=${actual[i].peak}`);
      throw new Error('Optimization verification failed: numeric mismatch');
    }
  }
  console.log('✅ Success! Optimized results match original logic.');
  const speedup = (endOld - startOld) / (endNew - startNew || 1);
  console.log(`Speedup: ~${speedup.toFixed(2)}x`);
}

verifyLoudnessOptimization().catch(err => {
  console.error(err);
  process.exit(1);
});
