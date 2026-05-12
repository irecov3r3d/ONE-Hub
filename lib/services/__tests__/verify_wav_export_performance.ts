import { AudioMasteringService } from '../audioMasteringService';

/**
 * Benchmark and verification for optimized WAV export.
 * Note: This runs in Node, so we mock the necessary Web API components.
 */

// Mock AudioBuffer
class MockAudioBuffer {
  duration: number;
  length: number;
  numberOfChannels: number;
  sampleRate: number;
  private channelData: Float32Array[];

  constructor(options: { length: number; numberOfChannels: number; sampleRate: number }) {
    this.length = options.length;
    this.numberOfChannels = options.numberOfChannels;
    this.sampleRate = options.sampleRate;
    this.duration = this.length / this.sampleRate;
    this.channelData = Array.from({ length: this.numberOfChannels }, () => new Float32Array(this.length));
  }

  getChannelData(channel: number) {
    return this.channelData[channel];
  }
}

// Mock Blob
(global as any).Blob = class {
  constructor(parts: any[], options: any) {
    (this as any).parts = parts;
    (this as any).type = options.type;
    (this as any).size = parts.reduce((sum, p) => sum + p.byteLength, 0);
  }
};

// Mock window and AudioContext
(global as any).window = {
  AudioContext: class {
    createBuffer() { return new MockAudioBuffer({ length: 1, numberOfChannels: 1, sampleRate: 44100 }); }
  }
};

async function runBenchmark() {
  console.log('⚡ Starting WAV Export Benchmark...');

  const sampleRate = 44100;
  const durationSeconds = 60; // 1 minute for faster test
  const numChannels = 2;
  const length = sampleRate * durationSeconds;

  const audioBuffer = new MockAudioBuffer({ length, numberOfChannels: numChannels, sampleRate }) as any as AudioBuffer;

  // Fill with dummy sine wave
  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }
  }

  const service = new AudioMasteringService();

  // The method is private, so we use type assertion to access it for testing
  const start = Date.now();
  const blob: any = await (service as any).audioBufferToWav(audioBuffer);
  const end = Date.now();

  console.log(`✅ Exported ${durationSeconds}s stereo audio in ${end - start}ms`);

  // Verification
  const buffer = blob.parts[0];
  const view = new DataView(buffer);

  // Check WAV header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  console.log(`Header: ${riff}`);

  if (riff !== 'RIFF') {
    throw new Error('Invalid WAV header: Missing RIFF');
  }

  const dataSize = view.getUint32(40, true);
  const expectedDataSize = length * numChannels * 2;
  console.log(`Data Size: ${dataSize} (Expected: ${expectedDataSize})`);

  if (dataSize !== expectedDataSize) {
    throw new Error(`Data size mismatch. Expected ${expectedDataSize}, got ${dataSize}`);
  }

  // Check first few samples
  const firstSample = view.getInt16(44, true);
  const expectedFirstSample = Math.round(Math.sin(0) * 0x7FFF);
  console.log(`First Sample: ${firstSample} (Expected: ${expectedFirstSample})`);

  // Verify that the data is not all zeros
  let sum = 0;
  const samplesToTest = 100;
  for (let i = 0; i < samplesToTest; i++) {
    sum += Math.abs(view.getInt16(44 + i * 2, true));
  }

  if (sum === 0) {
    throw new Error('WAV data appears to be empty (all zeros)');
  }

  console.log('✨ Numerical verification passed!');
}

runBenchmark().catch(err => {
  console.error('❌ Benchmark failed:', err);
  process.exit(1);
});
