import { AdvancedKeyDetection } from '../advancedKeyDetection';

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
  duration = 10; // 10 seconds of audio
  length = 10 * 44100;
  sampleRate = 44100;
  numberOfChannels = 1;
  channels = [new Float32Array(10 * 44100)];
  getChannelData(i: number) { return this.channels[i]; }
  copyToChannel(data: Float32Array, i: number) { this.channels[i].set(data); }
}

(globalThis as any).mockAudioBuffer = new MockAudioBuffer();

async function runBenchmark() {
  console.log('⚡ Starting Key & Chord Progression Optimization Benchmark...');

  const sampleRate = 44100;
  const duration = 10;
  const length = duration * sampleRate;
  const mono = new Float32Array(length);

  // Synthesize a changing signal (A440 for first half, C523 for second half)
  for (let i = 0; i < length; i++) {
    const freq = i < length / 2 ? 440 : 523.25;
    mono[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
  }

  const audioBuffer = (globalThis as any).mockAudioBuffer as MockAudioBuffer;
  audioBuffer.channels[0].set(mono);

  const keyDetector = new AdvancedKeyDetection(new AudioContext());

  // 1. Measure Baseline (Using the deprecated/fallback path by mocking context and creating AudioBuffers)
  console.log('\n--- Running Baseline Chord Progression Detection (Buffer Copy) ---');
  const baselineStart = Date.now();

  // Custom baseline runner using OfflineAudioContext/AudioBuffer simulation
  const baselineChords: any[] = [];
  const segments = Math.floor(audioBuffer.duration / 2);
  for (let i = 0; i < segments; i++) {
    const startTime = i * 2;
    const startSample = Math.floor(startTime * sampleRate);
    const length = Math.floor(2 * sampleRate);

    // Simulate segment buffer creation (similar to old extractSegment)
    const segmentBuf = new MockAudioBuffer() as any;
    segmentBuf.duration = 2;
    segmentBuf.length = length;
    segmentBuf.channels = [new Float32Array(length)];
    for (let s = 0; s < length; s++) {
      segmentBuf.channels[0][s] = mono[startSample + s];
    }

    const keyData = await keyDetector.detectKey(segmentBuf);
    baselineChords.push({
      time: startTime,
      chord: keyData.key.replace(' Major', '').replace(' Minor', 'm'),
      confidence: keyData.confidence,
    });
  }
  const baselineDuration = Date.now() - baselineStart;
  console.log(`Baseline completed in: ${baselineDuration}ms`);
  console.log('Chords:', baselineChords);

  // 2. Measure Optimized (Using polymorphic Float32Array zero-copy subarray path)
  console.log('\n--- Running Optimized Chord Progression Detection (Zero-Copy) ---');
  const optStart = Date.now();
  const optChords = await keyDetector.detectChordProgression(mono, 2, sampleRate);
  const optDuration = Date.now() - optStart;
  console.log(`Optimized completed in: ${optDuration}ms`);
  console.log('Chords:', optChords);

  // 3. Verification & Comparison
  console.log('\n--- Verification ---');
  const speedup = baselineDuration / (optDuration || 1);
  console.log(`Speedup: ${speedup.toFixed(2)}x`);

  let matchCount = 0;
  for (let i = 0; i < baselineChords.length; i++) {
    if (baselineChords[i].chord === optChords[i].chord) {
      matchCount++;
    }
  }

  const matches = matchCount === baselineChords.length;
  console.log(`Correctness matches: ${matches ? '✅ Yes' : '❌ No'} (${matchCount}/${baselineChords.length})`);

  if (!matches) {
    throw new Error('Key/Chord optimization changed numerical output!');
  }
  console.log('\n✅ Verification Complete.');
}

runBenchmark().catch(console.error);
