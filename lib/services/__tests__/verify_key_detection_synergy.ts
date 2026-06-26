import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { FastFFTEngine } from '../fastFFTEngine';

// Mock AudioBuffer for Node environment
class MockAudioBuffer {
  length: number;
  sampleRate: number;
  numberOfChannels: number;
  duration: number;
  private data: Float32Array[];

  constructor({ length, sampleRate, numberOfChannels }: { length: number, sampleRate: number, numberOfChannels: number }) {
    this.length = length;
    this.sampleRate = sampleRate;
    this.numberOfChannels = numberOfChannels;
    this.duration = length / sampleRate;
    this.data = Array(numberOfChannels).fill(0).map(() => new Float32Array(length));
  }

  getChannelData(channel: number) {
    return this.data[channel];
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel?: number) {
    const source = this.data[channelNumber].subarray(startInChannel || 0);
    destination.set(source.subarray(0, destination.length));
  }

  copyToChannel(source: Float32Array, channelNumber: number, startInChannel?: number) {
    this.data[channelNumber].set(source, startInChannel || 0);
  }
}

// Global mock
(global as any).AudioBuffer = MockAudioBuffer;

async function runBenchmark() {
  const sampleRate = 44100;
  const fftSize = 8192;
  const durationSamples = sampleRate * 2; // 2 seconds
  const audioBuffer = new MockAudioBuffer({
    length: durationSamples,
    sampleRate,
    numberOfChannels: 1
  }) as unknown as AudioBuffer;

  // Generate an A Major triad signal (A4=440Hz, C#5=554.37Hz, E5=659.25Hz)
  const data = audioBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    data[i] = 0.3 * (
      Math.sin(2 * Math.PI * 440 * t) +
      Math.sin(2 * Math.PI * 554.37 * t) +
      Math.sin(2 * Math.PI * 659.25 * t)
    );
  }

  const audioContext = {} as AudioContext; // Mocked
  const keyDetector = new AdvancedKeyDetection(audioContext);
  const fftEngine = new FastFFTEngine(audioContext);

  console.log('--- Key Detection Performance Benchmark ---');

  const iterations = 100;

  // 1. Standalone Key Detection (Performs its own FFT)
  // We'll run it a few times to warm up JIT
  for(let i=0; i<5; i++) await keyDetector.detectKey(audioBuffer);

  const startStandalone = performance.now();
  let resultStandalone;
  for (let i = 0; i < iterations; i++) {
    resultStandalone = await keyDetector.detectKey(audioBuffer);
  }
  const endStandalone = performance.now();
  const avgStandalone = (endStandalone - startStandalone) / iterations;

  if (resultStandalone) {
    console.log(`Standalone Key Detection: ${resultStandalone.key} (Confidence: ${resultStandalone.confidence.toFixed(2)})`);
    console.log(`Average Execution Time: ${avgStandalone.toFixed(4)}ms`);
  }

  // 2. Integrated Key Detection (Reuses pre-calculated magnitudes)
  const { linearMagnitudes } = await fftEngine.performFFT(audioBuffer, fftSize);

  // Warm up
  for(let i=0; i<5; i++) keyDetector.detectKeyFromMagnitudes(linearMagnitudes, sampleRate);

  const startIntegrated = performance.now();
  let resultIntegrated;
  for (let i = 0; i < iterations; i++) {
    resultIntegrated = keyDetector.detectKeyFromMagnitudes(linearMagnitudes, sampleRate);
  }
  const endIntegrated = performance.now();
  const avgIntegrated = (endIntegrated - startIntegrated) / iterations;

  if (resultIntegrated) {
    console.log(`Integrated Key Detection: ${resultIntegrated.key} (Confidence: ${resultIntegrated.confidence.toFixed(2)})`);
    console.log(`Average Execution Time: ${avgIntegrated.toFixed(4)}ms`);
  }

  const speedup = avgStandalone / avgIntegrated;
  console.log(`\n⚡ Speedup from Spectral Synergy: ${speedup.toFixed(2)}x`);

  if (resultStandalone && resultIntegrated && resultStandalone.key === resultIntegrated.key) {
    console.log('✅ Verification Successful: Both methods returned the same key.');
  } else if (resultStandalone && resultIntegrated) {
    console.log('❌ Verification Failed: Methods returned different keys.');
  }
}

runBenchmark().catch(console.error);
