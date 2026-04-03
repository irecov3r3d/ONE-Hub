import { AudioMasteringService } from '../audioMasteringService';
import type { MasteringSettings } from '@/types';

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

async function testInPlaceMastering() {
  console.log('🧪 Starting In-Place Mastering Verification Test...');

  const service = new AudioMasteringService();
  const sampleRate = 44100;
  const length = 1024;
  const channels = [new Float32Array(length), new Float32Array(length)];

  // Fill with some data (sine wave)
  for (let i = 0; i < length; i++) {
    channels[0][i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    channels[1][i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
  }

  // Create copies for comparison
  const originalL = new Float32Array(channels[0]);
  const originalR = new Float32Array(channels[1]);

  console.log('1. Testing In-Place Compression...');
  const compSettings = [{
    id: 'test',
    enabled: true,
    threshold: -20,
    ratio: 4,
    attack: 10,
    release: 100,
    knee: 6,
    makeupGain: 0
  }];

  // @ts-ignore - access private method for testing
  const resultComp = service.applyCompression(channels, compSettings, sampleRate);

  if (resultComp !== channels) throw new Error('applyCompression did not return the same buffer instance');
  if (channels[0][100] === originalL[100]) throw new Error('applyCompression did not modify the buffer');
  console.log('✅ In-Place Compression OK');

  // Reset to original for next test
  channels[0].set(originalL);
  channels[1].set(originalR);

  console.log('2. Testing In-Place Limiting...');
  const limitSettings = {
    enabled: true,
    threshold: -6,
    ceiling: -1,
    release: 50,
    lookahead: 5,
    oversampling: 1
  };
  // @ts-ignore
  const resultLimit = service.applyLimiting(channels, limitSettings, sampleRate);

  if (resultLimit !== channels) throw new Error('applyLimiting did not return the same buffer instance');
  if (channels[0][100] === originalL[100]) throw new Error('applyLimiting did not modify the buffer');
  console.log('✅ In-Place Limiting OK');

  // Reset to original for next test
  channels[0].set(originalL);
  channels[1].set(originalR);

  console.log('3. Testing In-Place Exciter...');
  const exciterSettings = {
    enabled: true,
    amount: 50,
    harmonics: 2,
    mix: 50
  };
  // @ts-ignore
  const resultExciter = service.applyExciter(channels, exciterSettings);

  if (resultExciter !== channels) throw new Error('applyExciter did not return the same buffer instance');
  if (channels[0][100] === originalL[100]) throw new Error('applyExciter did not modify the buffer');
  console.log('✅ In-Place Exciter OK');

  // Reset to original for next test
  channels[0].set(originalL);
  channels[1].set(originalR);

  console.log('4. Testing In-Place Saturation...');
  const saturationSettings = {
    enabled: true,
    type: 'tape' as const,
    drive: 50,
    mix: 50
  };
  // @ts-ignore
  const resultSaturation = service.applySaturation(channels, saturationSettings);

  if (resultSaturation !== channels) throw new Error('applySaturation did not return the same buffer instance');
  if (channels[0][100] === originalL[100]) throw new Error('applySaturation did not modify the buffer');
  console.log('✅ In-Place Saturation OK');

  // Reset to original for next test
  channels[0].set(originalL);
  channels[1].set(originalR);

  console.log('5. Testing In-Place Dithering...');
  const ditheringSettings = {
    enabled: true,
    type: 'triangular' as const,
    depth: 16,
    noiseShaping: false
  };
  // @ts-ignore
  const resultDithering = service.applyDithering(channels, ditheringSettings);

  if (resultDithering !== channels) throw new Error('applyDithering did not return the same buffer instance');
  // Dithering might be random, but it should change the buffer
  if (channels[0][100] === originalL[100]) throw new Error('applyDithering did not modify the buffer');
  console.log('✅ In-Place Dithering OK');

  // Reset to original for next test
  channels[0].set(originalL);
  channels[1].set(originalR);

  console.log('6. Testing In-Place Mid/Side Processing...');
  const msSettings = {
    enabled: true,
    midGain: 2,
    sideGain: -2,
    stereoWidth: 120
  };
  // @ts-ignore
  const resultMS = service.applyMidSideProcessing(channels, msSettings);

  if (resultMS !== channels) throw new Error('applyMidSideProcessing did not return the same buffer instance');
  if (channels[0][100] === originalL[100]) throw new Error('applyMidSideProcessing did not modify the buffer');
  console.log('✅ In-Place Mid/Side OK');

  console.log('\n✨ ALL IN-PLACE MASTERING TESTS PASSED! ✨');
}

testInPlaceMastering().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
