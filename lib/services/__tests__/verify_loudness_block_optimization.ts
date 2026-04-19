
import * as fs from 'fs';
import * as path from 'path';

// Mock window and AudioContext for Node environment
(global as any).window = {
  AudioContext: class {
    createAnalyser() { return { fftSize: 0, frequencyBinCount: 0 }; }
    createBufferSource() { return { connect: () => {}, start: () => {} }; }
  }
};
(global as any).AudioContext = (global as any).window.AudioContext;
(global as any).OfflineAudioContext = class extends (global as any).AudioContext {};

// Import the service
import { AudioAnalysisService } from '../audioAnalysisService';

async function runVerification() {
  console.log('⚡ Starting Loudness Analysis Optimization Verification...');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const duration = 10; // 10 seconds of audio
  const numSamples = sampleRate * duration;
  const mono = new Float32Array(numSamples);

  // Generate some test audio (sine wave + noise)
  for (let i = 0; i < numSamples; i++) {
    mono[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5 + (Math.random() * 2 - 1) * 0.1;
  }

  // Original Logic (re-implemented here for comparison)
  const originalCalculateLoudness = (samples: Float32Array, sr: number) => {
    const windowSize = Math.floor(sr * 0.4);
    const hopSize = Math.floor(sr * 0.1);
    const points = [];
    for (let i = 0; i < samples.length - windowSize; i += hopSize) {
      let sumSquares = 0;
      let peak = 0;
      for (let j = 0; j < windowSize; j++) {
        const sample = samples[i + j];
        sumSquares += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }
      const rms = Math.sqrt(sumSquares / windowSize);
      const lufs = -0.691 + 10 * Math.log10(rms * rms + 1e-10);
      const peakdB = peak > 0 ? 20 * Math.log10(peak) : -100;
      points.push({ time: i / sr, lufs, peak: peakdB });
    }
    return points;
  };

  console.log('--- Performance Comparison (10s Audio) ---');

  const startOriginal = Date.now();
  const originalResult = originalCalculateLoudness(mono, sampleRate);
  const endOriginal = Date.now();
  console.log(`Original Logic: ${endOriginal - startOriginal}ms`);

  const startOptimized = Date.now();
  // Access private method for testing
  const optimizedResult = (service as any).calculateLoudnessOverTime(mono, sampleRate);
  const endOptimized = Date.now();
  console.log(`Optimized Logic: ${endOptimized - startOptimized}ms`);

  const speedup = (endOriginal - startOriginal) / (endOptimized - startOptimized);
  console.log(`Speedup: ${speedup.toFixed(2)}x`);

  console.log('\n--- Accuracy Verification ---');
  let maxDiffLUFS = 0;
  let maxDiffPeak = 0;

  const compareCount = Math.min(originalResult.length, optimizedResult.length);
  for (let i = 0; i < compareCount; i++) {
    const diffLUFS = Math.abs(originalResult[i].lufs - optimizedResult[i].lufs);
    const diffPeak = Math.abs(originalResult[i].peak - optimizedResult[i].peak);
    if (diffLUFS > maxDiffLUFS) maxDiffLUFS = diffLUFS;
    if (diffPeak > maxDiffPeak) maxDiffPeak = diffPeak;
  }

  console.log(`Max LUFS difference: ${maxDiffLUFS.toExponential(4)}`);
  console.log(`Max Peak difference: ${maxDiffPeak.toExponential(4)}`);

  // Tolerance check for LUFS (logarithmic domain small differences are expected due to sumSq accumulation order)
  const LUFS_TOLERANCE = 1e-5;
  if (maxDiffLUFS < LUFS_TOLERANCE && maxDiffPeak < 1e-10) {
    console.log(`✅ Verification PASSED: Outputs are within tolerance (${LUFS_TOLERANCE}).`);
  } else {
    console.log('❌ Verification FAILED: Significant differences detected.');
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
