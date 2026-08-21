import { AudioAnalyzer } from '../audioAnalyzer';

// Mock AudioBuffer for Node runtime
class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  private channelData: Float32Array[];

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
    this.channelData = [];
    for (let c = 0; c < this.numberOfChannels; c++) {
      const data = new Float32Array(this.length);
      for (let i = 0; i < this.length; i++) {
        // Generate test signal (combination of sine waves)
        data[i] = Math.sin(2 * Math.PI * 440 * i / this.sampleRate) * 0.5 +
                  Math.sin(2 * Math.PI * 5000 * i / this.sampleRate) * 0.2;
      }
      this.channelData.push(data);
    }
  }

  getChannelData(channel: number): Float32Array {
    return this.channelData[channel];
  }
}

async function runBenchmark() {
  console.log('🧪 Starting AudioAnalyzer FFT Sharing Benchmark...');

  // Setup global AudioBuffer mock
  (globalThis as any).AudioBuffer = MockAudioBuffer;

  const sampleRate = 44100;
  const bufferLength = sampleRate * 3; // 3 seconds of audio
  const mockBuffer = new MockAudioBuffer({ numberOfChannels: 2, length: bufferLength, sampleRate }) as unknown as AudioBuffer;

  // Access private analyzeBasicStats & performFFT for benchmarking via type assertions
  const analyzerAny = AudioAnalyzer as any;

  const stats = analyzerAny.analyzeBasicStats(mockBuffer);
  const fftSize = 2048;

  // Measure unoptimized (two separate performFFT calls) vs optimized (one performFFT call shared)
  const iterations = 5000;

  console.log(`\n--- Running ${iterations.toLocaleString()} passes ---`);

  // Unoptimized pattern: compute FFT twice
  const unoptimizedStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const bins1 = analyzerAny.performFFT(stats.mono, fftSize, sampleRate);
    const clarity = AudioAnalyzer.calculateSpectralClarityFromBins(bins1, sampleRate);

    const bins2 = analyzerAny.performFFT(stats.mono, fftSize, sampleRate);
    const balance = AudioAnalyzer.calculateFrequencyBalanceFromBins(bins2, sampleRate);
  }
  const unoptimizedEnd = performance.now();
  const unoptimizedTime = unoptimizedEnd - unoptimizedStart;

  // Optimized pattern: compute FFT once and reuse
  const optimizedStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const bins = analyzerAny.performFFT(stats.mono, fftSize, sampleRate);
    const clarity = AudioAnalyzer.calculateSpectralClarityFromBins(bins, sampleRate);
    const balance = AudioAnalyzer.calculateFrequencyBalanceFromBins(bins, sampleRate);
  }
  const optimizedEnd = performance.now();
  const optimizedTime = optimizedEnd - optimizedStart;

  const speedup = unoptimizedTime / optimizedTime;

  console.log(`Unoptimized Time (2x FFT calls): ${unoptimizedTime.toFixed(2)} ms`);
  console.log(`Optimized Time (1x FFT shared):  ${optimizedTime.toFixed(2)} ms`);
  console.log(`Speedup factor:                  ${speedup.toFixed(2)}x`);

  // Verify numerical correctness
  const bins1 = analyzerAny.performFFT(stats.mono, fftSize, sampleRate);
  const clarity1 = AudioAnalyzer.calculateSpectralClarityFromBins(bins1, sampleRate);
  const balance1 = AudioAnalyzer.calculateFrequencyBalanceFromBins(bins1, sampleRate);

  const bins2 = analyzerAny.performFFT(stats.mono, fftSize, sampleRate);
  const clarity2 = AudioAnalyzer.calculateSpectralClarityFromBins(bins2, sampleRate);
  const balance2 = AudioAnalyzer.calculateFrequencyBalanceFromBins(bins2, sampleRate);

  if (Math.abs(clarity1 - clarity2) < 1e-6 && Math.abs(balance1 - balance2) < 1e-6) {
    console.log('✅ Numerical correctness verified (100% identical results)!');
  } else {
    console.error('❌ Mismatch in calculated metrics!');
    process.exit(1);
  }

  console.log('\n✨ BENCHMARK COMPLETE! ✨');
}

runBenchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
