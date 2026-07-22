import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

/**
 * Benchmark script for AdvancedKeyDetection zero-copy chord progression optimizations.
 * Compares performance and correctness of the optimized zero-copy pipeline vs the baseline.
 */
async function runBenchmark() {
  console.log('⚡ Starting AdvancedKeyDetection Optimization Benchmark...\n');

  // Setup mocks
  const sampleRate = 44100;
  const duration = 60; // 1-minute audio track
  const length = sampleRate * duration;
  const leftChannel = new Float32Array(length);

  // Fill with a synthetic sine wave that changes frequency to simulate chord changes
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Frequency shifts every 10 seconds to simulate different chords/notes
    const freq = 220 + Math.floor(t / 10) * 110;
    leftChannel[i] = Math.sin(2 * Math.PI * freq * t);
  }

  // Mock global window and AudioContext
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};

  // Mock AudioBuffer structure
  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData: (ch: number) => leftChannel,
  } as unknown as AudioBuffer;

  const keyDetector = new AdvancedKeyDetection(null as any);

  // --- 1. Baseline Implementation (Simulated old logic with AudioBuffer allocation and element copying) ---
  console.log('⏱️ Running baseline (AudioBuffer Allocation & Element Copying)...');

  // Custom mock AudioBuffer constructor since we are in Node
  function createMockAudioBuffer(channels: number, len: number, rate: number): AudioBuffer {
    const chData = Array.from({ length: channels }, () => new Float32Array(len));
    return {
      sampleRate: rate,
      length: len,
      duration: len / rate,
      numberOfChannels: channels,
      getChannelData: (ch: number) => chData[ch],
    } as unknown as AudioBuffer;
  }

  async function baselineDetectChordProgression(
    audioBuffer: AudioBuffer,
    hopSize: number = 2
  ): Promise<Array<{ time: number; chord: string; confidence: number }>> {
    const chords: Array<{ time: number; chord: string; confidence: number }> = [];
    const segments = Math.floor(audioBuffer.duration / hopSize);

    for (let i = 0; i < segments; i++) {
      const startTime = i * hopSize;
      const endTime = Math.min((i + 1) * hopSize, audioBuffer.duration);

      const startSample = Math.floor(startTime * audioBuffer.sampleRate);
      const endSample = Math.floor(endTime * audioBuffer.sampleRate);
      const segmentLength = endSample - startSample;

      // Old extract segment logic: create mock AudioBuffer and copy element-by-element
      const segmentBuffer = createMockAudioBuffer(1, segmentLength, audioBuffer.sampleRate);
      const source = audioBuffer.getChannelData(0);
      const target = segmentBuffer.getChannelData(0);
      for (let s = 0; s < segmentLength; s++) {
        target[s] = source[startSample + s];
      }

      const keyData = await keyDetector.detectKey(segmentBuffer);
      chords.push({
        time: startTime,
        chord: keyData.key.replace(' Major', '').replace(' Minor', 'm'),
        confidence: keyData.confidence,
      });
    }
    return chords;
  }

  const startBaseline = performance.now();
  const baselineChords = await baselineDetectChordProgression(mockAudioBuffer, 2);
  const endBaseline = performance.now();
  const durationBaseline = endBaseline - startBaseline;

  console.log(`Baseline took: ${durationBaseline.toFixed(2)}ms\n`);

  // --- 2. Bolt's Optimized Implementation (Zero-Copy Subarrays) ---
  console.log('⚡ Running Bolt\'s Optimized (Zero-Copy Subarrays)...');

  const startOptimized = performance.now();
  const optimizedChords = await keyDetector.detectChordProgression(mockAudioBuffer, 2);
  const endOptimized = performance.now();
  const durationOptimized = endOptimized - startOptimized;

  console.log(`Optimized took: ${durationOptimized.toFixed(2)}ms\n`);

  // --- 3. Verification & Metrics ---
  const speedup = durationBaseline / durationOptimized;
  console.log('--- Phase 3: Verification & Metrics ---');
  console.log(`BPM/Chord processing Speedup: ${speedup.toFixed(2)}x`);

  // Verify correctness
  let matches = true;
  if (baselineChords.length !== optimizedChords.length) {
    matches = false;
  } else {
    for (let i = 0; i < baselineChords.length; i++) {
      if (baselineChords[i].chord !== optimizedChords[i].chord) {
        matches = false;
        console.log(`Mismatch at index ${i}: Baseline=${baselineChords[i].chord}, Optimized=${optimizedChords[i].chord}`);
        break;
      }
    }
  }

  if (matches) {
    console.log('✅ Correctness verified! Both pipelines returned identical chord results.');
  } else {
    console.log('❌ Error: Correctness verification failed. Results mismatch.');
    process.exit(1);
  }
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
