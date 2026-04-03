import { FastFFTEngine } from '../fastFFTEngine';

// Mocking window.AudioContext as it is not available in Node.js
class MockAudioContext {
  sampleRate = 44100;
}

(globalThis as any).window = {
  AudioContext: MockAudioContext,
};

function benchmarkFFT(size: number, iterations: number = 100) {
  const samples = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
  }

  console.log(`\n📏 Benchmarking FFT size: ${size} (${iterations} iterations)`);

  // Warm up
  for (let i = 0; i < 5; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples);
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples);
  }
  const end = performance.now();

  const avgTime = (end - start) / iterations;
  console.log(`⏱️ Average execution time: ${avgTime.toFixed(4)} ms`);
  return avgTime;
}

async function runBenchmarks() {
  console.log('🚀 Starting FFT Performance Benchmarks...');

  benchmarkFFT(1024);
  benchmarkFFT(2048);
  benchmarkFFT(4096);
  benchmarkFFT(8192);

  console.log('\n✅ Benchmarks complete.');
}

runBenchmarks().catch(console.error);
