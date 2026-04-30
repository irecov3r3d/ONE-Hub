
import { AudioAnalysisService } from '../audioAnalysisService';

// Mock Web Audio API
class MockAudioBuffer {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  private channelData: Float32Array[];

  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.channelData = Array(channels).fill(0).map(() => new Float32Array(length));

    // Fill with some data (sine wave + noise)
    for (let c = 0; c < channels; c++) {
      for (let i = 0; i < length; i++) {
        this.channelData[c][i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5 + (Math.random() - 0.5) * 0.1;
      }
    }
  }

  getChannelData(channel: number) {
    return this.channelData[channel];
  }
}

(globalThis as any).AudioContext = class {
  decodeAudioData() {}
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer(channels, length, sampleRate);
  }
};
(globalThis as any).window = globalThis;

async function runBenchmark() {
  console.log('⚡ Starting Block Optimization Benchmark...');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const duration = 10; // 10 seconds for quick verification
  const length = sampleRate * duration;
  const buffer = new MockAudioBuffer(2, length, sampleRate);

  const channelData = [buffer.getChannelData(0), buffer.getChannelData(1)];

  console.log(`Analyzing ${duration}s of audio (${length} samples)...`);

  // Measure analyzeBasicStats
  const startBasic = performance.now();
  const stats = (service as any).analyzeBasicStats(channelData, sampleRate);
  const endBasic = performance.now();
  console.log(`✅ analyzeBasicStats (including multiple resolutions): ${(endBasic - startBasic).toFixed(2)}ms`);

  // Verification of values
  console.log('\n🔍 Verifying accuracy...');

  // Verify blockEnergy512 (RMS)
  const firstBlock512 = (service as any).statsMonoRMS(channelData[0], channelData[1], 0, 512);
  console.log(`- Block 512 RMS expected: ${firstBlock512.toFixed(6)}, actual: ${stats.blockEnergy512[0].toFixed(6)}`);
  const diff512 = Math.abs(firstBlock512 - stats.blockEnergy512[0]);
  if (diff512 < 1e-6) console.log('  ✅ blockEnergy512 accuracy verified!');
  else console.error(`  ❌ blockEnergy512 discrepancy: ${diff512}`);

  // Verify blockEnergy100ms (Power)
  const hop100ms = Math.floor(sampleRate * 0.1);
  const firstBlock100msPower = (service as any).statsMonoPower(channelData[0], channelData[1], 0, hop100ms);
  console.log(`- Block 100ms Power expected: ${firstBlock100msPower.toFixed(6)}, actual: ${stats.blockEnergy100ms[0].toFixed(6)}`);
  const diff100ms = Math.abs(firstBlock100msPower - stats.blockEnergy100ms[0]);
  if (diff100ms < 1e-6) console.log('  ✅ blockEnergy100ms accuracy verified!');
  else console.error(`  ❌ blockEnergy100ms discrepancy: ${diff100ms}`);

  // Measure downstream methods
  const startLoudness = performance.now();
  const loudness = (service as any).calculateLoudnessOverTime(stats, sampleRate);
  const endLoudness = performance.now();
  console.log(`✅ calculateLoudnessOverTime: ${(endLoudness - startLoudness).toFixed(2)}ms`);

  const startSilence = performance.now();
  const silence = (service as any).detectSilence(stats, sampleRate);
  const endSilence = performance.now();
  console.log(`✅ detectSilence: ${(endSilence - startSilence).toFixed(2)}ms`);

  const startSections = performance.now();
  const sections = (service as any).detectSections(buffer, stats);
  const endSections = performance.now();
  console.log(`✅ detectSections: ${(endSections - startSections).toFixed(2)}ms`);

  console.log('\n📊 Summary:');
  console.log('All methods now operate at O(N/hop) complexity by reusing pre-calculated blocks.');
}

// Add helper methods to service for verification if needed, or just implement here
(AudioAnalysisService.prototype as any).statsMonoRMS = function(left: Float32Array, right: Float32Array, start: number, len: number) {
  let sumSq = 0;
  for (let i = 0; i < len; i++) {
    const mono = (left[start + i] + right[start + i]) / 2;
    sumSq += mono * mono;
  }
  return Math.sqrt(sumSq / len);
};

(AudioAnalysisService.prototype as any).statsMonoPower = function(left: Float32Array, right: Float32Array, start: number, len: number) {
  let sumSq = 0;
  for (let i = 0; i < len; i++) {
    const mono = (left[start + i] + right[start + i]) / 2;
    sumSq += mono * mono;
  }
  return sumSq / len;
};

runBenchmark().catch(console.error);
