import { AudioAnalysisService } from '../audioAnalysisService';
import { performance } from 'perf_hooks';

async function verifySpectralSynergy() {
  console.log('⚡ Verifying Spectral Synergy (Integrated Key Detection)...');

  const sampleRate = 44100;
  const duration = 30; // 30 seconds
  const length = sampleRate * duration;
  const left = new Float32Array(length).fill(0).map(() => Math.random() * 2 - 1);
  const right = new Float32Array(length).fill(0).map(() => Math.random() * 2 - 1);

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 2,
    getChannelData: (ch: number) => (ch === 0 ? left : right),
  } as unknown as AudioBuffer;

  // Mock global window/AudioContext
  (global as any).window = { AudioContext: class {
    decodeAudioData = async () => mockAudioBuffer;
  } };
  (global as any).AudioContext = (global as any).window.AudioContext;

  const service = new AudioAnalysisService();

  console.log('\n--- Benchmarking Integrated Analysis ---');
  // We mock a file since analyzeAudio expects one
  const mockFile = {
    arrayBuffer: async () => new ArrayBuffer(0),
    name: 'test.wav',
    size: 1024 * 1024
  } as any;

  const start = performance.now();
  const result = await service.analyzeAudio(mockFile);
  const end = performance.now();

  console.log(`Full analysis (including key detection) took: ${(end - start).toFixed(2)}ms`);
  console.log(`Detected Key: ${result.musical.key} (Confidence: ${result.musical.keyConfidence.toFixed(2)})`);

  // Verify spectral reuse
  console.log(`Spectral bins: ${result.frequency.spectrum.length}`);

  console.log('\n⚡ Synergy Verification Complete.');
}

verifySpectralSynergy().catch(console.error);
