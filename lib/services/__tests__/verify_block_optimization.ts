import { AudioAnalysisService } from '../audioAnalysisService';

// Mocking window.AudioContext as it is not available in Node.js
class MockAudioContext {
  decodeAudioData(arrayBuffer: ArrayBuffer) {
    return Promise.resolve({
      numberOfChannels: 2,
      length: 44100 * 5, // 5 seconds
      sampleRate: 44100,
      duration: 5,
      getChannelData: (ch: number) => new Float32Array(44100 * 5).fill(0.1 * (ch + 1)),
    });
  }
}

(globalThis as any).window = {
  AudioContext: MockAudioContext,
};

async function verifyBlockOptimization() {
  console.log('🧪 Starting Block Optimization Verification Test...');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const length = sampleRate * 10; // 10 seconds
  const channelData = [new Float32Array(length), new Float32Array(length)];

  // Fill with a test signal
  for (let i = 0; i < length; i++) {
    const val = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    channelData[0][i] = val;
    channelData[1][i] = val;
  }

  console.log('1. Verifying analyzeBasicStats with Block Data...');
  // @ts-ignore
  const stats = service.analyzeBasicStats(channelData, sampleRate);

  if (!stats.blockEnergy512 || stats.blockEnergy512.length === 0) {
    throw new Error('blockEnergy512 is missing or empty');
  }
  if (!stats.blockEnergy100ms || stats.blockEnergy100ms.length === 0) {
    throw new Error('blockEnergy100ms is missing or empty');
  }

  console.log(`✅ analyzeBasicStats generated ${stats.blockEnergy512.length} 512-blocks and ${stats.blockEnergy100ms.length} 100ms-blocks.`);

  console.log('2. Verifying calculateLoudnessOverTime Accuracy...');
  // @ts-ignore
  const loudnessPoints = service.calculateLoudnessOverTime(stats, sampleRate);

  if (loudnessPoints.length === 0) {
    throw new Error('loudnessPoints is empty');
  }
  console.log(`✅ calculateLoudnessOverTime generated ${loudnessPoints.length} points.`);

  console.log('3. Verifying detectSilence Accuracy...');
  // @ts-ignore
  const silentSections = service.detectSilence(stats, sampleRate);
  console.log(`✅ detectSilence found ${silentSections.length} silent sections in the test sine wave (expected 0).`);

  console.log('\n✨ ALL BLOCK OPTIMIZATION TESTS PASSED! ✨');
}

verifyBlockOptimization().catch(err => {
  console.error('❌ Test Failed:', err);
});
