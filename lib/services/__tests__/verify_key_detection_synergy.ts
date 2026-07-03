import { AudioAnalysisService } from '../audioAnalysisService';
import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

async function runSynergyBenchmark() {
  console.log('⚡ Starting Integrated Spectral Synergy Benchmark...');

  const sampleRate = 44100;
  const duration = 120; // 2 minutes
  const length = sampleRate * duration;
  const leftChannel = new Float32Array(length);

  // Fill with a sine wave (A Major = 440Hz)
  for (let i = 0; i < length; i++) {
    leftChannel[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
  }

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData: (ch: number) => leftChannel,
  } as unknown as AudioBuffer;

  // Mock global window/AudioContext
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};
  (global as any).OfflineAudioContext = class {
    constructor() {}
    createBuffer(channels: number, length: number, sampleRate: number) {
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        getChannelData: (ch: number) => new Float32Array(length),
      };
    }
  };

  const service = new AudioAnalysisService();
  const keyDetector = new AdvancedKeyDetection(new (global as any).AudioContext());

  // Prepare magnitudes for O(1) key detection
  const fftSize = 8192;
  const magnitudes = new Float32Array(fftSize / 2);
  // Simulate an A4 peak in the magnitudes
  const targetBin = Math.round((440 * fftSize) / sampleRate);
  magnitudes[targetBin] = 1.0;

  console.log('\n--- Phase 1: Shared Spectral Key Detection (Synergy) ---');
  const startSynergy = performance.now();
  const synergyKey = keyDetector.detectKeyFromMagnitudes(magnitudes, sampleRate);
  const endSynergy = performance.now();
  console.log(`Duration: ${(endSynergy - startSynergy).toFixed(2)}ms (Integrated Path)`);
  console.log(`Detected Key: ${synergyKey.key} (Confidence: ${synergyKey.confidence.toFixed(2)})`);

  console.log('\n--- Phase 2: Standard Key Detection (Redundant FFT) ---');
  const startStandard = performance.now();
  const standardKey = await keyDetector.detectKey(mockAudioBuffer);
  const endStandard = performance.now();
  console.log(`Duration: ${(endStandard - startStandard).toFixed(2)}ms (Standalone Path)`);

  const speedup = (endStandard - startStandard) / (endSynergy - startSynergy);
  console.log(`⚡ Spectral Reuse Speedup: ${speedup.toFixed(2)}x`);

  console.log('\n--- Phase 3: Zero-Copy Chord Progression ---');
  const startChords = performance.now();
  const chords = await keyDetector.detectChordProgression(mockAudioBuffer, 2);
  const endChords = performance.now();
  console.log(`Duration: ${(endChords - startChords).toFixed(2)}ms for ${chords.length} segments`);
  console.log(`Average per segment: ${((endChords - startChords) / chords.length).toFixed(2)}ms`);

  console.log('\n⚡ Benchmark Complete.');
}

runSynergyBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
