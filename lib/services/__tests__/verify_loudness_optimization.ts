
import { AudioAnalysisService } from '../audioAnalysisService';
import * as fs from 'fs';

// Mock Browser APIs
(globalThis as any).window = {
    AudioContext: class {
        createAnalyser() { return { fftSize: 2048, frequencyBinCount: 1024 }; }
    }
};
(globalThis as any).AudioContext = (globalThis as any).window.AudioContext;
(globalThis as any).OfflineAudioContext = class {};

async function testLoudnessOptimization() {
  console.log('🧪 Testing Loudness Analysis Optimization...');

  const service = new AudioAnalysisService();

  // Create a 10-second buffer at 44.1kHz
  const sampleRate = 44100;
  const length = sampleRate * 10;
  const mono = new Float32Array(length);

  // Fill with a simple sine wave that changes amplitude
  for (let i = 0; i < length; i++) {
    const amplitude = i < length / 2 ? 0.5 : 0.8;
    mono[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * amplitude;
  }

  // @ts-ignore - access private method for testing
  const points = service.calculateLoudnessOverTime(mono, sampleRate);

  console.log(`Generated ${points.length} loudness points.`);

  if (points.length === 0) {
    throw new Error('No loudness points generated');
  }

  // Verify first half (0.5 amplitude)
  const firstHalf = points.filter(p => p.time < 4);
  const avgLUFS1 = firstHalf.reduce((sum, p) => sum + p.lufs, 0) / firstHalf.length;
  console.log(`First half avg LUFS: ${avgLUFS1.toFixed(2)}`);

  // Verify second half (0.8 amplitude)
  const secondHalf = points.filter(p => p.time > 6);
  const avgLUFS2 = secondHalf.reduce((sum, p) => sum + p.lufs, 0) / secondHalf.length;
  console.log(`Second half avg LUFS: ${avgLUFS2.toFixed(2)}`);

  if (avgLUFS2 <= avgLUFS1) {
    throw new Error('Loudness did not increase as expected');
  }

  // Check peak values
  const peak1 = Math.max(...firstHalf.map(p => p.peak));
  const peak2 = Math.max(...secondHalf.map(p => p.peak));
  console.log(`Peak 1: ${peak1.toFixed(2)}, Peak 2: ${peak2.toFixed(2)}`);

  if (Math.abs(peak1 - 20 * Math.log10(0.5)) > 1) {
      throw new Error(`Peak 1 mismatch: ${peak1}`);
  }
  if (Math.abs(peak2 - 20 * Math.log10(0.8)) > 1) {
      throw new Error(`Peak 2 mismatch: ${peak2}`);
  }

  console.log('✅ Loudness Optimization Accuracy OK');
}

testLoudnessOptimization().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
