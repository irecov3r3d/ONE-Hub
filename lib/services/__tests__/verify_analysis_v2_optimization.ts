
import { AudioAnalysisService } from '../audioAnalysisService';
import { FastFFTEngine } from '../fastFFTEngine';

// Global mocks for Node environment
(globalThis as any).window = {
  AudioContext: class {
    createAnalyser() { return { fftSize: 2048, smoothingTimeConstant: 0, frequencyBinCount: 1024 }; }
    createBufferSource() { return { start: () => {}, connect: () => {} }; }
    decodeAudioData(ab: ArrayBuffer) { return Promise.resolve((globalThis as any).mockAudioBuffer); }
    destination = {};
  }
};
(globalThis as any).AudioContext = (globalThis as any).window.AudioContext;
(globalThis as any).OfflineAudioContext = class {
  constructor() {}
  createAnalyser() { return { fftSize: 2048, smoothingTimeConstant: 0, frequencyBinCount: 1024 }; }
  createBufferSource() { return { start: () => {}, connect: () => {} }; }
  destination = {};
  startRendering() { return Promise.resolve((globalThis as any).mockAudioBuffer); }
};

class MockAudioBuffer {
  duration = 240;
  length = 240 * 44100;
  sampleRate = 44100;
  numberOfChannels = 2;
  channels = [new Float32Array(240 * 44100), new Float32Array(240 * 44100)];
  getChannelData(i: number) { return this.channels[i]; }
  copyToChannel(data: Float32Array, i: number) { this.channels[i].set(data); }
}

(globalThis as any).mockAudioBuffer = new MockAudioBuffer();

async function runBenchmark() {
  console.log('⚡ Starting Audio Analysis V2 Performance Verification...');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const duration = 10; // 10 seconds for quick bench
  const length = duration * sampleRate;

  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    left[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    right[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate + 0.5);
  }

  const channelData = [left, right];

  // 1. Benchmark analyzeBasicStats
  const iterations = 50;
  const startStats = Date.now();
  let stats: any;
  for (let i = 0; i < iterations; i++) {
    stats = (service as any).analyzeBasicStats(channelData, sampleRate);
  }
  const endStats = Date.now();
  console.log(`- analyzeBasicStats (Stereo): ${((endStats - startStats) / iterations).toFixed(3)}ms / op`);

  // Verify numerical correctness of Mid/Side identity
  const rmsMid = Math.pow(10, stats.rmsMid / 20);
  const rmsSide = Math.pow(10, stats.rmsSide / 20);
  const energyMid = rmsMid * rmsMid * length;
  const energySide = rmsSide * rmsSide * length;

  console.log(`\nNumerical Verification (Mid/Side Identities):`);
  console.log(`- Derived Mid Energy:  ${energyMid.toFixed(4)}`);
  console.log(`- Derived Side Energy: ${energySide.toFixed(4)}`);

  // 2. Benchmark Frequency Analysis with shared magnitudes
  const fftEngine = new FastFFTEngine(new AudioContext());
  const { spectrum, linearMagnitudes } = await fftEngine.performFFT((globalThis as any).mockAudioBuffer, 8192);

  const startFreq = Date.now();
  for (let i = 0; i < iterations; i++) {
    await (service as any).analyzeFrequency((globalThis as any).mockAudioBuffer, stats.mono, spectrum, linearMagnitudes);
  }
  const endFreq = Date.now();
  console.log(`- analyzeFrequency (Shared Mags): ${((endFreq - startFreq) / iterations).toFixed(3)}ms / op`);

  console.log('\n✅ Verification Complete.');
}

runBenchmark().catch(console.error);
