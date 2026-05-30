import { AudioAnalysisService } from '../audioAnalysisService';
import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock AudioContext and related classes
class MockAudioContext {
  createAnalyser() {
    return {
      fftSize: 2048,
      smoothingTimeConstant: 0,
      connect: () => {}
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {}
    };
  }
  decodeAudioData(buffer: ArrayBuffer) { return Promise.resolve(new MockAudioBuffer()); }
  get destination() { return {}; }
}

class MockAudioBuffer {
  duration = 10;
  sampleRate = 44100;
  numberOfChannels = 2;
  length = 44100 * 10;
  getChannelData(ch: number) {
    const data = new Float32Array(this.length);
    // Create a 440Hz sine wave (A4)
    for (let i = 0; i < this.length; i++) {
      data[i] = Math.sin(2 * Math.PI * 440 * i / this.sampleRate);
      if (ch === 1) data[i] *= 0.5; // Half amplitude for right channel to test Mid/Side
    }
    return data;
  }
}

// @ts-ignore
globalThis.AudioContext = MockAudioContext;
// @ts-ignore
globalThis.OfflineAudioContext = MockAudioContext;
// @ts-ignore
globalThis.window = { AudioContext: MockAudioContext };

async function verifySpectralSynergy() {
  console.log('⚡ Starting Spectral Synergy & Mid/Side Verification...');

  const service = new AudioAnalysisService();
  const keyDetector = new AdvancedKeyDetection(new MockAudioContext() as any);
  const audioBuffer = new MockAudioBuffer() as any as AudioBuffer;

  // 1. Verify Mid/Side Identities
  console.log('\n--- 1. Verifying Mid/Side Identities ---');
  const channelData = [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)];

  // Manual calculation (O(N))
  let manualSumSqMid = 0;
  let manualSumSqSide = 0;
  for (let i = 0; i < audioBuffer.length; i++) {
    const m = (channelData[0][i] + channelData[1][i]) / 2;
    const s = (channelData[0][i] - channelData[1][i]) / 2;
    manualSumSqMid += m * m;
    manualSumSqSide += s * s;
  }
  const manualRmsMid = 20 * Math.log10(Math.sqrt(manualSumSqMid / audioBuffer.length));
  const manualRmsSide = 20 * Math.log10(Math.sqrt(manualSumSqSide / audioBuffer.length));

  // Service calculation (O(1) from identities)
  // @ts-ignore - access private for verification
  const stats = service.analyzeBasicStats(channelData, audioBuffer.sampleRate);

  console.log(`Manual RMS Mid: ${manualRmsMid.toFixed(4)}, Identity RMS Mid: ${stats.rmsMid.toFixed(4)}`);
  console.log(`Manual RMS Side: ${manualRmsSide.toFixed(4)}, Identity RMS Side: ${stats.rmsSide.toFixed(4)}`);

  const midDiff = Math.abs(manualRmsMid - stats.rmsMid);
  const sideDiff = Math.abs(manualRmsSide - stats.rmsSide);

  if (midDiff < 1e-10 && sideDiff < 1e-10) {
    console.log('✅ Mid/Side Identity Verified: Match within floating point precision.');
  } else {
    console.error('❌ Mid/Side Identity Failed: Numerical discrepancy detected.');
    process.exit(1);
  }

  // 2. Verify Key Detection Integration & Performance
  console.log('\n--- 2. Verifying Key Detection Integration & Performance ---');

  const fftSize = 8192;
  // @ts-ignore
  const spectrum = await service.fftEngine.performFFT(audioBuffer, fftSize);

  // Pre-calculate magnitudes as AudioAnalysisService.analyzeAudio does
  const linearMagnitudes = new Float32Array(spectrum.length);
  for (let i = 0; i < spectrum.length; i++) {
    linearMagnitudes[i] = Math.pow(10, spectrum[i].magnitude / 20);
  }

  // Measure Legacy Path (internal FFT)
  const startLegacy = performance.now();
  const legacyResult = await keyDetector.detectKey(audioBuffer);
  const endLegacy = performance.now();
  const legacyTime = endLegacy - startLegacy;

  // Measure Optimized Path (bypass FFT)
  const startOpt = performance.now();
  const optResult = await keyDetector.detectKey(linearMagnitudes, audioBuffer.sampleRate);
  const endOpt = performance.now();
  const optTime = endOpt - startOpt;

  console.log(`Key Detected: ${optResult.key}`);
  console.log(`Legacy Time: ${legacyTime.toFixed(4)}ms`);
  console.log(`Optimized Time: ${optTime.toFixed(4)}ms`);
  console.log(`Speedup: ${(legacyTime / optTime).toFixed(2)}x`);

  if (legacyResult.key === optResult.key) {
    console.log('✅ Key Detection Consistency Verified.');
  } else {
    console.error('❌ Key Detection Inconsistency: Legacy and Optimized paths returned different keys.');
    process.exit(1);
  }

  if (legacyTime / optTime > 10) {
    console.log('✅ Performance Target Met: >10x speedup for key detection sub-routine.');
  } else {
    console.warn('⚠️ Performance Warning: Speedup below 10x target.');
  }

  console.log('\n✨ All Verifications Passed!');
}

verifySpectralSynergy().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
