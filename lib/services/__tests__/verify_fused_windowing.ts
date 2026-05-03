
import { FastFFTEngine } from '../fastFFTEngine';

/**
 * Benchmark for Fused Windowing in FFT
 */
async function runBenchmark() {
  console.log('⚡ Starting Fused FFT Windowing Benchmark...');

  const fftSize = 2048;
  const samples = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100); // 440Hz sine wave
  }

  // 1. Warm up
  const window = FastFFTEngine.getHannWindow(fftSize);
  const out = new Float32Array(fftSize * 2);
  FastFFTEngine.applyHannWindow(samples);
  FastFFTEngine.cooleyTukeyFFT(samples, out);
  FastFFTEngine.cooleyTukeyFFT(samples, out, window);

  const iterations = 20000;

  // 2. Benchmark Separate Windowing + FFT
  const startSep = Date.now();
  for (let i = 0; i < iterations; i++) {
    const windowed = FastFFTEngine.applyHannWindow(samples);
    FastFFTEngine.cooleyTukeyFFT(windowed, out);
  }
  const endSep = Date.now();
  const sepTime = (endSep - startSep) / iterations;

  // 3. Benchmark Fused Windowing + FFT (Bolt Optimized)
  const startFused = Date.now();
  for (let i = 0; i < iterations; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples, out, window);
  }
  const endFused = Date.now();
  const fusedTime = (endFused - startFused) / iterations;

  console.log(`\nResults (FFT Size: ${fftSize}, Iterations: ${iterations}):`);
  console.log(`- Separate (Window + FFT): ${sepTime.toFixed(4)}ms / op`);
  console.log(`- Fused (Bolt Optimized):  ${fusedTime.toFixed(4)}ms / op`);
  console.log(`- Speedup:                ${(sepTime / fusedTime).toFixed(2)}x`);

  // 4. Verify Numerical Correctness
  const windowedRef = FastFFTEngine.applyHannWindow(samples);
  const refResult = FastFFTEngine.cooleyTukeyFFT(windowedRef);
  const fusedResult = FastFFTEngine.cooleyTukeyFFT(samples, undefined, window);

  let maxDiff = 0;
  for (let i = 0; i < refResult.length; i++) {
    maxDiff = Math.max(maxDiff, Math.abs(refResult[i] - fusedResult[i]));
  }

  console.log(`\nNumerical Verification:`);
  console.log(`- Max absolute difference: ${maxDiff.toExponential(4)}`);

  if (maxDiff < 1e-10) {
    console.log('✅ Correctness verified!');
  } else {
    console.log('❌ Numerical mismatch detected!');
    process.exit(1);
  }
}

runBenchmark().catch(console.error);
