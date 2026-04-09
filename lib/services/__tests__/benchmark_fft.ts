
import { FastFFTEngine } from '../fastFFTEngine';

// Mocking window and AudioContext for Node.js environment
class MockAudioContext {
  createAnalyser() {
    return {
      fftSize: 2048,
      smoothingTimeConstant: 0,
      frequencyBinCount: 1024,
      getFloatFrequencyData: () => {},
      getFloatTimeDomainData: () => {},
      connect: () => {},
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
    };
  }
}

(globalThis as any).window = {};
(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).OfflineAudioContext = class extends MockAudioContext {
  constructor(channels: number, length: number, sampleRate: number) {
    super();
  }
  destination = {};
  startRendering() {
    return Promise.resolve({
      numberOfChannels: 2,
      length: 100,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(100),
    });
  }
};

function benchmark() {
  const fftSize = 8192;
  const samples = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
  }

  console.log(`🚀 Benchmarking FFT (size: ${fftSize})...`);

  // Warm up
  for (let i = 0; i < 10; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples);
  }

  const iterations = 100;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples);
  }
  const end = performance.now();
  const avgTime = (end - start) / iterations;

  console.log(`⏱️ Average cooleyTukeyFFT time: ${avgTime.toFixed(4)}ms`);

  console.log(`🚀 Benchmarking Spectrogram...`);
  const longSamples = new Float32Array(44100 * 5); // 5 seconds
  for (let i = 0; i < longSamples.length; i++) {
    longSamples[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
  }

  const mockBuffer = {
    length: longSamples.length,
    duration: 5,
    sampleRate: 44100,
    numberOfChannels: 1,
    getChannelData: () => longSamples,
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;

  const engine = new FastFFTEngine(new MockAudioContext() as any);

  const startSpec = performance.now();
  // Note: Current implementation has a 200 frame limit
  engine.calculateSpectrogram(mockBuffer, 2048, 512);
  const endSpec = performance.now();

  console.log(`⏱️ calculateSpectrogram time (200 frames): ${(endSpec - startSpec).toFixed(4)}ms`);
}

benchmark();
