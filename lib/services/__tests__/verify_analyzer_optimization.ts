
import { AudioAnalysisService } from '../audioAnalysisService';

// Mocking AudioContext for Node environment
class MockAudioBuffer {
  duration = 10;
  sampleRate = 44100;
  numberOfChannels = 2;
  length = 44100 * 10;
  private data: Float32Array[];
  constructor() {
    this.data = [new Float32Array(this.length), new Float32Array(this.length)];
    for (let i = 0; i < this.length; i++) {
      this.data[0][i] = Math.sin(i * 0.01) * 0.5;
      this.data[1][i] = Math.sin(i * 0.012) * 0.4;
    }
  }
  getChannelData(ch: number) { return this.data[ch]; }
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

async function verifyOptimization() {
  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const length = sampleRate * 10; // 10 seconds
  const channelData = [new Float32Array(length), new Float32Array(length)];
  for (let i = 0; i < length; i++) {
    channelData[0][i] = Math.sin(i * 0.01) * 0.5;
    channelData[1][i] = Math.sin(i * 0.012) * 0.4;
  }

  console.log('--- ⚡ Bolt: Verifying Audio Analysis Optimizations ---');

  // 1. Verify analyzeBasicStats Performance
  const startStats = performance.now();
  const stats = (service as any).analyzeBasicStats(channelData, sampleRate);
  const endStats = performance.now();
  console.log(`✅ analyzeBasicStats (O(N) with local counters) took: ${(endStats - startStats).toFixed(4)}ms`);

  // 2. Verify analyzeFrequency Performance & Accuracy
  const fftSize = 8192;
  const spectrum = Array.from({ length: fftSize / 2 }, (_, i) => ({
    frequency: (i * sampleRate) / fftSize,
    magnitude: -20 - Math.random() * 60,
    phase: 0
  }));

  const mockAudioBuffer = { sampleRate: 44100 } as any;

  // Warm up
  for(let i=0; i<10; i++) (service as any).analyzeFrequency(mockAudioBuffer, stats.mono, spectrum);

  const startFreq = performance.now();
  const freqResult = await (service as any).analyzeFrequency(mockAudioBuffer, stats.mono, spectrum);
  const endFreq = performance.now();
  console.log(`✅ analyzeFrequency (Linear Mag Pre-calculation) took: ${(endFreq - startFreq).toFixed(4)}ms`);

  // Verify numerical results for common metrics
  console.log(`   - Spectral Centroid: ${freqResult.spectralCentroid.toFixed(2)} Hz`);
  console.log(`   - Spectral Rolloff: ${freqResult.spectralRolloff.toFixed(2)} Hz`);
  console.log(`   - Spectral Flatness: ${freqResult.spectralFlatness.toFixed(4)}`);
  console.log(`   - Sub Bass: ${freqResult.subBass.percentage.toFixed(2)}%`);
  console.log(`   - Brilliance: ${freqResult.brilliance.percentage.toFixed(2)}%`);

  if (freqResult.spectralCentroid <= 0 || freqResult.spectralCentroid > 22050) {
    throw new Error('Invalid Spectral Centroid calculated!');
  }

  console.log('--- Verification Complete ---');
}

verifyOptimization().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
