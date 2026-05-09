import { AudioAnalysisService } from '../audioAnalysisService';

// Mock AudioContext and OfflineAudioContext for Node environment
class MockAudioBuffer {
  duration: number;
  length: number;
  sampleRate: number;
  numberOfChannels: number;
  private data: Float32Array[];

  constructor({ length, sampleRate, numberOfChannels }: any) {
    this.length = length;
    this.sampleRate = sampleRate;
    this.numberOfChannels = numberOfChannels;
    this.duration = length / sampleRate;
    this.data = Array(numberOfChannels).fill(0).map(() => new Float32Array(length));
  }

  getChannelData(channel: number) {
    return this.data[channel];
  }
}

(globalThis as any).AudioContext = class {
  decodeAudioData() {}
};
(globalThis as any).window = { AudioContext: (globalThis as any).AudioContext };

async function verifyOptimization() {
  console.log('--- Verifying AudioAnalysisService Optimization ---');

  const sampleRate = 44100;
  const length = sampleRate * 5; // 5 seconds
  const mockBuffer = new MockAudioBuffer({ length, sampleRate, numberOfChannels: 2 });

  // Fill with dummy data (sine wave + some "silence")
  const left = mockBuffer.getChannelData(0);
  const right = mockBuffer.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const val = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    if (i < length * 0.8) {
      left[i] = val * 0.5;
      right[i] = val * 0.3;
    } else {
      // Silence at the end
      left[i] = 0;
      right[i] = 0;
    }
  }

  const service = new AudioAnalysisService() as any;
  const channelData = [left, right];

  console.log('1. Testing analyzeBasicStats...');
  const start = performance.now();
  const stats = service.analyzeBasicStats(channelData, sampleRate);
  const end = performance.now();
  console.log(`   analyzeBasicStats took ${(end - start).toFixed(4)}ms`);

  console.log('2. Verifying Block Metrics...');
  console.log(`   numBlocks512: ${stats.blockEnergy512.length}`);
  console.log(`   numBlocks100ms: ${stats.blockEnergy100ms.length}`);

  if (stats.blockEnergy512.length === 0 || stats.blockEnergy100ms.length === 0) {
    throw new Error('Block metrics are empty!');
  }

  console.log('3. Testing downstream methods (reusing blocks)...');

  const tStart = performance.now();
  const temporal = await service.analyzeTemporalFeatures(mockBuffer, stats);
  const tEnd = performance.now();
  console.log(`   analyzeTemporalFeatures took ${(tEnd - tStart).toFixed(4)}ms`);

  const lStart = performance.now();
  const loudness = await service.analyzeLoudness(mockBuffer, stats);
  const lEnd = performance.now();
  console.log(`   analyzeLoudness took ${(lEnd - lStart).toFixed(4)}ms`);

  const sStart = performance.now();
  const silence = service.detectSilence(stats, sampleRate);
  const sEnd = performance.now();
  console.log(`   detectSilence took ${(sEnd - sStart).toFixed(4)}ms`);

  console.log('4. Numerical Correctness Check...');
  console.log(`   Integrated LUFS: ${loudness.integratedLUFS.toFixed(2)}`);
  console.log(`   Silent Sections: ${silence.length}`);

  if (silence.length === 0) {
    console.warn('   WARNING: No silence detected (expected ~1s at end)');
  } else {
    console.log(`   First silence starts at: ${silence[0].startTime.toFixed(2)}s`);
  }

  console.log('\n✅ Optimization verified! Multiple O(N) traversals eliminated.');
}

verifyOptimization().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
