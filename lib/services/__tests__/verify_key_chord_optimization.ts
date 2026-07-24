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

/**
 * Legacy/Baseline detectChordProgression implementation using OfflineAudioContext & element-wise copies.
 */
async function baselineDetectChordProgression(
  service: AdvancedKeyDetection,
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
    const length = endSample - startSample;

    // Simulate extractSegment:
    const offlineContext = new MockOfflineAudioContext(
      audioBuffer.numberOfChannels,
      length,
      audioBuffer.sampleRate
    );

    const newBuffer = offlineContext.createBuffer(
      audioBuffer.numberOfChannels,
      length,
      audioBuffer.sampleRate
    );

    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const sourceData = audioBuffer.getChannelData(ch);
      const targetData = newBuffer.getChannelData(ch);

      for (let j = 0; j < length && startSample + j < sourceData.length; j++) {
        targetData[j] = sourceData[startSample + j];
      }
    }

    // Detect key/chord for this segment
    const keyData = await service.detectKey(newBuffer as unknown as AudioBuffer);

    chords.push({
      time: startTime,
      chord: keyData.key.replace(' Major', '').replace(' Minor', 'm'),
      confidence: keyData.confidence,
    });
  }

  return chords;
}

async function runBenchmark() {
  console.log('🧪 Starting AdvancedKeyDetection Chord Progression Optimization Benchmark...\n');

  const sampleRate = 44100;
  const duration = 10; // 10 seconds of audio
  const length = sampleRate * duration;
  const audioBuffer = new MockAudioBuffer({ length, sampleRate, numberOfChannels: 1 }) as unknown as AudioBuffer;

  // Fill buffer with a simple synthetic chord progression (C Major -> A Minor -> F Major -> G Major)
  const channelData = audioBuffer.getChannelData(0);
  const frequencies = [261.63, 220.00, 349.23, 392.00]; // C3, A3, F3, G3
  for (let i = 0; i < length; i++) {
    const segmentIndex = Math.floor((i / length) * 4);
    const freq = frequencies[segmentIndex];
    // Generate fundamental tone and a couple harmonics
    channelData[i] = Math.sin(2 * Math.PI * freq * i / sampleRate) * 0.5 +
                    Math.sin(2 * Math.PI * freq * 2 * i / sampleRate) * 0.25 +
                    Math.sin(2 * Math.PI * freq * 3 * i / sampleRate) * 0.125;
  }

  // Instantiate service
  const service = new AdvancedKeyDetection(new class {}() as any);

  // Warm up JIT
  await baselineDetectChordProgression(service, audioBuffer, 2);
  await service.detectChordProgression(audioBuffer, 2);

  const iterations = 20;

  // 1. Benchmark Baseline
  const startBaseline = Date.now();
  for (let i = 0; i < iterations; i++) {
    await baselineDetectChordProgression(service, audioBuffer, 2);
  }
  const endBaseline = Date.now();
  const baselineTime = (endBaseline - startBaseline) / iterations;

  // 2. Benchmark Optimized (Bolt Zero-Copy)
  const startOptimized = Date.now();
  for (let i = 0; i < iterations; i++) {
    await service.detectChordProgression(audioBuffer, 2);
  }
  const endOptimized = Date.now();
  const optimizedTime = (endOptimized - startOptimized) / iterations;

  console.log(`Results (Audio Duration: ${duration}s, Hop Size: 2s):`);
  console.log(`- Baseline (OfflineAudioContext + Element Copy): ${baselineTime.toFixed(2)}ms / op`);
  console.log(`- Bolt Optimized (Zero-Copy subarray):        ${optimizedTime.toFixed(2)}ms / op`);
  console.log(`- Speedup:                                    ${(baselineTime / optimizedTime).toFixed(2)}x`);

  // 3. Logic Verification
  console.log('\n🔍 Verifying numerical and musical logical correctness...');
  const baselineChords = await baselineDetectChordProgression(service, audioBuffer, 2);
  const optimizedChords = await service.detectChordProgression(audioBuffer, 2);

  if (baselineChords.length !== optimizedChords.length) {
    console.error(`❌ Mismatch: Chord progression length differ! expected ${baselineChords.length}, got ${optimizedChords.length}`);
    process.exit(1);
  }

  let mismatchCount = 0;
  for (let i = 0; i < baselineChords.length; i++) {
    const b = baselineChords[i];
    const o = optimizedChords[i];
    if (b.chord !== o.chord || Math.abs(b.confidence - o.confidence) > 1e-4) {
      console.error(`Mismatch at segment ${i} (time ${b.time}s):`);
      console.error(`  Baseline:  chord="${b.chord}", confidence=${b.confidence.toFixed(5)}`);
      console.error(`  Optimized: chord="${o.chord}", confidence=${o.confidence.toFixed(5)}`);
      mismatchCount++;
    }
  }

  if (mismatchCount === 0) {
    console.log('✅ Correctness verified! Zero-copy implementation yields identical musical and numeric results.');
  } else {
    console.error(`❌ Mismatch: Found ${mismatchCount} segments with different chords or confidence scores.`);
    process.exit(1);
  }
}

runBenchmark().catch(console.error);
