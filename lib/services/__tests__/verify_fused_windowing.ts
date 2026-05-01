
import { FastFFTEngine } from '../fastFFTEngine';

async function runBenchmark() {
  console.log('⚡ Starting Fused FFT Windowing Performance Benchmark...');

  const fftSize = 4096;
  const samples = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100); // 440Hz sine wave
  }

  const window = FastFFTEngine.getHannWindow(fftSize);
  const outputBuffer = new Float32Array(fftSize * 2);

  // 1. Warm up
  FastFFTEngine.applyHannWindow(samples);
  FastFFTEngine.cooleyTukeyFFT(samples, outputBuffer);
  FastFFTEngine.cooleyTukeyFFT(samples, outputBuffer, window);

  const iterations = 5000;

  // 2. Benchmark Baseline (Separate windowing + FFT)
  const startBase = Date.now();
  for (let i = 0; i < iterations; i++) {
    const windowed = FastFFTEngine.applyHannWindow(samples);
    FastFFTEngine.cooleyTukeyFFT(windowed, outputBuffer);
  }
  const endBase = Date.now();
  const baseTime = (endBase - startBase) / iterations;

  // 3. Benchmark Fused (Windowing during bit-reversal)
  const startFused = Date.now();
  for (let i = 0; i < iterations; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples, outputBuffer, window);
  }
  const endFused = Date.now();
  const fusedTime = (endFused - startFused) / iterations;

  console.log(`\nResults (FFT Size: ${fftSize}, Iterations: ${iterations}):`);
  console.log(`- Baseline (Separate): ${baseTime.toFixed(4)}ms / op`);
  console.log(`- Bolt Fused:          ${fusedTime.toFixed(4)}ms / op`);
  console.log(`- Speedup:            ${(baseTime / fusedTime).toFixed(2)}x`);

  // 4. Verify Correctness
  const windowedSamples = FastFFTEngine.applyHannWindow(samples);
  const baseResult = new Float32Array(fftSize * 2);
  FastFFTEngine.cooleyTukeyFFT(windowedSamples, baseResult);

  const fusedResult = new Float32Array(fftSize * 2);
  FastFFTEngine.cooleyTukeyFFT(samples, fusedResult, window);

  let maxDiff = 0;
  for (let i = 0; i < baseResult.length; i++) {
    const diff = Math.abs(baseResult[i] - fusedResult[i]);
    if (diff > maxDiff) maxDiff = diff;
  }

  console.log(`\nNumerical Verification:`);
  console.log(`- Max absolute difference: ${maxDiff.toExponential(4)}`);

  if (maxDiff < 1e-10) {
    console.log('✅ Correctness verified!');
  } else {
    console.log('❌ Accuracy threshold exceeded!');
    process.exit(1);
  }
}

runBenchmark().catch(console.error);
