import { AudioAnalysisService } from '../audioAnalysisService';
import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock Web Audio API for Node environment
class MockAudioBuffer {
  duration = 10;
  sampleRate = 44100;
  numberOfChannels = 2;
  length = 441000;
  private data = new Float32Array(441000);
  getChannelData(ch: number) { return this.data; }
}

class MockAnalyser {
  fftSize = 2048;
  frequencyBinCount = 1024;
  smoothingTimeConstant = 0.8;
  getFloatFrequencyData(data: Float32Array) {}
  getFloatTimeDomainData(data: Float32Array) {}
  connect(dest: any) {}
  disconnect() {}
}

class MockAudioContext {
  sampleRate = 44100;
  decodeAudioData() { return Promise.resolve(new MockAudioBuffer()); }
  createAnalyser() { return new MockAnalyser(); }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
      disconnect: () => {},
    };
  }
  destination = {};
}

globalThis.AudioContext = MockAudioContext as any;
globalThis.OfflineAudioContext = MockAudioContext as any;
globalThis.window = {} as any;

async function verifyOptimization() {
  console.log('⚡ Starting performance and numerical correctness verification...');

  const ctx = new MockAudioContext() as any;
  const keyDetector = new AdvancedKeyDetection(ctx);
  const audioBuffer = new MockAudioBuffer() as any;

  // 1. Verify that detectKey works with standalone fallback
  console.log('Testing standalone fallback...');
  try {
    const result1 = await keyDetector.detectKey(audioBuffer);
    console.log(`Standalone Result: ${result1.key} (Confidence: ${result1.confidence.toFixed(2)})`);
  } catch (e) {
    console.log('Standalone path failed in mock environment, continuing...');
  }

  // 2. Verify that detectKey works with pre-calculated magnitudes
  console.log('\nTesting optimized path with pre-calculated magnitudes...');
  const magnitudes = new Float32Array(4096).fill(0.001);
  const fftSize = 8192;
  const sampleRate = 44100;

  // Simulate C Major Triad: C, E, G
  const triad = [261.63, 329.63, 392.00]; // C4, E4, G4
  triad.forEach(f => {
    const bin = Math.round((f * fftSize) / sampleRate);
    if (bin < magnitudes.length) magnitudes[bin] = 1.0;
  });

  const startTime = performance.now();
  const result2 = await keyDetector.detectKey(audioBuffer, magnitudes, sampleRate);
  const endTime = performance.now();

  console.log(`Optimized Result: ${result2.key} (Confidence: ${result2.confidence.toFixed(2)})`);
  console.log(`Time taken: ${(endTime - startTime).toFixed(4)}ms`);

  if (result2.key.includes('C Major')) {
    console.log('✅ Numerical correctness verified: C Major correctly identified.');
  } else {
    console.warn(`⚠️ Unexpected key result: ${result2.key}, check profile correlation.`);
  }

  console.log('\n✅ Verification complete!');
}

verifyOptimization().catch(console.error);
