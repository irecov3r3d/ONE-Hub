
import { AudioAnalysisService } from '../audioAnalysisService';

// Mocking AudioContext for Node environment
class MockAudioBuffer {
  duration = 10;
  sampleRate = 44100;
  numberOfChannels = 1;
  length = 44100 * 10;
  private data: Float32Array;
  constructor() {
    this.data = new Float32Array(this.length);
    for (let i = 0; i < this.length; i++) {
      this.data[i] = Math.sin(i * 0.01) * 0.5;
    }
  }
  getChannelData() { return this.data; }
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
  const channelData = [new Float32Array(length)];
  for (let i = 0; i < length; i++) {
    channelData[0][i] = Math.sin(i * 0.01) * 0.5;
  }

  console.log('--- Verifying Block Optimization ---');

  // Time analyzeBasicStats
  const startStats = performance.now();
  const stats = (service as any).analyzeBasicStats(channelData, sampleRate);
  const endStats = performance.now();
  console.log(`analyzeBasicStats took: ${(endStats - startStats).toFixed(4)}ms`);

  // Verify blocks and mono are populated
  console.log(`100ms blocks: ${stats.blockEnergy100ms.length}`);
  console.log(`512-sample blocks: ${stats.blockEnergy512.length}`);
  console.log(`Mono length: ${stats.mono?.length}`);

  if (!stats.mono || stats.blockEnergy100ms.length === 0 || stats.blockEnergy512.length === 0) {
    throw new Error('Blocks or mono were not populated!');
  }

  // Time downstream analyses
  const startLoudness = performance.now();
  const loudness = (service as any).calculateLoudnessOverTime(stats, sampleRate);
  const endLoudness = performance.now();
  console.log(`calculateLoudnessOverTime (optimized) took: ${(endLoudness - startLoudness).toFixed(4)}ms`);

  const startSilence = performance.now();
  const silence = (service as any).detectSilence(stats, sampleRate);
  const endSilence = performance.now();
  console.log(`detectSilence (optimized) took: ${(endSilence - startSilence).toFixed(4)}ms`);

  const mockAudioBuffer = { duration: 10, sampleRate: 44100 };
  const startSections = performance.now();
  const sections = (service as any).detectSections(mockAudioBuffer, stats);
  const endSections = performance.now();
  console.log(`detectSections (optimized) took: ${(endSections - startSections).toFixed(4)}ms`);

  console.log('--- Verification Complete ---');
}

verifyOptimization().catch(console.error);
