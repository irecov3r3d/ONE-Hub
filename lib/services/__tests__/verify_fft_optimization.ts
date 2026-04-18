import { FastFFTEngine } from '../fastFFTEngine';

// Mocking window.AudioContext for Node environment
class MockAudioContext {
  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      length: length,
      sampleRate: sampleRate,
      getChannelData: (ch: number) => new Float32Array(length),
    };
  }
}

(globalThis as any).window = {
  AudioContext: MockAudioContext,
};

function testFFTZeroAllocation() {
  console.log('🧪 Starting FFT Zero-Allocation and API Stability Test...');

  const n = 1024;
  const samples = new Float32Array(n);
  const sampleRate = 44100;
  const freq = 440;

  for (let i = 0; i < n; i++) {
    samples[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
  }

  // 1. Verify Zero-Allocation Path
  console.log('\n⏱️ Verifying zero-allocation path (buffer reuse)...');
  const outputBuffer = new Float32Array(n * 2);
  const result = FastFFTEngine.cooleyTukeyFFT(samples, outputBuffer);

  if (result !== outputBuffer) {
    throw new Error('FFT did not reuse the provided output buffer');
  }
  console.log('✅ Buffer Reuse OK');

  // 2. Measure Performance with Reuse
  console.log('\n⏱️ Measuring performance with buffer reuse...');
  const iterations = 10000;
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples, outputBuffer);
  }
  const end = Date.now();
  console.log(`✅ Iterative FFT (reused): ${(end - start) / iterations}ms per operation`);

  // 3. Verify API Stability
  console.log('\n🔌 Verifying API stability...');
  const engine = new FastFFTEngine(new MockAudioContext() as any);
  if (typeof engine.getRealTimeFrequencyData !== 'function' || typeof engine.getRealTimeWaveformData !== 'function') {
    throw new Error('Real-time API methods are missing');
  }
  console.log('✅ API Stability OK');

  console.log('\n✨ ALL OPTIMIZATION AND STABILITY TESTS PASSED! ✨');
}

try {
  testFFTZeroAllocation();
} catch (err) {
  console.error('❌ Test Failed:', err);
  process.exit(1);
}
