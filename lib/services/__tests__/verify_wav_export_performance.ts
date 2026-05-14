
import { AudioMasteringService } from '../audioMasteringService';

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

// @ts-ignore
global.AudioBuffer = MockAudioBuffer;
// @ts-ignore
global.window = { AudioContext: class {} };
// @ts-ignore
global.Blob = class {
  constructor(parts: any[], options: any) {
    (this as any).parts = parts;
    (this as any).type = options.type;
  }
};

async function benchmark() {
  const sampleRate = 44100;
  const duration = 240; // 4 minutes of audio
  const length = sampleRate * duration;
  const channels = 2;

  const audioBuffer = new MockAudioBuffer({ length, sampleRate, numberOfChannels: channels }) as unknown as AudioBuffer;

  // Fill with random data
  for (let ch = 0; ch < channels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  console.log(`🚀 Benchmarking WAV export for ${duration}s of stereo audio (${length} samples)...`);

  const masteringService = new AudioMasteringService();

  // Baseline implementation (simulated via manual loop as we replaced the original)
  const baselineExport = (buffer: AudioBuffer) => {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const dataSize = length * numberOfChannels * 2;
    const fileSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(fileSize);
    const view = new DataView(arrayBuffer);

    let offset = 44;
    const channels: Float32Array[] = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numberOfChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    return arrayBuffer;
  };

  const startBaseline = Date.now();
  const baselineResult = baselineExport(audioBuffer);
  const endBaseline = Date.now();
  console.log(`❌ Baseline (DataView.setInt16): ${endBaseline - startBaseline}ms`);

  // Optimized implementation
  const startOptimized = Date.now();
  const optimizedBlob = await (masteringService as any).audioBufferToWav(audioBuffer);
  const endOptimized = Date.now();

  // Re-run optimized to warm up JIT
  const startOptimized2 = Date.now();
  await (masteringService as any).audioBufferToWav(audioBuffer);
  const endOptimized2 = Date.now();
  console.log(`⚡ Optimized (Int16Array) [Warm]: ${endOptimized2 - startOptimized2}ms`);
  const optimizedResult = optimizedBlob.parts[0];
  console.log(`⚡ Optimized (Int16Array): ${endOptimized - startOptimized}ms`);

  const speedup = (endBaseline - startBaseline) / (endOptimized - startOptimized);
  console.log(`📈 Speedup: ${speedup.toFixed(2)}x`);

  // Verification
  console.log('\n🔍 Verifying numerical correctness...');
  const baselineView = new Int16Array(baselineResult, 44);
  const optimizedView = new Int16Array(optimizedResult, 44);

  let errors = 0;
  for (let i = 0; i < baselineView.length; i++) {
    if (baselineView[i] !== optimizedView[i]) {
      if (errors < 5) {
        console.error(`Mismatch at index ${i}: expected ${baselineView[i]}, got ${optimizedView[i]}`);
      }
      errors++;
    }
  }

  if (errors === 0) {
    console.log('✅ Success: Optimized output is numerically identical to baseline.');
  } else {
    console.error(`❌ Failure: Found ${errors} mismatches.`);
    process.exit(1);
  }
}

benchmark().catch(console.error);
