
import { FastFFTEngine } from '../fastFFTEngine';

// Mock Web Audio API
(global as any).window = {
  AudioContext: class {
    sampleRate = 44100;
    decodeAudioData() {}
    createAnalyser() { return { fftSize: 2048, frequencyBinCount: 1024 }; }
    createBufferSource() { return { buffer: null, connect: () => {}, start: () => {} }; }
    destination = {};
  }
};
(global as any).OfflineAudioContext = class {
  constructor() {}
  createAnalyser() { return { fftSize: 2048, frequencyBinCount: 1024, smoothingTimeConstant: 0 }; }
  createBufferSource() { return { buffer: null, connect: () => {}, start: () => {} }; }
  destination = {};
};

async function verifyFusedFFT() {
  const fftSize = 1024;
  const samples = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
  }

  // 1. Old way: Manual windowing then FFT
  const windowedOld = FastFFTEngine.applyHannWindow(samples);
  const resultOld = FastFFTEngine.cooleyTukeyFFT(windowedOld);

  // 2. New way: Fused windowing in FFT
  const window = FastFFTEngine.getHannWindow(fftSize);
  const resultNew = FastFFTEngine.cooleyTukeyFFT(samples, undefined, window);

  // Verify identity
  let maxDiff = 0;
  for (let i = 0; i < resultOld.length; i++) {
    const diff = Math.abs(resultOld[i] - resultNew[i]);
    if (diff > maxDiff) maxDiff = diff;
  }

  console.log(`Max difference between manual and fused windowing: ${maxDiff}`);

  if (maxDiff < 1e-10) {
    console.log('✅ VERIFIED: Fused windowing is mathematically identical to manual windowing.');
  } else {
    console.error('❌ FAILURE: Fused windowing results differ from manual windowing.');
    process.exit(1);
  }

  // Benchmark
  const iterations = 1000;

  console.time('Manual Windowing + FFT');
  for (let i = 0; i < iterations; i++) {
    const w = FastFFTEngine.applyHannWindow(samples);
    FastFFTEngine.cooleyTukeyFFT(w);
  }
  console.timeEnd('Manual Windowing + FFT');

  console.time('Fused Windowing FFT');
  for (let i = 0; i < iterations; i++) {
    FastFFTEngine.cooleyTukeyFFT(samples, undefined, window);
  }
  console.timeEnd('Fused Windowing FFT');
}

verifyFusedFFT();
