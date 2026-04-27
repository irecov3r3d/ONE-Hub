
import { AudioAnalysisService } from '../audioAnalysisService';

// Mock Web Audio API
class MockAudioBuffer {
  duration = 10;
  sampleRate = 44100;
  numberOfChannels = 2;
  getChannelData = (i: number) => new Float32Array(44100 * 10).fill(0.1 * (i + 1));
}

(global as any).window = {
  AudioContext: class {
    decodeAudioData = async (data: any) => new MockAudioBuffer();
  }
};

(global as any).AudioBuffer = MockAudioBuffer;
(global as any).OfflineAudioContext = class {
  constructor() {}
  createBufferSource() {
    return {
      buffer: null,
      connect() {},
      start() {}
    };
  }
  createAnalyser() {
    return {
      fftSize: 0,
      frequencyBinCount: 1024,
      connect() {},
      getFloatFrequencyData(data: Float32Array) {
        data.fill(-50);
      }
    };
  }
  startRendering() {
    return Promise.resolve(new MockAudioBuffer());
  }
};

async function verify() {
  console.log('--- Verifying AudioAnalysisService Block Optimization ---');

  const service = new AudioAnalysisService();

  // Mock File
  const mockFile = {
    arrayBuffer: async () => new ArrayBuffer(1024),
    name: 'test.wav',
    size: 1024 * 1024
  } as any;

  console.time('Analysis Time');
  const result = await service.analyzeAudio(mockFile);
  console.timeEnd('Analysis Time');

  console.log('Loudness Points:', result.loudness.loudnessOverTime.length);
  console.log('Sections:', result.temporal.sections.length);
  console.log('Silent Sections:', result.quality.silentSections.length);

  // Verify loudness point data
  if (result.loudness.loudnessOverTime.length > 0) {
    const firstPoint = result.loudness.loudnessOverTime[0];
    console.log('First Loudness Point:', firstPoint);
    if (isNaN(firstPoint.lufs)) {
      throw new Error('Loudness calculation resulted in NaN');
    }
  }

  console.log('--- Verification Complete ---');
}

verify().catch(err => {
  console.error('Verification Failed:', err);
  process.exit(1);
});
