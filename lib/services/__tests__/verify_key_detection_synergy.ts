import { AudioAnalysisService } from '../audioAnalysisService';
import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock AudioBuffer and AudioContext for Node environment
class MockAudioBuffer {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  private data: Float32Array[];

  constructor({ duration, sampleRate, numberOfChannels }: any) {
    this.duration = duration;
    this.sampleRate = sampleRate;
    this.numberOfChannels = numberOfChannels;
    this.length = Math.floor(duration * sampleRate);
    this.data = Array(numberOfChannels).fill(0).map(() => new Float32Array(this.length));
  }

  getChannelData(channel: number) {
    return this.data[channel];
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel: number = 0) {
    destination.set(this.data[channelNumber].subarray(startInChannel, startInChannel + destination.length));
  }

  copyToChannel(source: Float32Array, channelNumber: number, startInChannel: number = 0) {
    this.data[channelNumber].set(source, startInChannel);
  }
}

(global as any).AudioBuffer = MockAudioBuffer;
(global as any).AudioContext = class {
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ duration: length / sampleRate, sampleRate, numberOfChannels: channels });
  }
  decodeAudioData() {}
};
(global as any).window = global;

async function runBenchmark() {
  console.log('⚡ Starting Integrated Key Detection Synergy Benchmark...');

  const sampleRate = 44100;
  const duration = 120; // 120 seconds
  const audioBuffer = new MockAudioBuffer({
    duration,
    sampleRate,
    numberOfChannels: 2
  }) as any as AudioBuffer;

  // Fill with a synthetic A Major signal (A4 = 440Hz, C#5 = 554.37Hz, E5 = 659.25Hz)
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);
  for (let i = 0; i < left.length; i++) {
    const t = i / sampleRate;
    const sample = (
      Math.sin(2 * Math.PI * 440 * t) +
      Math.sin(2 * Math.PI * 554.37 * t) +
      Math.sin(2 * Math.PI * 659.25 * t)
    ) / 3;
    left[i] = sample;
    right[i] = sample;
  }

  const analysisService = new AudioAnalysisService();
  const keyDetector = new AdvancedKeyDetection((global as any).AudioContext);

  // 1. Measure Integrated Analysis Speed (including Key Detection)
  console.log('\n--- 1. Integrated Analysis Pipeline ---');
  // We manually call the internal methods to simulate the pipeline since we can't easily mock the full File/decodeAudioData flow
  const stats = (analysisService as any).analyzeBasicStats([left, right], sampleRate);

  const startFFT = performance.now();
  const { linearMagnitudes } = await (analysisService as any).fftEngine.performFFT(audioBuffer, 8192);
  const endFFT = performance.now();
  console.log(`8192-point FFT: ${(endFFT - startFFT).toFixed(2)}ms`);

  const startKey = performance.now();
  const musical = await (analysisService as any).analyzeMusicalFeatures(audioBuffer, stats, linearMagnitudes);
  const endKey = performance.now();
  console.log(`Integrated Key Detection (Reusing Magnitudes): ${(endKey - startKey).toFixed(2)}ms`);
  console.log(`Detected Key: ${musical.key} (Confidence: ${musical.keyConfidence.toFixed(2)})`);

  // 2. Measure Standalone Key Detection Speed (for comparison)
  console.log('\n--- 2. Standalone Key Detection (No Reuse) ---');
  const startStandalone = performance.now();
  const standaloneResult = await keyDetector.detectKey(audioBuffer);
  const endStandalone = performance.now();
  console.log(`Standalone Key Detection: ${(endStandalone - startStandalone).toFixed(2)}ms`);
  console.log(`Speedup: ${( (endStandalone - startStandalone) / (endKey - startKey) ).toFixed(1)}x`);

  // 3. Measure Zero-Copy Chord Progression Speed
  console.log('\n--- 3. Zero-Copy Chord Progression ---');
  const startChords = performance.now();
  const chords = await keyDetector.detectChordProgression(audioBuffer, 2);
  const endChords = performance.now();
  console.log(`Chord Progression (120s track, 2s segments): ${(endChords - startChords).toFixed(2)}ms`);
  console.log(`Average per segment: ${( (endChords - startChords) / 60 ).toFixed(2)}ms`);

  if (musical.key === 'A Major') {
    console.log('\n✅ Accuracy Verified: Correctly identified A Major');
  } else {
    console.log(`\n❌ Accuracy Issue: Expected A Major, got ${musical.key}`);
  }

  console.log('\n⚡ Benchmark Complete.');
}

runBenchmark().catch(console.error);
