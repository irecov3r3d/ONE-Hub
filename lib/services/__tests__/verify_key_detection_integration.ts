import { AudioAnalysisService } from '../audioAnalysisService';
import { performance } from 'perf_hooks';

/**
 * Verification script for AdvancedKeyDetection integration in AudioAnalysisService.
 */
async function runVerification() {
  console.log('⚡ Starting Key Detection Integration Verification...');

  const sampleRate = 44100;
  const duration = 5; // 5 seconds is enough for key detection
  const length = sampleRate * duration;

  const leftChannel = new Float32Array(length);
  const rightChannel = new Float32Array(length);

  // Fill with a 440Hz (A4) sine wave to see if it detects something related to A
  for (let i = 0; i < length; i++) {
    const s = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    leftChannel[i] = s;
    rightChannel[i] = s;
  }

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 2,
    getChannelData: (ch: number) => (ch === 0 ? leftChannel : rightChannel),
    copyFromChannel: (dest: Float32Array, ch: number) => dest.set(ch === 0 ? leftChannel : rightChannel),
  } as unknown as AudioBuffer;

  // Mock global window/AudioContext
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};

  const service = new AudioAnalysisService();

  console.log('\n--- Phase 1: Full Analysis (Key Detection Integrated) ---');
  const stats = (service as any).analyzeBasicStats([leftChannel, rightChannel], sampleRate);

  // Mock spectrum for frequency analysis
  const fftSize = 8192;
  const spectrum = new Array(fftSize / 2).fill(0).map((_, i) => ({
    frequency: (i * sampleRate) / fftSize,
    magnitude: -100, // Background noise
    phase: 0,
  }));

  // Set a peak at 440Hz
  const a4Bin = Math.round(440 * fftSize / sampleRate);
  spectrum[a4Bin].magnitude = 0;

  const startAnalysis = performance.now();
  const freqAnalysis = await (service as any).analyzeFrequency(mockAudioBuffer, stats.mono, spectrum);
  const musicalAnalysis = await (service as any).analyzeMusicalFeatures(mockAudioBuffer, stats, freqAnalysis.linearMagnitudes);
  const endAnalysis = performance.now();

  console.log(`Key Detected: ${musicalAnalysis.key}`);
  console.log(`Confidence: ${(musicalAnalysis.keyConfidence * 100).toFixed(1)}%`);
  console.log(`Analysis Duration: ${(endAnalysis - startAnalysis).toFixed(2)}ms`);

  if (musicalAnalysis.key.includes('A')) {
    console.log('✅ Key detection correctly identified A-related key for 440Hz input.');
  } else {
    console.log('⚠️ Key detection result:', musicalAnalysis.key);
  }

  console.log('\n⚡ Verification Complete.');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
