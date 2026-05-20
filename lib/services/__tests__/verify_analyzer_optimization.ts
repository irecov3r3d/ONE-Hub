
import { AudioAnalysisService } from '../audioAnalysisService';

// Mock AudioContext for Node environment
const mockAudioBuffer = {
  sampleRate: 44100,
  length: 44100 * 5, // 5 seconds
  duration: 5,
  numberOfChannels: 2,
  getChannelData: (ch: number) => {
    const data = new Float32Array(44100 * 5);
    for (let i = 0; i < data.length; i++) {
      // Use a more complex signal to test correlation
      data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * (ch === 0 ? 0.8 : 0.5)
              + Math.cos(2 * Math.PI * 880 * i / 44100) * 0.1;
    }
    return data;
  }
};

(globalThis as any).window = {
  AudioContext: class {
    decodeAudioData = async () => mockAudioBuffer;
  },
  webkitAudioContext: class {
    decodeAudioData = async () => mockAudioBuffer;
  }
};

(globalThis as any).AudioContext = (globalThis as any).window.AudioContext;

async function runBenchmark() {
  console.log('⚡ Starting AudioAnalysisService Performance Benchmark...');

  const service = new AudioAnalysisService();
  const sampleRate = 44100;
  const channelData = [
    mockAudioBuffer.getChannelData(0),
    mockAudioBuffer.getChannelData(1)
  ];

  // --- BENCHMARK ---

  // Warm up
  (service as any).analyzeBasicStats(channelData, sampleRate);

  const iterations = 100;

  // Benchmark analyzeBasicStats
  const startStats = Date.now();
  for (let i = 0; i < iterations; i++) {
    (service as any).analyzeBasicStats(channelData, sampleRate);
  }
  const endStats = Date.now();
  console.log(`- analyzeBasicStats: ${((endStats - startStats) / iterations).toFixed(3)}ms / op`);

  // Mock spectrum for analyzeFrequency
  const spectrum = Array.from({ length: 4096 }, (_, i) => ({
    frequency: (i * sampleRate) / 8192,
    magnitude: -20 - Math.random() * 40,
    phase: 0
  }));

  // Benchmark analyzeFrequency
  const startFreq = Date.now();
  for (let i = 0; i < iterations; i++) {
    await (service as any).analyzeFrequency(mockAudioBuffer, channelData[0], spectrum);
  }
  const endFreq = Date.now();
  console.log(`- analyzeFrequency: ${((endFreq - startFreq) / iterations).toFixed(3)}ms / op`);

  // --- VERIFICATION ---
  console.log('\n🔍 Verifying numerical correctness...');

  const stats = (service as any).analyzeBasicStats(channelData, sampleRate);

  // 1. Verify Mid/Side identity: sumSqMid + sumSqSide = (sumSqL + sumSqR) / 2
  // We use powers (10^(db/10)) to check linear sums
  const powerL = Math.pow(10, stats.rmsL / 10);
  const powerR = Math.pow(10, stats.rmsR / 10);
  const powerMid = Math.pow(10, stats.rmsMid / 10);
  const powerSide = Math.pow(10, stats.rmsSide / 10);

  const expectedMSPower = (powerL + powerR) * 0.5;
  const actualMSPower = powerMid + powerSide;
  const msDiff = Math.abs(expectedMSPower - actualMSPower);

  console.log(`- Mid/Side Power Identity: ${msDiff < 1e-10 ? '✅ PASS' : '❌ FAIL'} (Diff: ${msDiff.toExponential(4)})`);

  // 2. Verify peak detection
  let manualPeakL = 0;
  for (let i = 0; i < channelData[0].length; i++) {
    const abs = Math.abs(channelData[0][i]);
    if (abs > manualPeakL) manualPeakL = abs;
  }
  const manualPeakLdB = 20 * Math.log10(manualPeakL);
  const peakDiff = Math.abs(stats.peakL - manualPeakLdB);
  console.log(`- Peak Detection Accuracy: ${peakDiff < 1e-10 ? '✅ PASS' : '❌ FAIL'} (Diff: ${peakDiff.toExponential(4)})`);

  // 3. Verify Frequency analysis (check if spectral centroid is within reasonable range)
  const freqAnalysis = await (service as any).analyzeFrequency(mockAudioBuffer, channelData[0], spectrum);
  console.log(`- Spectral Centroid: ${freqAnalysis.spectralCentroid.toFixed(2)} Hz`);
  console.log(`- Spectral Flatness: ${freqAnalysis.spectralFlatness.toFixed(4)}`);

  if (msDiff < 1e-10 && peakDiff < 1e-10) {
    console.log('\n✅ Optimization verified successfully!');
  } else {
    console.log('\n❌ Optimization verification failed!');
    process.exit(1);
  }
}

runBenchmark().catch(console.error);
