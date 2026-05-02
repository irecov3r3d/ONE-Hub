
import { FastFFTEngine } from '../fastFFTEngine';

function benchmark() {
  const size = 2048;
  const iterations = 1000;
  const samples = new Float32Array(size);
  for (let i = 0; i < size; i++) samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100);

  const window = FastFFTEngine.getHannWindow(size);
  const output = new Float32Array(size * 2);

  console.log(`⚡ Bolt: Starting benchmark for Fused FFT Windowing (${iterations} iterations)...`);

  // Warmup
  for (let i = 0; i < 100; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples, output, window);
  }

  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples, output, window);
  }
  const end = Date.now();

  console.log(`⚡ Bolt: Fused Windowing took ${end - start}ms for ${iterations} iterations.`);
  console.log(`⚡ Bolt: Avg time per FFT: ${(end - start) / iterations}ms`);

  // Correctness check
  const windowedManual = new Float32Array(size);
  for (let i = 0; i < size; i++) windowedManual[i] = samples[i] * window[i];

  const expected = FastFFTEngine.cooleyTukeyFFT(windowedManual);
  const actual = FastFFTEngine.cooleyTukeyFFT(samples, undefined, window);

  let maxDiff = 0;
  for (let i = 0; i < expected.length; i++) {
    maxDiff = Math.max(maxDiff, Math.abs(expected[i] - actual[i]));
  }

  if (maxDiff < 1e-10) {
    console.log('✅ Correctness check PASSED (Max Diff: ' + maxDiff + ')');
  } else {
    console.log('❌ Correctness check FAILED (Max Diff: ' + maxDiff + ')');
    process.exit(1);
  }
}

benchmark();
