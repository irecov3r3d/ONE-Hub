import AudioAnalysisService from '../audioAnalysisService';

// Global mocks for Node environment testing
if (typeof window === 'undefined') {
  (global as any).window = {
    AudioContext: class MockAudioContext {},
  };
}

function runBenchmark() {
  console.log('⚡ Starting Spectral Flux Optimization Verification...');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const duration = 240; // 4 minutes
  const totalSamples = sampleRate * duration;
  const samples = new Float32Array(totalSamples);

  // Fill with simulated audio content (sine waves + noise)
  for (let i = 0; i < totalSamples; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * (i / sampleRate)) * 0.5 + (Math.random() - 0.5) * 0.1;
  }

  const fftSize = 8192;

  // Baseline calculateSpectralFlux (full O(N) traversal)
  function calculateSpectralFluxBaseline(
    samples: Float32Array,
    fftSize: number,
    sampleRate: number
  ): number {
    const hopSize = fftSize / 2;
    let totalFlux = 0;
    let frameCount = 0;

    for (let i = 0; i < samples.length - fftSize - hopSize; i += hopSize) {
      let flux = 0;
      for (let j = 0; j < fftSize; j++) {
        const diff = samples[i + hopSize + j] - samples[i + j];
        flux += diff * diff;
      }
      totalFlux += Math.sqrt(flux / fftSize);
      frameCount++;
    }

    return frameCount > 0 ? totalFlux / frameCount : 0;
  }

  const startBaseline = performance.now();
  const baselineValue = calculateSpectralFluxBaseline(samples, fftSize, sampleRate);
  const endBaseline = performance.now();
  const baselineTime = endBaseline - startBaseline;

  const startOptimized = performance.now();
  const optimizedValue = (service as any).calculateSpectralFlux(samples, fftSize, sampleRate);
  const endOptimized = performance.now();
  const optimizedTime = endOptimized - startOptimized;

  const delta = Math.abs(baselineValue - optimizedValue);
  const speedup = baselineTime / optimizedTime;

  console.log(`Baseline Time:  ${baselineTime.toFixed(2)}ms (Value: ${baselineValue.toFixed(6)})`);
  console.log(`Optimized Time: ${optimizedTime.toFixed(2)}ms (Value: ${optimizedValue.toFixed(6)})`);
  console.log(`Delta:          ${delta.toFixed(6)}`);
  console.log(`Speedup:        ${speedup.toFixed(2)}x`);

  if (delta < 0.005) {
    console.log('✅ Numerical equivalence verified against AudioAnalysisService instance!');
  } else {
    console.error('❌ Numerical deviation too high!');
    process.exit(1);
  }
}

runBenchmark();
