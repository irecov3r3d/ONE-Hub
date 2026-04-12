import { FastFFTEngine } from '../fastFFTEngine';

// Mocking AudioContext for Node.js
class MockAudioContext {
  sampleRate = 44100;
}

const mockCtx = new MockAudioContext() as any;
const engine = new FastFFTEngine(mockCtx);

function generateSineWave(freq: number, length: number, sampleRate: number): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
  }
  return buffer;
}

async function runBenchmark() {
  console.log('⚡ Starting FFT Performance Benchmark...');

  const fftSize = 8192;
  const sampleRate = 44100;
  const iterations = 1000;
  const samples = generateSineWave(440, fftSize, sampleRate);

  // 1. Verify Correctness (Mathematical Accuracy)
  console.log('\n📊 Verifying Mathematical Accuracy...');
  const result = FastFFTEngine.cooleyTukeyFFT(samples);

  // In an FFT of a pure sine wave at 440Hz, the magnitude should peak at the corresponding bin
  const targetBin = Math.round(440 * fftSize / sampleRate);
  let maxMag = 0;
  let maxBin = 0;

  for (let i = 0; i < fftSize / 2; i++) {
    const real = result[i * 2];
    const imag = result[i * 2 + 1];
    const mag = Math.sqrt(real * real + imag * imag) / fftSize;
    if (mag > maxMag) {
      maxMag = mag;
      maxBin = i;
    }
  }

  console.log(`Peak found at bin ${maxBin} (${(maxBin * sampleRate / fftSize).toFixed(1)} Hz)`);
  console.log(`Expected peak near bin ${targetBin} (${(targetBin * sampleRate / fftSize).toFixed(1)} Hz)`);

  if (Math.abs(maxBin - targetBin) > 1) {
    throw new Error(`Accuracy check failed: Peak frequency ${maxBin * sampleRate / fftSize}Hz is too far from 440Hz`);
  }
  console.log('✅ Accuracy Check Passed');

  // 2. Benchmark Performance
  console.log(`\n⏱️ Benchmarking ${iterations} iterations of ${fftSize}-point FFT...`);
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples);
  }
  const end = Date.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  console.log(`Total time: ${totalTime}ms`);
  console.log(`Average time per FFT: ${avgTime.toFixed(4)}ms`);
  console.log(`Throughput: ${(iterations / (totalTime / 1000)).toFixed(1)} FFTs/sec`);

  // 3. Compare with legacy (recursive) behavior simulation (mental model)
  // The previous recursive implementation created N log N arrays.
  // For N=8192, log2(N)=13. That's approx 8192 * 13 = 106k elements per FFT in intermediate arrays.
  // Our iterative version uses 0 intermediate arrays (just the result array).
  console.log('\n🧠 Memory Insight: Iterative version reduces intermediate allocations from O(N log N) to O(1).');

  console.log('\n✨ Benchmark Complete!');
}

runBenchmark().catch(err => {
  console.error('❌ Benchmark Failed:', err);
  process.exit(1);
});
