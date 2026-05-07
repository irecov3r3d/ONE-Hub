import { AudioAnalysisService } from '../audioAnalysisService';

// Mock AudioContext for Node environment
class MockAudioContext {
  sampleRate = 44100;
  decodeAudioData() { return Promise.resolve({}); }
  createBuffer() { return {}; }
}

(globalThis as any).window = {
  AudioContext: MockAudioContext
};
(globalThis as any).AudioContext = MockAudioContext;

async function verifyOptimization() {
  console.log('--- ⚡ Bolt: Verifying AudioAnalysisService Block Optimization ---');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const duration = 10; // 10 seconds
  const length = sampleRate * duration;
  const channelData = [new Float32Array(length), new Float32Array(length)];

  // Create a signal with a "loud" part and a "silent" part
  for (let i = 0; i < length; i++) {
    if (i < length / 2) {
      channelData[0][i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5;
      channelData[1][i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5;
    } else {
      channelData[0][i] = 0; // Silent part
      channelData[1][i] = 0;
    }
  }

  console.log('1. Testing analyzeBasicStats with block calculation...');
  const start = performance.now();
  const stats = (service as any).analyzeBasicStats(channelData);
  const end = performance.now();
  console.log(`   Execution time: ${(end - start).toFixed(2)}ms`);

  if (stats.blockEnergy100ms && stats.blockEnergy100ms.length > 0) {
    console.log(`   ✅ Success: Calculated ${stats.blockEnergy100ms.length} blocks.`);

    // Verify first block has energy (it's in the loud part)
    if (stats.blockEnergy100ms[0] > 0) {
      console.log('   ✅ Success: First block has energy.');
    } else {
      console.error('   ❌ Error: First block should have energy.');
    }

    // Verify last block is silent
    if (stats.blockEnergy100ms[stats.blockEnergy100ms.length - 1] === 0) {
      console.log('   ✅ Success: Last block is silent.');
    } else {
      console.error('   ❌ Error: Last block should be silent.');
    }
  } else {
    console.error('   ❌ Error: Block statistics missing or empty.');
  }

  console.log('\n2. Testing calculateLoudnessOverTime (O(N/hop))...');
  const startL = performance.now();
  const loudness = (service as any).calculateLoudnessOverTime(stats, sampleRate);
  const endL = performance.now();
  console.log(`   Execution time: ${(endL - startL).toFixed(2)}ms`);
  console.log(`   ✅ Success: Calculated ${loudness.length} loudness points.`);

  console.log('\n3. Testing detectSilence (O(N/hop))...');
  const startS = performance.now();
  const silentSections = (service as any).detectSilence(stats, sampleRate);
  const endS = performance.now();
  console.log(`   Execution time: ${(endS - startS).toFixed(2)}ms`);

  if (silentSections.length > 0) {
    console.log(`   ✅ Success: Detected ${silentSections.length} silent sections.`);
    console.log(`   First silent section start: ${silentSections[0].startTime.toFixed(2)}s`);
  } else {
    console.error('   ❌ Error: Should have detected silent section.');
  }

  console.log('\n--- Verification Complete ---');
}

verifyOptimization().catch(console.error);
