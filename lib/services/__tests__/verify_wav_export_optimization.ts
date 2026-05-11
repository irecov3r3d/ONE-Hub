import { AudioMasteringService } from '../audioMasteringService';

// Mocking window.AudioContext as it is not available in Node.js
class MockAudioContext {
  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      length: length,
      sampleRate: sampleRate,
      getChannelData: (ch: number) => new Float32Array(length),
      copyToChannel: () => {},
    };
  }
}

(globalThis as any).window = {
  AudioContext: MockAudioContext,
};

async function benchmarkWavExport() {
  console.log('🧪 Starting WAV Export Optimization Benchmark...');

  const service = new AudioMasteringService();
  const sampleRate = 44100;
  const durationInSeconds = 240; // 4 minutes
  const length = sampleRate * durationInSeconds;
  const numberOfChannels = 2;

  // Create a mock AudioBuffer
  const mockAudioBuffer = {
    numberOfChannels,
    length,
    sampleRate,
    getChannelData: (ch: number) => {
      const data = new Float32Array(length);
      // Fill with some dummy data
      for (let i = 0; i < length; i++) {
        data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
      }
      return data;
    }
  } as any as AudioBuffer;

  console.log(`Analyzing 4-minute stereo track (${length} samples per channel)...`);

  // Measure optimized version
  const start = performance.now();
  // @ts-ignore - access private method
  const blob = await service.audioBufferToWav(mockAudioBuffer);
  const end = performance.now();

  const timeMs = end - start;
  console.log(`✅ Optimized WAV export took: ${timeMs.toFixed(2)}ms`);
  console.log(`Generated Blob size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

  // Numerical verification: Check header and first few samples
  const buffer = await blob.arrayBuffer();
  const view = new DataView(buffer);

  // Check RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') throw new Error('Invalid RIFF header');

  // Check "fmt " chunk
  const fmt = String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15));
  if (fmt !== 'fmt ') throw new Error('Invalid fmt chunk');

  // Check sample data starting at offset 44
  const firstSample = view.getInt16(44, true);
  const expectedSample = Math.round(Math.sin(0) * 0x7FFF); // sin(0) is 0

  // sin(2 * Math.PI * 440 * 1 / 44100)
  const secondSampleRaw = Math.sin(2 * Math.PI * 440 * 1 / sampleRate);
  const secondSampleExpected = Math.round(secondSampleRaw * 0x7FFF);
  // In stereo, L1 is the 3rd 16-bit word (offset 44 + 2*2 = 48)
  const actualL1Sample = view.getInt16(48, true);

  console.log(`Verification: L0: ${firstSample}, L1: ${actualL1Sample} (Expected: ~${secondSampleExpected})`);

  if (Math.abs(actualL1Sample - secondSampleExpected) > 1) {
      throw new Error(`Numerical verification failed! Actual: ${actualL1Sample}, Expected: ${secondSampleExpected}`);
  }

  console.log('✅ Numerical correctness verified!');

  // Previous slow version (for comparison if we could run it, but we already replaced it)
  // Based on profile of setInt16 in a loop vs bulk TypedArray set, we expect ~5-10x improvement.

  console.log('\n✨ WAV EXPORT BENCHMARK COMPLETED SUCCESSFULLY! ✨');
}

benchmarkWavExport().catch(err => {
  console.error('❌ Benchmark Failed:', err);
  process.exit(1);
});
