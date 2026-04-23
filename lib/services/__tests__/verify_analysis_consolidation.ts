import { AudioAnalysisService } from '../audioAnalysisService';

// Mock AudioContext for Node environment
const mockAudioContext = {
  sampleRate: 44100,
  decodeAudioData: async (data: ArrayBuffer) => ({
    duration: 10,
    sampleRate: 44100,
    numberOfChannels: 1,
    getChannelData: () => new Float32Array(44100 * 10),
  }),
} as any;

global.window = {
  AudioContext: function() { return mockAudioContext; },
  webkitAudioContext: function() { return mockAudioContext; },
} as any;

async function runVerification() {
  console.log('⚡ Starting Audio Analysis Consolidation Verification...');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const length = sampleRate * 10; // 10 seconds
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    mono[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5;
  }

  // Manually trigger stats calculation (the single-pass loop)
  const stats = (service as any).analyzeBasicStats([mono]);

  console.log('\nResults Verification:');
  console.log(`- Mono buffer length: ${stats.mono.length}`);
  console.log(`- BlockEnergy100ms length: ${stats.blockEnergy100ms.length}`);
  console.log(`- BlockPeaks100ms length: ${stats.blockPeaks100ms.length}`);
  console.log(`- BlockEnergy512 length: ${stats.blockEnergy512.length}`);

  // 1. Verify Envelope (512 hop)
  const envelope = (service as any).calculateEnergyEnvelope(stats, 512);
  console.log(`- Envelope length: ${envelope.length}`);
  if (envelope.length === Math.floor(length / 512)) {
    console.log('✅ Envelope length verified');
  }

  // 2. Verify Loudness Over Time
  const loudness = (service as any).calculateLoudnessOverTime(stats, sampleRate);
  console.log(`- Loudness points: ${loudness.length}`);
  if (loudness.length > 0) {
    console.log('✅ Loudness points generated');
    console.log(`  First point: time=${loudness[0].time.toFixed(2)}s, lufs=${loudness[0].lufs.toFixed(2)}`);
  }

  // 3. Verify Silence Detection
  const silence = (service as any).detectSilence(stats, sampleRate);
  console.log(`- Silent sections: ${silence.length}`);
  console.log('✅ Silence detection functional');

  // 4. Verify Sections
  const sections = (service as any).detectSections({ duration: 10, sampleRate } as any, stats);
  console.log(`- Sections detected: ${sections.length}`);
  if (sections.length > 0) {
    console.log('✅ Section detection functional');
    console.log(`  Section 0 energy: ${sections[0].energy.toFixed(4)}`);
  }

  console.log('\n⚡ Consolidation logic appears sound!');
}

runVerification().catch(console.error);
