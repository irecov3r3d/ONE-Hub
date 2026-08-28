import { ReferenceMatchingService } from '../referenceMatching';
import type { AudioAnalysisResult } from '@/types';

// Create realistic dummy target & reference analysis objects matching exact interface types
const mockTarget: AudioAnalysisResult = {
  fileInfo: {
    fileName: 'target.wav',
    format: 'wav',
    duration: 180,
    sampleRate: 44100,
    bitDepth: 24,
    bitrate: 2116,
    channels: 2,
    fileSize: 30000000,
  },
  loudness: {
    integratedLUFS: -16.5,
    loudnessRange: 5.2,
    momentaryMaxLUFS: -12.0,
    shortTermMaxLUFS: -14.0,
    truePeakL: -0.9,
    truePeakR: -0.8,
    truePeakMax: -0.8,
    rmsL: -18.0,
    rmsR: -17.8,
    rmsMid: -17.0,
    rmsSide: -24.0,
    peakL: -0.9,
    peakR: -0.8,
    crestFactor: 12.1,
    dynamicRange: 14.2,
    loudnessOverTime: [],
  },
  frequency: {
    spectrum: [],
    subBass: { range: [20, 60], avgMagnitude: -20, peakMagnitude: -10, rmsEnergy: -18, percentage: 12 },
    bass: { range: [60, 250], avgMagnitude: -15, peakMagnitude: -6, rmsEnergy: -12, percentage: 22 },
    lowMids: { range: [250, 500], avgMagnitude: -18, peakMagnitude: -8, rmsEnergy: -15, percentage: 18 },
    mids: { range: [500, 2000], avgMagnitude: -16, peakMagnitude: -7, rmsEnergy: -14, percentage: 20 },
    highMids: { range: [2000, 4000], avgMagnitude: -22, peakMagnitude: -12, rmsEnergy: -20, percentage: 14 },
    presence: { range: [4000, 6000], avgMagnitude: -26, peakMagnitude: -16, rmsEnergy: -24, percentage: 9 },
    brilliance: { range: [6000, 20000], avgMagnitude: -30, peakMagnitude: -20, rmsEnergy: -28, percentage: 5 },
    spectralCentroid: 2400,
    spectralRolloff: 8000,
    spectralFlux: 0.2,
    spectralFlatness: 0.15,
    dominantFrequencies: [],
  },
  stereo: {
    stereoWidth: 105,
    phaseCorrelation: 0.85,
    panBalance: 0,
    midSideRatio: 1.5,
    sideContent: 30,
    stereoField: [],
  },
  temporal: {
    bpm: 120,
    bpmConfidence: 0.9,
    timeSignature: { numerator: 4, denominator: 4, confidence: 0.95 },
    beats: [],
    downbeats: [],
    sections: [],
    onsets: [],
  },
  musical: {
    key: 'C Major',
    keyConfidence: 0.92,
    scale: 'Major',
    tempoStability: 0.95,
    tempoChanges: [],
    pitchClasses: [],
    rhythmComplexity: 0.5,
    syncopation: 0.3,
    energy: 0.7,
    danceability: 0.8,
    valence: 0.6,
    acousticness: 0.2,
    instrumentalness: 0.1,
  },
  harmonic: {
    fundamentalFreq: 261.63,
    harmonics: [],
    harmonicToNoiseRatio: 25,
    thd: 0.5,
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
    qualityScore: 88,
    issues: [],
  },
};

const mockReference: AudioAnalysisResult = {
  ...mockTarget,
  fileInfo: {
    ...mockTarget.fileInfo,
    fileName: 'reference.wav',
  },
  loudness: {
    ...mockTarget.loudness,
    integratedLUFS: -12.0,
    truePeakMax: -0.3,
    dynamicRange: 9.5,
    crestFactor: 8.5,
  },
  frequency: {
    ...mockTarget.frequency,
    subBass: { ...mockTarget.frequency.subBass, percentage: 15 },
    bass: { ...mockTarget.frequency.bass, percentage: 25 },
    lowMids: { ...mockTarget.frequency.lowMids, percentage: 15 },
    mids: { ...mockTarget.frequency.mids, percentage: 22 },
    highMids: { ...mockTarget.frequency.highMids, percentage: 12 },
    presence: { ...mockTarget.frequency.presence, percentage: 7 },
    brilliance: { ...mockTarget.frequency.brilliance, percentage: 4 },
    spectralCentroid: 2100,
  },
  stereo: {
    ...mockTarget.stereo,
    stereoWidth: 125,
  },
};

console.log('🧪 Starting ReferenceMatchingService Optimization Benchmark...');

const service = new ReferenceMatchingService();

// Run once to verify structure & values
const result = service.compareToReference(mockTarget, mockReference);

console.log(`Overall Similarity: ${result.overallSimilarity.toFixed(2)}%`);
console.log(`LUFS Difference: ${result.differences.loudness.lufsDiff.toFixed(2)} LUFS`);
console.log(`Action plan steps count: ${result.actionPlan.length}`);

// Measure execution time over 100,000 iterations
const ITERATIONS = 100_000;

const startTime = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  service.compareToReference(mockTarget, mockReference);
}
const endTime = performance.now();

const durationMs = endTime - startTime;
const avgTimeUs = (durationMs / ITERATIONS) * 1000;

console.log(`\n--- Benchmark Results ---`);
console.log(`Processed ${ITERATIONS.toLocaleString()} track comparisons in ${durationMs.toFixed(2)}ms`);
console.log(`Average time per comparison: ${avgTimeUs.toFixed(3)} µs`);
console.log('✨ BENCHMARK COMPLETE! ✨');
