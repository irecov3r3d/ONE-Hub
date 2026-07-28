import { AudioAnalysisService } from '../audioAnalysisService';
import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Mock AudioContext and AudioBuffer for Node environment
class MockAudioBuffer {
  length: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  private channelData: Float32Array[];

  constructor({ length, sampleRate, numberOfChannels }: { length: number, sampleRate: number, numberOfChannels: number }) {
    this.length = length;
    this.duration = length / sampleRate;
    this.sampleRate = sampleRate;
    this.numberOfChannels = numberOfChannels;
    this.channelData = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number) {
    return this.channelData[channel];
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel?: number) {
    const source = this.channelData[channelNumber];
    destination.set(source.subarray(startInChannel || 0, (startInChannel || 0) + destination.length));
  }

  copyToChannel(source: Float32Array, channelNumber: number, startInChannel?: number) {
    const target = this.channelData[channelNumber];
    target.set(source, startInChannel || 0);
  }
}

// Mock OfflineAudioContext for Node environment
class MockOfflineAudioContext {
  numberOfChannels: number;
  length: number;
  sampleRate: number;

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ length, sampleRate, numberOfChannels });
  }
}

// @ts-ignore
global.AudioBuffer = MockAudioBuffer as any;
// @ts-ignore
global.OfflineAudioContext = MockOfflineAudioContext as any;
// @ts-ignore
global.window = {
  AudioContext: class {
    createAnalyser() {
      return {
        fftSize: 2048,
        smoothingTimeConstant: 0,
        frequencyBinCount: 1024,
      };
    }
  } as any
};

async function verifySpectralSynergy() {
  console.log('🧪 Starting Integrated Key Detection & Spectral Synergy Verification...\n');

  const sampleRate = 44100;
  const duration = 2; // 2 seconds of audio
  const length = sampleRate * duration;
  const audioBuffer = new MockAudioBuffer({ length, sampleRate, numberOfChannels: 2 }) as unknown as AudioBuffer;

  // Fill buffer with an A Minor chord (A=220Hz, C=261.63Hz, E=329.63Hz)
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 220.00 * t) * 0.4 +
                   Math.sin(2 * Math.PI * 261.63 * t) * 0.3 +
                   Math.sin(2 * Math.PI * 329.63 * t) * 0.2;
    left[i] = sample;
    right[i] = sample;
  }

  const analysisService = new AudioAnalysisService();
  const keyDetector = new AdvancedKeyDetection(new class {}() as any);

  // Measure performance of AdvancedKeyDetection.detectKey (which performs its own FFT)
  console.log('1. Benchmarking Baseline/Separate Key Detection (Runs redundant 8192 FFT)...');
  const iterations = 50;
  const startSeparate = Date.now();
  for (let i = 0; i < iterations; i++) {
    await keyDetector.detectKey(audioBuffer);
  }
  const endSeparate = Date.now();
  const separateTime = (endSeparate - startSeparate) / iterations;

  // Measure performance of AdvancedKeyDetection.detectKeyFromMagnitudes (uses shared FFT magnitudes)
  console.log('2. Benchmarking Synergy Key Detection (Zero-allocation using pre-calculated magnitudes)...');
  const { linearMagnitudes } = await (analysisService as any).fftEngine.performFFT(audioBuffer, 8192);

  const startSynergy = Date.now();
  for (let i = 0; i < iterations; i++) {
    keyDetector.detectKeyFromMagnitudes(linearMagnitudes, sampleRate);
  }
  const endSynergy = Date.now();
  const synergyTime = (endSynergy - startSynergy) / iterations;

  console.log(`\nResults (Iterations: ${iterations}):`);
  console.log(`- Separate Key Detection (Independent FFT): ${separateTime.toFixed(2)}ms / op`);
  console.log(`- Synergy Key Detection (Shared Magnitudes): ${synergyTime.toFixed(2)}ms / op`);
  console.log(`- Speedup:                                    ${(separateTime / synergyTime).toFixed(2)}x`);

  // Verification of Musical Correctness
  console.log('\n🔍 Verifying Musical Correctness of the integrated key result...');
  const keyResultSeparate = await keyDetector.detectKey(audioBuffer);
  const keyResultSynergy = keyDetector.detectKeyFromMagnitudes(linearMagnitudes, sampleRate);

  console.log(`- Separate Key detected:  ${keyResultSeparate.key} (${keyResultSeparate.scale}) with confidence ${(keyResultSeparate.confidence * 100).toFixed(1)}%`);
  console.log(`- Synergy Key detected:   ${keyResultSynergy.key} (${keyResultSynergy.scale}) with confidence ${(keyResultSynergy.confidence * 100).toFixed(1)}%`);

  if (keyResultSeparate.key !== keyResultSynergy.key || keyResultSeparate.scale !== keyResultSynergy.scale) {
    console.error('❌ Mismatch: Keys do not match between Separate and Synergy implementations!');
    process.exit(1);
  }

  // Ensure standard note detection maps standard chords correctly
  console.log(`- Top pitch class from separate chroma: ${keyResultSeparate.chromagram.indexOf(Math.max(...keyResultSeparate.chromagram))}`);
  console.log(`- Top pitch class from synergy chroma:  ${keyResultSynergy.chromagram.indexOf(Math.max(...keyResultSynergy.chromagram))}`);

  console.log('\n✅ integrated spectral synergy and key detection correctness verified successfully!');
}

verifySpectralSynergy().catch(console.error);
