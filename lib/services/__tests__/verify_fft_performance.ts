/**
 * Verification and Benchmark script for FastFFTEngine.
 * Tests numerical correctness and measures performance gains.
 */

import { FastFFTEngine } from '../fastFFTEngine';

/**
 * Original recursive implementation for comparison and verification.
 */
function recursiveFFT(samples: Float32Array): Float32Array {
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

  const fftEven = recursiveFFT(even);
  const fftOdd = recursiveFFT(odd);

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

async function runTests() {
  const fftSize = 8192;
  const samples = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    // Generate a test signal: a combination of a 440Hz sine wave and white noise
    samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100) + (Math.random() * 0.1 - 0.05);
  }

  console.log(`--- FFT VERIFICATION (Size: ${fftSize}) ---`);

  // 1. Numerical Correctness
  console.log('Verifying numerical accuracy...');
  const expectedResult = recursiveFFT(samples);

  const actualResult = new Float32Array(fftSize * 2);
  for(let i=0; i<fftSize; i++) {
    actualResult[i*2] = samples[i];
    actualResult[i*2+1] = 0;
  }
  FastFFTEngine.inplaceFFT(actualResult);

  let maxDiff = 0;
  for (let i = 0; i < fftSize * 2; i++) {
    const diff = Math.abs(expectedResult[i] - actualResult[i]);
    if (diff > maxDiff) maxDiff = diff;
  }

  if (maxDiff < 1e-10) {
    console.log('✅ Correctness verified (Max difference: ' + maxDiff.toExponential() + ')');
  } else {
    console.error('❌ Correctness failed! (Max difference: ' + maxDiff.toExponential() + ')');
    process.exit(1);
  }

  // 2. Performance Benchmark
  console.log('\n--- PERFORMANCE BENCHMARK ---');
  const iterations = 100;

  console.log(`Running ${iterations} iterations...`);

  // Warmup
  for (let i = 0; i < 10; i++) {
    recursiveFFT(samples);
    const warmupBuffer = new Float32Array(fftSize * 2);
    FastFFTEngine.inplaceFFT(warmupBuffer);
  }

  // Benchmark Recursive
  const startRec = Date.now();
  for (let i = 0; i < iterations; i++) {
    recursiveFFT(samples);
  }
  const endRec = Date.now();
  const timeRec = endRec - startRec;
  console.log(`Recursive FFT: ${timeRec.toFixed(2)}ms (${(timeRec / iterations).toFixed(3)}ms per call)`);

  // Benchmark In-place Iterative
  const startInplace = Date.now();
  const benchBuffer = new Float32Array(fftSize * 2);
  for (let i = 0; i < iterations; i++) {
    // We copy samples to the benchmark buffer to simulate a real use case
    for(let j=0; j<fftSize; j++) {
      benchBuffer[j*2] = samples[j];
      benchBuffer[j*2+1] = 0;
    }
    FastFFTEngine.inplaceFFT(benchBuffer);
  }
  const endInplace = Date.now();
  const timeInplace = endInplace - startInplace;
  console.log(`Iterative In-place FFT: ${timeInplace.toFixed(2)}ms (${(timeInplace / iterations).toFixed(3)}ms per call)`);

  const speedup = timeRec / timeInplace;
  console.log(`🚀 Performance Increase: ${speedup.toFixed(2)}x`);

  // 3. Batch Spectrogram Simulation (Memory Pressure Test)
  console.log('\n--- BATCH PROCESSING SIMULATION ---');
  const numFrames = 500;
  const spectrogramHopSize = 512;
  const fullSignal = new Float32Array(numFrames * spectrogramHopSize + fftSize);

  const mockAudioBuffer = {
    length: fullSignal.length,
    duration: fullSignal.length / 44100,
    sampleRate: 44100,
    numberOfChannels: 1,
    getChannelData: () => fullSignal
  } as any;

  const engine = new FastFFTEngine({} as any); // Mock context

  const startBatch = Date.now();
  await engine.calculateSpectrogram(mockAudioBuffer, fftSize, spectrogramHopSize);
  const endBatch = Date.now();
  console.log(`Spectrogram (500 frames) completed in: ${(endBatch - startBatch).toFixed(2)}ms`);
}

runTests().catch(console.error);
