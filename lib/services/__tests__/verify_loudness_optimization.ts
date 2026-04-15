
import { AudioAnalysisService } from '../audioAnalysisService';

// Mock AudioContext and other browser APIs for Node environment
const mockAudioContext = {
  sampleRate: 44100,
  decodeAudioData: async () => ({
    duration: 10,
    sampleRate: 44100,
    numberOfChannels: 1,
    getChannelData: () => new Float32Array(441000)
  })
};

(globalThis as any).window = {
  AudioContext: function() { return mockAudioContext; },
  webkitAudioContext: function() { return mockAudioContext; }
};
(globalThis as any).AudioContext = (globalThis as any).window.AudioContext;

class BaselineAudioAnalysisService extends AudioAnalysisService {
  public calculateLoudnessOverTimeBaseline(
    mono: Float32Array,
    sampleRate: number
  ): any[] {
    const windowSize = Math.floor(sampleRate * 0.4);
    const hopSize = Math.floor(sampleRate * 0.1);
    const loudnessPoints: any[] = [];

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

      loudnessPoints.push({
        time: i / sampleRate,
        lufs,
        peak: peakdB,
      });
    }

    return loudnessPoints;
  }

  public calculateLoudnessOverTimeOptimized(
    mono: Float32Array,
    sampleRate: number
  ): any[] {
    // @ts-ignore - accessing private method for testing
    return this.calculateLoudnessOverTime(mono, sampleRate);
  }
}

async function verifyOptimization() {
  const service = new BaselineAudioAnalysisService();
  const sampleRate = 44100;
  const duration = 600; // 10 minutes
  const numSamples = sampleRate * duration;
  const mono = new Float32Array(numSamples);

  // Fill with random noise and some sine waves
  for (let i = 0; i < numSamples; i++) {
    mono[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5 + (Math.random() - 0.5) * 0.1;
  }

  console.log(`--- Verifying Loudness Optimization (${duration}s audio) ---`);

  // Measure Baseline
  const startBaseline = Date.now();
  const baselineResults = service.calculateLoudnessOverTimeBaseline(mono, sampleRate);
  const endBaseline = Date.now();
  const baselineTime = endBaseline - startBaseline;

  // Measure Optimized
  const startOptimized = Date.now();
  const optimizedResults = service.calculateLoudnessOverTimeOptimized(mono, sampleRate);
  const endOptimized = Date.now();
  const optimizedTime = endOptimized - startOptimized;

  console.log(`Baseline Time: ${baselineTime}ms`);
  console.log(`Optimized Time: ${optimizedTime}ms`);
  console.log(`Speedup: ${(baselineTime / (optimizedTime || 1)).toFixed(2)}x`);

  // Verify accuracy
  let maxDiffLUFS = 0;
  let maxDiffPeak = 0;

  if (baselineResults.length !== optimizedResults.length) {
    console.error(`Mismatch in number of points: Baseline=${baselineResults.length}, Optimized=${optimizedResults.length}`);
  } else {
    for (let i = 0; i < baselineResults.length; i++) {
      const diffLUFS = Math.abs(baselineResults[i].lufs - optimizedResults[i].lufs);
      const diffPeak = Math.abs(baselineResults[i].peak - optimizedResults[i].peak);
      if (diffLUFS > maxDiffLUFS) maxDiffLUFS = diffLUFS;
      if (diffPeak > maxDiffPeak) maxDiffPeak = diffPeak;
    }

    console.log(`Max LUFS difference: ${maxDiffLUFS.toExponential(4)}`);
    console.log(`Max Peak difference: ${maxDiffPeak.toExponential(4)}`);

    if (maxDiffLUFS < 1e-7 && maxDiffPeak < 1e-7) {
      console.log('✅ Accuracy Verification PASSED');
    } else {
      console.error('❌ Accuracy Verification FAILED');
    }
  }
}

verifyOptimization().catch(console.error);
