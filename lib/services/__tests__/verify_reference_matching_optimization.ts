import ReferenceMatchingService from '../referenceMatching';
import type { AudioAnalysisResult, FrequencyBandDetail } from '@/types';

function createBandDetail(seed: number, basePct: number): FrequencyBandDetail {
  return {
    range: [20, 20000],
    avgMagnitude: -20,
    peakMagnitude: -6,
    rmsEnergy: -18,
    percentage: basePct + seed,
  };
}

function createMockAnalysis(seed: number): AudioAnalysisResult {
  return {
    fileInfo: {
      fileName: `track_${seed}.wav`,
      format: 'wav',
      duration: 180,
      sampleRate: 44100,
      channels: 2,
      bitDepth: 16,
      bitrate: 1411,
      fileSize: 100000,
    },
    loudness: {
      integratedLUFS: -14 + seed,
      loudnessRange: 6,
      momentaryMaxLUFS: -10,
      shortTermMaxLUFS: -12,
      truePeakL: -1.0,
      truePeakR: -1.0,
      truePeakMax: -1 + (seed * 0.1),
      rmsL: -16,
      rmsR: -16,
      rmsMid: -16,
      rmsSide: -20,
      peakL: -1.2,
      peakR: -1.2,
      crestFactor: 12 + seed,
      dynamicRange: 10 + seed,
      loudnessOverTime: [],
    },
    frequency: {
      spectrum: [],
      subBass: createBandDetail(seed, 10),
      bass: createBandDetail(seed, 20),
      lowMids: createBandDetail(0, 15),
      mids: createBandDetail(-seed, 25),
      highMids: createBandDetail(0, 15),
      presence: createBandDetail(0, 10),
      brilliance: createBandDetail(0, 5),
      spectralCentroid: 2500 + (seed * 100),
      spectralRolloff: 8000,
      spectralFlux: 0.1,
      spectralFlatness: 0.2,
      dominantFrequencies: [],
    },
    stereo: {
      stereoWidth: 80 + seed,
      phaseCorrelation: 0.9,
      panBalance: 0,
      midSideRatio: 1.5,
      sideContent: 30,
      stereoField: [],
    },
    musical: {
      key: 'C Major',
      keyConfidence: 0.9,
      scale: 'Major',
      tempoStability: 0.95,
      tempoChanges: [],
      pitchClasses: [],
      rhythmComplexity: 0.5,
      syncopation: 0.3,
      energy: 0.8,
      danceability: 0.7,
      valence: 0.6,
      acousticness: 0.2,
      instrumentalness: 0.1,
    },
    harmonic: {
      fundamentalFreq: 440,
      harmonics: [],
      harmonicToNoiseRatio: 20,
      thd: 0.01,
      inharmonicity: 0.05,
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
      qualityScore: 85,
      issues: [],
    },
    temporal: {
      bpm: 120,
      bpmConfidence: 0.95,
      timeSignature: { numerator: 4, denominator: 4, confidence: 0.9 },
      beats: [],
      downbeats: [],
      sections: [],
      onsets: [],
    },
  };
}

async function runBenchmark() {
  console.log('🧪 Starting ReferenceMatchingService Optimization Benchmark...');

  const service = new ReferenceMatchingService();
  const target = createMockAnalysis(1);
  const reference = createMockAnalysis(3);

  // Correctness Check
  const result = service.compareToReference(target, reference);

  console.log('Overall Similarity Score:', result.overallSimilarity);
  console.log('Action Plan Steps:', result.actionPlan.length);
  console.log('Matching Preset Limit Ceiling:', result.matchingPreset.limiting.ceiling);

  if (typeof result.overallSimilarity !== 'number' || isNaN(result.overallSimilarity)) {
    console.error('❌ Correctness check failed: invalid similarity score');
    process.exit(1);
  }
  console.log('✅ Correctness check passed!');

  // Performance Benchmark
  const iterations = 50000;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    service.compareToReference(target, reference);
  }
  const end = performance.now();

  const totalTime = end - start;
  const timePerCallMicroseconds = (totalTime / iterations) * 1000;

  console.log(`\n--- Benchmarking ${iterations} iterations ---`);
  console.log(`Total Time:            ${totalTime.toFixed(2)}ms`);
  console.log(`Average Time Per Call: ${timePerCallMicroseconds.toFixed(3)} µs`);
  console.log('✨ BENCHMARK COMPLETE! ✨');
}

runBenchmark();
