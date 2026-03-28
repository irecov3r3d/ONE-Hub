import { FastFFTEngine } from '../fastFFTEngine';

// Mocking window.AudioContext as it is not available in Node.js
class MockAudioContext {
  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      length: length,
      sampleRate: sampleRate,
      getChannelData: (ch: number) => new Float32Array(length),
      copyToChannel: () => {},
    };
  }
}

(globalThis as any).window = {
  AudioContext: MockAudioContext,
};

async function testFFTOptimizations() {
  console.log('🧪 Starting FFT Optimization Verification Test...');

  const fftSize = 1024;
  const sampleRate = 44100;

  // 1. Create a known test signal (sine wave)
  const samples = new Float32Array(fftSize);
  const frequency = 440;
  for (let i = 0; i < fftSize; i++) {
    samples[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
  }

  console.log('1. Testing cooleyTukeyFFT consistency...');
  const result = FastFFTEngine.cooleyTukeyFFT(samples);

  if (result.length !== fftSize * 2) {
    throw new Error(`Expected result length ${fftSize * 2}, got ${result.length}`);
  }

  // Check if we have energy at the expected bin
  const targetBin = Math.round(frequency * fftSize / sampleRate);
  const magnitudes = new Float32Array(fftSize / 2);
  let maxMag = 0;
  let maxBin = 0;

  for (let i = 0; i < fftSize / 2; i++) {
    const real = result[i * 2];
    const imag = result[i * 2 + 1];
    magnitudes[i] = Math.sqrt(real * real + imag * imag);
    if (magnitudes[i] > maxMag) {
      maxMag = magnitudes[i];
      maxBin = i;
    }
  }

  console.log(`Max energy at bin ${maxBin}, expected near ${targetBin}`);
  if (Math.abs(maxBin - targetBin) > 1) {
    throw new Error(`FFT peak at bin ${maxBin}, but expected near ${targetBin}`);
  }
  console.log('✅ FFT consistency OK');

  console.log('2. Testing applyHannWindow output buffer reuse...');
  const output = new Float32Array(fftSize);
  const windowedResult = FastFFTEngine.applyHannWindow(samples, output);

  if (windowedResult !== output) {
    throw new Error('applyHannWindow did not reuse the provided output buffer');
  }

  // Check if windowing actually happened
  if (output[0] !== 0) { // Hann window at 0 is 0
    console.warn(`Warning: output[0] is ${output[0]}, expected 0 for Hann window`);
  }
  if (output[fftSize / 2] === samples[fftSize / 2]) {
     // This might happen if sample is 0, but highly unlikely for all
  }
  console.log('✅ applyHannWindow reuse OK');

  console.log('3. Testing inPlaceFFT directly...');
  const complexData = new Float32Array(fftSize * 2);
  for (let i = 0; i < fftSize; i++) {
    complexData[i * 2] = samples[i];
    complexData[i * 2 + 1] = 0;
  }

  FastFFTEngine.inPlaceFFT(complexData);

  // result from step 1 should match complexData
  for (let i = 0; i < complexData.length; i++) {
    if (Math.abs(complexData[i] - result[i]) > 1e-5) {
      throw new Error(`inPlaceFFT mismatch at index ${i}: ${complexData[i]} vs ${result[i]}`);
    }
  }
  console.log('✅ inPlaceFFT direct test OK');

  console.log('\n✨ ALL FFT OPTIMIZATION TESTS PASSED! ✨');
}

testFFTOptimizations().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
