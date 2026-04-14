import { FastFFTEngine } from '../fastFFTEngine';

// Mocking window.AudioContext for Node environment
class MockAudioContext {
  createAnalyser() {
    return {
      fftSize: 2048,
      smoothingTimeConstant: 0,
      frequencyBinCount: 1024,
      connect: () => {},
      getFloatFrequencyData: () => {},
      getFloatTimeDomainData: () => {},
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
    };
  }
  destination = {};
}

(globalThis as any).window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
};

// Copy of original recursive FFT for baseline comparison (from current FastFFTEngine implementation)
function cooleyTukeyFFT_recursive(samples: Float32Array): Float32Array {
  const n = samples.length;
  if (n <= 1) {
    const result = new Float32Array(n * 2);
    result[0] = samples[0];
    result[1] = 0;
    return result;
  }
  const even = new Float32Array(n / 2);
  const odd = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    even[i] = samples[i * 2];
    odd[i] = samples[i * 2 + 1];
  }
  const fftEven = cooleyTukeyFFT_recursive(even);
  const fftOdd = cooleyTukeyFFT_recursive(odd);
  const result = new Float32Array(n * 2);
  for (let k = 0; k < n / 2; k++) {
    const angle = -2 * Math.PI * k / n;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tReal = cos * fftOdd[k * 2] - sin * fftOdd[k * 2 + 1];
    const tImag = sin * fftOdd[k * 2] + cos * fftOdd[k * 2 + 1];
    result[k * 2] = fftEven[k * 2] + tReal;
    result[k * 2 + 1] = fftEven[k * 2 + 1] + tImag;
    result[(k + n / 2) * 2] = fftEven[k * 2] - tReal;
    result[(k + n / 2) * 2 + 1] = fftEven[k * 2 + 1] - tImag;
  }
  return result;
}

async function verifyFFTOptimization() {
  console.log('🧪 Starting FFT Optimization Verification...');

  const fftSize = 2048; // Power of 2
  const samples = new Float32Array(fftSize);
  // Fill with a complex signal: 440Hz + 880Hz sine waves
  for (let i = 0; i < fftSize; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100) + 0.5 * Math.sin(2 * Math.PI * 880 * i / 44100);
  }

  console.log(`Analyzing FFT with size ${fftSize}...`);

  // Measure recursive performance
  console.log('Running Recursive FFT baseline...');
  const iterations = 50;
  const startRec = Date.now();
  let resultRec: any;
  for (let i = 0; i < iterations; i++) {
    resultRec = cooleyTukeyFFT_recursive(samples);
  }
  const endRec = Date.now();
  const timeRec = (endRec - startRec) / iterations;
  console.log(`Recursive FFT: ${timeRec.toFixed(4)}ms (average over ${iterations} runs)`);

  // Measure optimized performance (will be updated after refactor)
  console.log('Running Current FastFFTEngine implementation...');
  const startOpt = Date.now();
  let resultOpt: any;
  for (let i = 0; i < iterations; i++) {
    resultOpt = FastFFTEngine.cooleyTukeyFFT(samples);
  }
  const endOpt = Date.now();
  const timeOpt = (endOpt - startOpt) / iterations;
  console.log(`FastFFTEngine.cooleyTukeyFFT: ${timeOpt.toFixed(4)}ms (average over ${iterations} runs)`);

  // Verify accuracy
  let maxDiff = 0;
  for (let i = 0; i < resultRec.length; i++) {
    const diff = Math.abs(resultRec[i] - resultOpt[i]);
    if (diff > maxDiff) maxDiff = diff;
  }

  console.log(`Max difference between recursive and optimized: ${maxDiff.toExponential(4)}`);

  if (maxDiff > 1e-6) {
    console.error('❌ Accuracy check FAILED!');
    process.exit(1);
  } else {
    console.log('✅ Accuracy check PASSED!');
  }

  const speedup = timeRec / (timeOpt || 1);
  console.log(`🚀 Measured Speedup vs Recursive Baseline: ${speedup.toFixed(2)}x`);

  console.log('\n✨ FFT VERIFICATION COMPLETE ✨');
}

verifyFFTOptimization().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
