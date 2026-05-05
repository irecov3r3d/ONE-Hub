import { AudioAnalysisService } from '../audioAnalysisService';

// Mock AudioContext for Node environment
class MockAudioContext {
  sampleRate = 44100;
  decodeAudioData() { return Promise.resolve(new MockAudioBuffer()); }
  createBuffer() { return new MockAudioBuffer(); }
}

class MockAudioBuffer {
  sampleRate = 44100;
  duration = 10;
  length = 441000;
  numberOfChannels = 1;
  getChannelData() { return new Float32Array(441000).fill(0.1); }
}

(globalThis as any).window = { AudioContext: MockAudioContext };
(globalThis as any).AudioContext = MockAudioContext;

async function verifyBlockOptimization() {
  console.log('⚡ Starting AudioAnalysisService Block Optimization Verification...');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const duration = 5; // 5 seconds
  const length = sampleRate * duration;
  const mono = new Float32Array(length);

  // Create a signal with known properties
  // 1s of 0.5 amplitude, 1s of silence, 3s of 0.2 amplitude
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate;
    if (time < 1) mono[i] = 0.5;
    else if (time < 2) mono[i] = 0.0;
    else mono[i] = 0.2;
  }

  // 1. Verify analyzeBasicStats calculates blocks correctly
  console.log('Step 1: Verifying analyzeBasicStats...');
  const stats = (service as any).analyzeBasicStats([mono], sampleRate);

  const hop100ms = Math.floor(sampleRate * 0.1);
  const expectedBlocks100ms = Math.floor(length / hop100ms);

  if (stats.blockEnergy100ms.length !== expectedBlocks100ms) {
    throw new Error(`Expected ${expectedBlocks100ms} 100ms blocks, got ${stats.blockEnergy100ms.length}`);
  }

  // First 10 blocks (1s) should have energy (0.5^2 * hop100ms)
  const expectedEnergy1s = 0.5 * 0.5 * hop100ms;
  for (let i = 0; i < 10; i++) {
    const diff = Math.abs(stats.blockEnergy100ms[i] - expectedEnergy1s);
    if (diff > 1e-5) {
      throw new Error(`Block ${i} energy mismatch: expected ${expectedEnergy1s}, got ${stats.blockEnergy100ms[i]}`);
    }
  }

  // 2. Verify detectSilence using blocks
  console.log('Step 2: Verifying detectSilence...');
  const silentSections = (service as any).detectSilence(stats, sampleRate);

  // Should detect ~1s of silence starting at 1.0s
  const silence = silentSections.find((s: any) => Math.abs(s.startTime - 1.0) < 0.1);
  if (!silence) {
    throw new Error('Failed to detect silence at 1.0s');
  }
  console.log(`Detected silence: ${silence.startTime.toFixed(2)}s - ${silence.endTime.toFixed(2)}s`);

  // 3. Verify calculateLoudnessOverTime
  console.log('Step 3: Verifying calculateLoudnessOverTime...');
  const loudnessPoints = (service as any).calculateLoudnessOverTime(stats, sampleRate);

  if (loudnessPoints.length === 0) {
    throw new Error('No loudness points calculated');
  }

  // Check first point (should be around -0.691 + 20*log10(0.5) = -6.7 LUFS)
  const firstPoint = loudnessPoints[0];
  const expectedLUFS = -0.691 + 20 * Math.log10(0.5);
  if (Math.abs(firstPoint.lufs - expectedLUFS) > 0.1) {
    throw new Error(`Loudness mismatch: expected ~${expectedLUFS.toFixed(2)}, got ${firstPoint.lufs.toFixed(2)}`);
  }

  // 4. Verify detectSections
  console.log('Step 4: Verifying detectSections...');
  const sections = (service as any).detectSections({ duration: 5, sampleRate }, stats);
  if (sections.length === 0) {
    throw new Error('No sections detected');
  }

  console.log('✅ Block optimization logic verified successfully!');
}

verifyBlockOptimization().catch(err => {
  console.error('❌ Verification failed:', err);
  (globalThis as any).process.exit(1);
});
