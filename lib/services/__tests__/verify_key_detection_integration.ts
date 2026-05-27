import { AudioAnalysisService } from '../audioAnalysisService';
import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

/**
 * Benchmark script for Key Detection and FFT reuse in AudioAnalysisService.
 */
async function runVerification() {
  console.log('⚡ Starting Key Detection & FFT Reuse Verification...');

  // Mock AudioContext and AudioBuffer
  const sampleRate = 44100;
  const length = 44100 * 5; // 5 seconds
  const leftChannel = new Float32Array(length);
  const rightChannel = new Float32Array(length);

  // Generate a pure sine wave at 440Hz (A4)
  for (let i = 0; i < length; i++) {
    const val = Math.sin(2 * Math.PI * 440 * (i / sampleRate));
    leftChannel[i] = val;
    rightChannel[i] = val;
  }

  const mockAudioBuffer = {
    sampleRate,
    duration: 5,
    length,
    numberOfChannels: 2,
    getChannelData: (ch: number) => (ch === 0 ? leftChannel : rightChannel),
  } as unknown as AudioBuffer;

  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {
    createBuffer(ch: number, len: number, sr: number) {
        return {
            numberOfChannels: ch,
            length: len,
            sampleRate: sr,
            getChannelData: () => new Float32Array(len)
        };
    }
    createAnalyser() {
        return {
            fftSize: 0,
            smoothingTimeConstant: 0,
            frequencyBinCount: 0,
            connect: () => {},
            disconnect: () => {}
        };
    }
    createBufferSource() {
        return {
            buffer: null,
            connect: () => {},
            start: () => {},
            stop: () => {}
        };
    }
    get destination() { return {}; }
  };
  (global as any).OfflineAudioContext = class extends (global as any).AudioContext {};

  const service = new AudioAnalysisService();
  const keyDetector = new AdvancedKeyDetection((global as any).AudioContext);

  // 1. Benchmark Standard Key Detection (Redundant FFT)
  console.log('\n--- Standard Key Detection (Redundant FFT) ---');
  const startStandard = performance.now();
  const resultStandard = await keyDetector.detectKey(mockAudioBuffer);
  const endStandard = performance.now();
  console.log(`Duration: ${(endStandard - startStandard).toFixed(2)}ms`);
  console.log(`Detected Key: ${resultStandard.key} (${(resultStandard.confidence * 100).toFixed(1)}% confidence)`);

  // 2. Benchmark Optimized Key Detection (FFT Reuse)
  console.log('\n--- Optimized Key Detection (FFT Reuse) ---');
  const spectrum8192 = await (service as any).fftEngine.performFFT(mockAudioBuffer, 8192);
  const len = spectrum8192.length;
  const linearMagnitudes8192 = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    linearMagnitudes8192[i] = Math.pow(10, spectrum8192[i].magnitude / 20);
  }

  const startOptimized = performance.now();
  const resultOptimized = await keyDetector.detectKey(mockAudioBuffer, linearMagnitudes8192);
  const endOptimized = performance.now();
  console.log(`Duration: ${(endOptimized - startOptimized).toFixed(2)}ms`);
  console.log(`Detected Key: ${resultOptimized.key} (${(resultOptimized.confidence * 100).toFixed(1)}% confidence)`);

  const speedup = (endStandard - startStandard) / (endOptimized - startOptimized);
  console.log(`\n🚀 Speedup: ${speedup.toFixed(2)}x`);

  // Verification
  if (resultStandard.key === resultOptimized.key) {
    console.log('✅ Accuracy Verified: Keys match.');
  } else {
    console.warn('❌ Accuracy Warning: Keys do not match!');
    console.log(`Standard: ${resultStandard.key}, Optimized: ${resultOptimized.key}`);
  }

  console.log('\n⚡ Verification Complete.');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
