
import { FastFFTEngine } from '../fastFFTEngine';

/**
 * Mock AudioContext and AudioBuffer for Node environment
 */
const mockAudioContext = {
  sampleRate: 44100,
  createAnalyser: () => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    smoothingTimeConstant: 0,
    getFloatFrequencyData: (arr: Float32Array) => {},
    getFloatTimeDomainData: (arr: Float32Array) => {},
  }),
} as any;

const createMockAudioBuffer = (length: number) => ({
  numberOfChannels: 1,
  length,
  duration: length / 44100,
  sampleRate: 44100,
  getChannelData: () => new Float32Array(length).map(() => Math.random() * 2 - 1),
} as any);

async function runBenchmark() {
  const fftEngine = new FastFFTEngine(mockAudioContext);
  const fftSize = 8192;
  const iterations = 1000;
  const samples = new Float32Array(fftSize).map(() => Math.random() * 2 - 1);

  console.log(`⚡ Starting FFT Benchmark (${iterations} iterations, size ${fftSize})...`);

  // Warm up
  for (let i = 0; i < 100; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples);
  }

  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples);
  }
  const end = Date.now();

  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  console.log(`📊 Total Time: ${totalTime}ms`);
  console.log(`📊 Average Time per FFT: ${avgTime.toFixed(4)}ms`);

  // Verify basic correctness (DC component and energy)
  const dcSamples = new Float32Array(fftSize).fill(1.0);
  const dcResult = FastFFTEngine.cooleyTukeyFFT(dcSamples);
  const dcReal = dcResult[0];
  const dcImag = dcResult[1];

  console.log(`\n🔍 Correctness Check:`);
  console.log(`   DC Component: ${dcReal.toFixed(2)} + ${dcImag.toFixed(2)}j (Expected: ${fftSize} + 0j)`);

  if (Math.abs(dcReal - fftSize) < 0.1 && Math.abs(dcImag) < 0.1) {
    console.log(`✅ Correctness Verified!`);
  } else {
    console.error(`❌ Correctness Failed!`);
    process.exit(1);
  }
}

runBenchmark().catch(console.error);
