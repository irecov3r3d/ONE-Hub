
import { AudioAnalysisService } from '../audioAnalysisService';

// Mocking AudioContext for Node environment
class MockAudioBuffer {
  duration = 10;
  sampleRate = 44100;
  numberOfChannels = 2;
  length = 44100 * 10;
  private dataL: Float32Array;
  private dataR: Float32Array;
  constructor() {
    this.dataL = new Float32Array(this.length);
    this.dataR = new Float32Array(this.length);
    for (let i = 0; i < this.length; i++) {
      this.dataL[i] = Math.sin(i * 0.01) * 0.5;
      this.dataR[i] = Math.cos(i * 0.01) * 0.3;
    }
  }
  getChannelData(ch: number) { return ch === 0 ? this.dataL : this.dataR; }
}

class MockAudioContext {
  decodeAudioData() { return Promise.resolve(new MockAudioBuffer()); }
  createBuffer() { return new MockAudioBuffer(); }
}

(globalThis as any).window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext
};
(globalThis as any).AudioContext = MockAudioContext;

async function verifyStereoOptimization() {
  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const length = sampleRate * 10; // 10 seconds
  const left = new Float32Array(length);
  const right = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    left[i] = Math.sin(i * 0.01) * 0.5;
    right[i] = Math.cos(i * 0.01) * 0.3;
  }

  const channelData = [left, right];

  console.log('--- Verifying Stereo Basic Stats Optimization ---');

  // Time analyzeBasicStats
  const startStats = performance.now();
  const stats = (service as any).analyzeBasicStats(channelData, sampleRate);
  const endStats = performance.now();
  console.log(`analyzeBasicStats (Stereo) took: ${(endStats - startStats).toFixed(4)}ms`);

  // Verify numerical correctness of Mid/Side identities
  let manualSumSqMid = 0;
  let manualSumSqSide = 0;
  for (let i = 0; i < length; i++) {
    const mid = (left[i] + right[i]) * 0.5;
    const side = (left[i] - right[i]) * 0.5;
    manualSumSqMid += mid * mid;
    manualSumSqSide += side * side;
  }

  const optimizedRmsMid = Math.pow(10, stats.rmsMid / 20);
  const optimizedRmsSide = Math.pow(10, stats.rmsSide / 20);
  const optimizedSumSqMid = optimizedRmsMid * optimizedRmsMid * length;
  const optimizedSumSqSide = optimizedRmsSide * optimizedRmsSide * length;

  console.log(`Manual SumSqMid: ${manualSumSqMid.toFixed(4)}`);
  console.log(`Optimized SumSqMid: ${optimizedSumSqMid.toFixed(4)}`);
  console.log(`Manual SumSqSide: ${manualSumSqSide.toFixed(4)}`);
  console.log(`Optimized SumSqSide: ${optimizedSumSqSide.toFixed(4)}`);

  const diffMid = Math.abs(manualSumSqMid - optimizedSumSqMid);
  const diffSide = Math.abs(manualSumSqSide - optimizedSumSqSide);

  if (diffMid > 1e-5 || diffSide > 1e-5) {
    console.error(`Verification FAILED! Mid diff: ${diffMid}, Side diff: ${diffSide}`);
    process.exit(1);
  } else {
    console.log('Numerical verification PASSED!');
  }

  console.log('--- Verification Complete ---');
}

verifyStereoOptimization().catch(error => {
  console.error(error);
  process.exit(1);
});
