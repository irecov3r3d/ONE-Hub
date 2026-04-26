
import { AudioAnalysisService } from '../audioAnalysisService';

// Mock AudioContext for Node environment
const mockAudioContext = {
  decodeAudioData: async (arrayBuffer: ArrayBuffer) => {
    const duration = 60;
    const sampleRate = 44100;
    const length = duration * sampleRate;
    return {
      duration,
      sampleRate,
      length,
      numberOfChannels: 2,
      getChannelData: (ch: number) => new Float32Array(length).fill(0).map(() => Math.random() * 2 - 1),
    };
  },
} as any;

(globalThis as any).window = { AudioContext: function() { return mockAudioContext; } };
(globalThis as any).AudioContext = (globalThis as any).window.AudioContext;

/**
 * Baseline (Original) implementations to compare against
 */
class BaselineAnalysis {
  static calculateLoudnessOverTime(mono: Float32Array, sampleRate: number) {
    const hopSize = Math.floor(sampleRate * 0.1);
    const numBlocks = Math.floor(mono.length / hopSize);
    const windowInBlocks = 4;
    const loudnessPoints: any[] = [];
    if (numBlocks < windowInBlocks) return [];

    const blockEnergy = new Float32Array(numBlocks);
    const blockPeaks = new Float32Array(numBlocks);

    for (let b = 0; b < numBlocks; b++) {
      let sumSq = 0;
      let peak = 0;
      const start = b * hopSize;
      for (let i = 0; i < hopSize; i++) {
        const sample = mono[start + i];
        const abs = Math.abs(sample);
        sumSq += sample * sample;
        if (abs > peak) peak = abs;
      }
      blockEnergy[b] = sumSq;
      blockPeaks[b] = peak;
    }

    const windowSize = hopSize * windowInBlocks;
    const invWindowSize = 1 / windowSize;

    for (let b = 0; b < numBlocks - windowInBlocks; b++) {
      let totalSumSq = 0;
      let maxPeak = 0;
      for (let i = 0; i < windowInBlocks; i++) {
        totalSumSq += blockEnergy[b + i];
        if (blockPeaks[b + i] > maxPeak) maxPeak = blockPeaks[b + i];
      }
      const rmsSq = totalSumSq * invWindowSize;
      const lufs = -0.691 + 10 * Math.log10(rmsSq + 1e-10);
      const peakdB = maxPeak > 0 ? 20 * Math.log10(maxPeak) : -100;
      loudnessPoints.push({ time: (b * hopSize) / sampleRate, lufs, peak: peakdB });
    }
    return loudnessPoints;
  }

  static detectSilence(samples: Float32Array, sampleRate: number) {
    const threshold = -60;
    const minDuration = 0.5;
    const silentSections: any[] = [];
    let inSilence = false;
    let silenceStart = 0;
    const hopSize = Math.floor(sampleRate * 0.1);

    for (let i = 0; i < samples.length; i += hopSize) {
      let sumSq = 0;
      const actualHop = Math.min(hopSize, samples.length - i);
      for (let j = 0; j < actualHop; j++) {
        sumSq += samples[i + j] * samples[i + j];
      }
      const rms = Math.sqrt(sumSq / (actualHop + 1e-10));
      const level = rms > 0 ? 20 * Math.log10(rms) : -100;

      if (level < threshold && !inSilence) {
        inSilence = true;
        silenceStart = i / sampleRate;
      } else if (level >= threshold && inSilence) {
        const duration = i / sampleRate - silenceStart;
        if (duration >= minDuration) {
          silentSections.push({ startTime: silenceStart, endTime: i / sampleRate, duration, threshold });
        }
        inSilence = false;
      }
    }
    return silentSections;
  }
}

async function runBenchmark() {
  console.log('⚡ Starting Audio Analysis Consolidation Benchmark...');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const duration = 60; // 1 minute
  const length = sampleRate * duration;
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i++) mono[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5;

  // Add some silence
  for (let i = Math.floor(length * 0.4); i < Math.floor(length * 0.6); i++) mono[i] = 0;

  const channelData = [mono, mono];

  // 1. Benchmark analyzeBasicStats (The core loop that now does more)
  const startStats = performance.now();
  const stats = (service as any).analyzeBasicStats(channelData, sampleRate);
  const endStats = performance.now();
  console.log(`- analyzeBasicStats (Optimized, includes blocks): ${(endStats - startStats).toFixed(3)}ms`);

  // 2. Compare Loudness Analysis
  console.log('\n--- Loudness Analysis Performance ---');

  const startLoudOld = performance.now();
  const loudOld = BaselineAnalysis.calculateLoudnessOverTime(mono, sampleRate);
  const endLoudOld = performance.now();

  const startLoudNew = performance.now();
  const loudNew = (service as any).calculateLoudnessOverTime(stats, sampleRate);
  const endLoudNew = performance.now();

  console.log(`- Baseline (O(N)):  ${(endLoudOld - startLoudOld).toFixed(3)}ms`);
  console.log(`- Optimized (O(N/hop)): ${(endLoudNew - startLoudNew).toFixed(3)}ms`);
  console.log(`- Speedup: ${( (endLoudOld - startLoudOld) / (endLoudNew - startLoudNew) ).toFixed(2)}x`);

  // 3. Compare Silence Detection
  console.log('\n--- Silence Detection Performance ---');

  const startSilOld = performance.now();
  const silOld = BaselineAnalysis.detectSilence(mono, sampleRate);
  const endSilOld = performance.now();

  const startSilNew = performance.now();
  const silNew = (service as any).detectSilence(stats, sampleRate);
  const endSilNew = performance.now();

  console.log(`- Baseline (O(N)):  ${(endSilOld - startSilOld).toFixed(3)}ms`);
  console.log(`- Optimized (O(N/hop)): ${(endSilNew - startSilNew).toFixed(3)}ms`);
  console.log(`- Speedup: ${( (endSilOld - startSilOld) / (endSilNew - startSilNew) ).toFixed(2)}x`);

  // 4. Verify Correctness
  console.log('\n--- Numerical Verification ---');

  const lufsDiff = Math.abs(loudOld[100].lufs - loudNew[100].lufs);
  console.log(`- LUFS difference at sample 100: ${lufsDiff.toExponential(4)}`);

  const silMatch = silOld.length === silNew.length;
  console.log(`- Silence section count match: ${silMatch} (${silOld.length} vs ${silNew.length})`);

  if (lufsDiff < 1e-10 && silMatch) {
    console.log('\n✅ Logic verification PASSED!');
  } else {
    console.log('\n❌ Logic verification FAILED!');
    process.exit(1);
  }
}

runBenchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
