
import { FastFFTEngine } from '../fastFFTEngine';

async function runVerification() {
  console.log('⚡ Starting Fused Windowing Verification...');

  const fftSize = 2048;
  const samples = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100); // 440Hz sine wave
  }

  // 1. Calculate using old approach (separate windowing)
  const windowedOld = FastFFTEngine.applyHannWindow(samples);
  const resultOld = FastFFTEngine.cooleyTukeyFFT(windowedOld);

  // 2. Calculate using new fused approach
  // We need to access the private method getHannWindow via casting if necessary,
  // but applyHannWindow uses it internally now.
  // Actually, let's just use cooleyTukeyFFT directly with the window.
  // We can get the window using applyHannWindow's logic.

  // To get the window without a separate allocation in the verification script,
  // we'll just mock the window retrieval.
  const window = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / fftSize));
  }

  const resultFused = FastFFTEngine.cooleyTukeyFFT(samples, undefined, window);

  // 3. Compare results
  let maxDiff = 0;
  for (let i = 0; i < resultOld.length; i++) {
    const diff = Math.abs(resultOld[i] - resultFused[i]);
    if (diff > maxDiff) maxDiff = diff;
  }

  console.log(`\nNumerical Verification:`);
  console.log(`- Max absolute difference: ${maxDiff.toExponential(4)}`);

  if (maxDiff < 1e-10) {
    console.log('✅ Fused Windowing is numerically identical to separate windowing!');
  } else {
    console.log('❌ Numerical mismatch detected!');
    process.exit(1);
  }

  // 4. Benchmark Memory Allocation (Conceptual)
  console.log('\nOptimization Insight:');
  console.log('- Previous approach: Allocated new Float32Array per frame for windowing.');
  console.log('- Fused approach: Zero extra allocations per frame for windowing.');
  console.log('- Impact: For a 4-minute track (approx. 20,000 frames), this saves ~160MB of memory churn.');
}

runVerification().catch(console.error);
