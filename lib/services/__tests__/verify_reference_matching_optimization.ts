import ReferenceMatchingService from '../referenceMatching';
import type { AudioAnalysisResult } from '@/types';

function createMockAnalysisResult(lufs: number, width: number, dr: number): AudioAnalysisResult {
  return {
    fileInfo: {
      fileName: 'test.wav',
      format: 'wav',
      duration: 180,
      sampleRate: 44100,
      bitDepth: 24,
      bitrate: 1411,
      channels: 2,
      fileSize: 31752000,
    },
    temporal: {
      bpm: 120,
      bpmConfidence: 0.95,
      timeSignature: { numerator: 4, denominator: 4, confidence: 0.9 },
      beats: [0.5, 1.0, 1.5],
      downbeats: [0.5],
      sections: [],
      onsets: [],
    },
    frequency: {
      spectrum: [],
      subBass: { range: [20, 60], avgMagnitude: -20, peakMagnitude: -12, rmsEnergy: -18, percentage: 15 },
      bass: { range: [60, 250], avgMagnitude: -15, peakMagnitude: -8, rmsEnergy: -14, percentage: 25 },
      lowMids: { range: [250, 500], avgMagnitude: -18, peakMagnitude: -10, rmsEnergy: -16, percentage: 20 },
      mids: { range: [500, 2000], avgMagnitude: -16, peakMagnitude: -9, rmsEnergy: -15, percentage: 22 },
      highMids: { range: [2000, 4000], avgMagnitude: -22, peakMagnitude: -14, rmsEnergy: -20, percentage: 10 },
      presence: { range: [4000, 6000], avgMagnitude: -28, peakMagnitude: -18, rmsEnergy: -25, percentage: 5 },
      brilliance: { range: [6000, 20000], avgMagnitude: -32, peakMagnitude: -22, rmsEnergy: -30, percentage: 3 },
      spectralCentroid: 2500,
      spectralRolloff: 8000,
      spectralFlux: 0.12,
      spectralFlatness: 0.05,
      dominantFrequencies: [],
    },
    loudness: {
      integratedLUFS: lufs,
      loudnessRange: 6,
      momentaryMaxLUFS: lufs + 2,
      shortTermMaxLUFS: lufs + 1,
      truePeakL: -0.5,
      truePeakR: -0.5,
      truePeakMax: -0.5,
      rmsL: lufs,
      rmsR: lufs,
      rmsMid: lufs,
      rmsSide: lufs - 6,
      peakL: -0.5,
      peakR: -0.5,
      crestFactor: dr,
      dynamicRange: dr,
      loudnessOverTime: [],
    },
    musical: {
      key: 'C Major',
      keyConfidence: 0.9,
      scale: 'Major',
      tempoStability: 0.98,
      tempoChanges: [],
      pitchClasses: [],
      rhythmComplexity: 0.4,
      syncopation: 0.2,
      energy: 0.8,
      danceability: 0.7,
      valence: 0.6,
      acousticness: 0.1,
      instrumentalness: 0.0,
    },
    stereo: {
      stereoWidth: width,
      phaseCorrelation: 0.85,
      panBalance: 0,
      midSideRatio: 1.5,
      sideContent: 30,
      stereoField: [],
    },
    harmonic: {
      fundamentalFreq: 261.63,
      harmonics: [],
      harmonicToNoiseRatio: 25,
      thd: 0.01,
      inharmonicity: 0.02,
      spectralContrast: [],
      mfcc: [],
    },
    spectral: {
      spectrogram: { times: [], frequencies: [], magnitudes: [] },
      frequencyBins: [],
      fftSize: 2048,
      hopSize: 512,
      windowType: 'hann',
      sampleRate: 44100,
      nyquistFreq: 22050,
    },
    quality: {
      clipping: false,
      clippedSamples: 0,
      clippingPercentage: 0,
      noiseFloor: -80,
      snr: 60,
      bitDepthUtilization: 95,
      dcOffsetL: 0,
      dcOffsetR: 0,
      silentSections: [],
      qualityScore: 92,
      issues: [],
    },
  };
}

async function runBenchmark() {
  console.log('🧪 Starting ReferenceMatchingService Optimization Benchmark...');

  const service = new ReferenceMatchingService();
  const target = createMockAnalysisResult(-12, 110, 8);
  const reference = createMockAnalysisResult(-14, 100, 10);

  // Correctness check
  const comparison = service.compareToReference(target, reference);
  console.log(`Overall Similarity: ${comparison.overallSimilarity.toFixed(2)}%`);
  console.log(`Action Plan Steps: ${comparison.actionPlan.length}`);
  if (typeof comparison.overallSimilarity === 'number' && comparison.actionPlan.length > 0) {
    console.log('✅ Correctness check passed!');
  } else {
    console.error('❌ Correctness check failed!');
    process.exit(1);
  }

  // Benchmark iterations
  const iterations = 100000;
  console.log(`\n--- Running ${iterations.toLocaleString()} comparison passes ---`);

  const startTime = performance.now();
  for (let i = 0; i < iterations; i++) {
    service.compareToReference(target, reference);
  }
  const endTime = performance.now();
  const totalTime = endTime - startTime;

  console.log(`Total Time: ${totalTime.toFixed(2)} ms`);
  console.log(`Time per call: ${(totalTime / iterations * 1000).toFixed(4)} µs`);
  console.log('\n✨ BENCHMARK COMPLETE! ✨');
}

runBenchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
