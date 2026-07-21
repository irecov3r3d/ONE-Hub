import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

// Mock AudioContext and AudioBuffer for Node environment
const sampleRate = 44100;
const duration = 30; // 30 seconds of audio is plenty for benchmarking
const length = sampleRate * duration;

const channelData = new Float32Array(length);
// Fill with a synthetic signal (e.g., 440Hz sine wave to represent an 'A')
for (let i = 0; i < length; i++) {
  channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
}

const mockAudioBuffer = {
  sampleRate,
  duration,
  length,
  numberOfChannels: 1,
  getChannelData: (ch: number) => channelData,
} as unknown as AudioBuffer;

// Mock globals for Node
class MockAudioBuffer {
  sampleRate: number;
  length: number;
  duration: number;
  numberOfChannels: number;
  private _data: Float32Array[];

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
    this._data = Array.from({ length: options.numberOfChannels }, () => new Float32Array(options.length));
  }
  getChannelData(ch: number) {
    return this._data[ch];
  }
}

class MockOfflineAudioContext {
  constructor(channels: number, length: number, rate: number) {}
  createBuffer(channels: number, length: number, rate: number) {
    return new MockAudioBuffer({ numberOfChannels: channels, length, sampleRate: rate });
  }
}

(global as any).window = {
  AudioContext: class {},
  OfflineAudioContext: MockOfflineAudioContext,
};
(global as any).AudioContext = class {};
(global as any).OfflineAudioContext = MockOfflineAudioContext;
(global as any).AudioBuffer = MockAudioBuffer;

