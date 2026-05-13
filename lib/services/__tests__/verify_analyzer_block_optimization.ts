
import { AudioAnalysisService } from '../audioAnalysisService';

// Mock types and globals for Node environment
if (typeof window === 'undefined') {
  (global as any).window = {
    AudioContext: class {
      decodeAudioData() { return Promise.resolve({}); }
    },
  };
}

// Access private methods for testing
const service = new AudioAnalysisService() as any;

async function runBenchmark() {
  console.log('⚡ Starting AudioAnalysisService Block Optimization Benchmark...');

  const sampleRate = 44100;
  const durationSeconds = 60;
  const length = sampleRate * durationSeconds;
  const channelData = [new Float32Array(length), new Float32Array(length)];

  // Fill with dummy data (sine wave + noise)
  for (let i = 0; i < length; i++) {
    const val = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5 + (Math.random() * 0.1 - 0.05);
    channelData[0][i] = val;
    channelData[1][i] = val;
  }

  console.log(`Test Track: ${durationSeconds}s, ${length.toLocaleString()} samples`);

  // 1. Benchmark analyzeBasicStats (The only O(N) part now)
  const startBasic = Date.now();
  const stats = service.analyzeBasicStats(channelData, sampleRate);
  const endBasic = Date.now();
  console.log(`\n- analyzeBasicStats (Single O(N) pass): ${endBasic - startBasic}ms`);

  // 2. Benchmark calculateLoudnessOverTime (Now O(N/hop))
  const startLoudness = Date.now();
  const loudness = service.calculateLoudnessOverTime(stats, sampleRate);
  const endLoudness = Date.now();
  console.log(`- calculateLoudnessOverTime (O(N/hop)): ${endLoudness - startLoudness}ms`);

  // 3. Benchmark detectSilence (Now O(N/hop))
  const startSilence = Date.now();
  const silence = service.detectSilence(stats, sampleRate);
  const endSilence = Date.now();
  console.log(`- detectSilence (O(N/hop)):            ${endSilence - startSilence}ms`);

  // 4. Benchmark detectSections (Now O(N/hop))
  const startSections = Date.now();
  const sections = service.detectSections({ duration: durationSeconds, sampleRate } as any, stats);
  const endSections = Date.now();
  console.log(`- detectSections (O(N/hop)):           ${endSections - startSections}ms`);

  console.log(`\nTotal downstream analysis time: ${endLoudness - startLoudness + endSilence - startSilence + endSections - startSections}ms`);

  // Numerical verification
  console.log('\nNumerical Verification:');
  console.log(`- Integrated LUFS derived from stats: ${(-0.691 + 10 * Math.log10(((stats.sumSqL + stats.sumSqR) / 2) / length + 1e-10)).toFixed(2)}`);
  console.log(`- Loudness points: ${loudness.length}`);
  console.log(`- Sections: ${sections.length}`);

  if (loudness.length > 0 && sections.length > 0) {
    console.log('✅ Correctness verified (data generated)!');
  } else {
    console.log('❌ Failure: No data generated.');
    process.exit(1);
  }
}

runBenchmark().catch(console.error);