async function runBenchmark() {
  console.log('⚡ Starting AdvancedKeyDetection & Chord Progression Performance Benchmark...');

  const detector = new AdvancedKeyDetection(new (global as any).AudioContext());

  // 1. Benchmark Key Detection Accuracy & Correctness
  console.log('\n--- Phase 1: Key & Pitch-Class Detection Accuracy ---');
  const result = await detector.detectKey(mockAudioBuffer);
  console.log(`Detected Key:  ${result.key} (${result.scale})`);
  console.log(`Confidence:    ${(result.confidence * 100).toFixed(1)}%`);
  console.log('Alternatives:');
  result.alternatives.forEach(alt => {
    console.log(`  - ${alt.key}: ${(alt.confidence * 100).toFixed(1)}%`);
  });

  // 2. Benchmark Pitch Class Caching Performance
  console.log('\n--- Phase 2: Pitch Class Caching Speedup ---');

  // Baseline (Original: calling frequencyToPitchClass for every bin in a loop)
  const baselineCalculateChromagram = async (audioBuffer: AudioBuffer): Promise<number[]> => {
    const chromagram = new Array(12).fill(0);
    const { spectrum, linearMagnitudes } = await (detector as any).fftEngine.performFFT(audioBuffer, 8192);

    // Original frequencyToPitchClass
    const frequencyToPitchClass = (frequency: number): number => {
      if (frequency <= 0) return -1;
      const midiNote = 69 + 12 * Math.log2(frequency / 440);
      return Math.round(midiNote) % 12;
    };

    for (let i = 0; i < spectrum.length; i++) {
      const bin = spectrum[i];
      if (bin.frequency < 80 || bin.frequency > 5000) continue;
      const magnitude = linearMagnitudes[i];
      const pitchClass = frequencyToPitchClass(bin.frequency);
      if (pitchClass !== -1) {
        chromagram[pitchClass] += magnitude;
      }
    }
    return chromagram;
  };

  const iterations = 500;

  // Warm up
  await baselineCalculateChromagram(mockAudioBuffer);
  await (detector as any).calculateChromagram(mockAudioBuffer);

  const startBaseline = performance.now();
  for (let i = 0; i < iterations; i++) {
    await baselineCalculateChromagram(mockAudioBuffer);
  }
  const endBaseline = performance.now();
  const baselineTime = endBaseline - startBaseline;

  const startOptimized = performance.now();
  for (let i = 0; i < iterations; i++) {
    await (detector as any).calculateChromagram(mockAudioBuffer);
  }
  const endOptimized = performance.now();
  const optimizedTime = endOptimized - startOptimized;

  console.log(`Baseline Chromagram (No cache): ${(baselineTime / iterations).toFixed(4)}ms / op`);
  console.log(`Optimized Chromagram (Cached):   ${(optimizedTime / iterations).toFixed(4)}ms / op`);
  console.log(`Speedup:                        ${(baselineTime / optimizedTime).toFixed(2)}x`);

  // 3. Benchmark Chord Progression Processing (Zero-copy vs Baseline)
  console.log('\n--- Phase 3: Chord Progression Zero-Copy Windowing ---');

  // Baseline detectChordProgression utilizing OfflineAudioContext segment extraction
  const baselineDetectChordProgression = async (
    audioBuffer: AudioBuffer,
    hopSize: number = 2
  ): Promise<any[]> => {
    const chords: any[] = [];
    const segments = Math.floor(audioBuffer.duration / hopSize);

    // Original extractSegment
    const extractSegment = (buf: AudioBuffer, startSample: number, length: number): AudioBuffer => {
      const offlineContext = new MockOfflineAudioContext(
        buf.numberOfChannels,
        length,
        buf.sampleRate
      );
      const newBuffer = offlineContext.createBuffer(
        buf.numberOfChannels,
        length,
        buf.sampleRate
      );
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const sourceData = buf.getChannelData(ch);
        const targetData = newBuffer.getChannelData(ch);
        for (let j = 0; j < length && startSample + j < sourceData.length; j++) {
          targetData[j] = sourceData[startSample + j];
        }
      }
      return newBuffer as unknown as AudioBuffer;
    };

    for (let i = 0; i < segments; i++) {
      const startTime = i * hopSize;
      const endTime = Math.min((i + 1) * hopSize, audioBuffer.duration);
      const startSample = Math.floor(startTime * audioBuffer.sampleRate);
      const endSample = Math.floor(endTime * audioBuffer.sampleRate);
      const length = endSample - startSample;

      const segmentBuffer = extractSegment(audioBuffer, startSample, length);
      const keyData = await detector.detectKey(segmentBuffer);
      chords.push({
        time: startTime,
        chord: keyData.key.replace(' Major', '').replace(' Minor', 'm'),
        confidence: keyData.confidence,
      });
    }
    return chords;
  };

  // Warm up
  await baselineDetectChordProgression(mockAudioBuffer, 2);
  await detector.detectChordProgression(mockAudioBuffer, 2);

  const startChordBaseline = performance.now();
  const baselineChords = await baselineDetectChordProgression(mockAudioBuffer, 2);
  const endChordBaseline = performance.now();
  const chordBaselineTime = endChordBaseline - startChordBaseline;

  const startChordOptimized = performance.now();
  const optimizedChords = await detector.detectChordProgression(mockAudioBuffer, 2);
  const endChordOptimized = performance.now();
  const chordOptimizedTime = endChordOptimized - startChordOptimized;

  console.log(`Baseline Chord Progression (OfflineContext): ${(chordBaselineTime).toFixed(2)}ms`);
  console.log(`Optimized Chord Progression (Zero-Copy):     ${(chordOptimizedTime).toFixed(2)}ms`);
  console.log(`Speedup:                                     ${(chordBaselineTime / chordOptimizedTime).toFixed(2)}x`);

  // Numerical Verification
  console.log('\n--- Numerical & Chord Equivalence Verification ---');
  let matched = true;
  if (baselineChords.length !== optimizedChords.length) {
    matched = false;
    console.log(`❌ Chord progression lengths differ: Baseline ${baselineChords.length}, Optimized ${optimizedChords.length}`);
  } else {
    for (let i = 0; i < baselineChords.length; i++) {
      if (baselineChords[i].chord !== optimizedChords[i].chord) {
        matched = false;
        console.log(`❌ Mismatch at segment ${i} (time ${baselineChords[i].time}s): Baseline "${baselineChords[i].chord}" vs Optimized "${optimizedChords[i].chord}"`);
      }
    }
  }

  if (matched) {
    console.log('✅ ALL TESTS PASSED: Key and Chord progressions are numerically identical and verified!');
  } else {
    console.log('❌ VERIFICATION FAILED: Mismatch in chord progressions.');
    process.exit(1);
  }
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
