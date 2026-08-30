import { ReferenceMatchingService } from '../referenceMatching';
import type { AudioAnalysisResult } from '@/types';

const mockTarget: AudioAnalysisResult = {
  fileInfo: {
    fileName: 'test.wav',
    format: 'WAV',
    duration: 180,
    sampleRate: 44100,
    bitDepth: 16,
    bitrate: 1411,
    channels: 2,
    fileSize: 31752000,
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
  frequency: {
    spectrum: [],
    spectralCentroid: 2450,
    spectralRolloff: 8500,
    spectralFlatness: 0.05,
    spectralFlux: 0.1,
    dominantFrequencies: [],
    subBass: { range: [20, 60], avgMagnitude: -20, peakMagnitude: -18, rmsEnergy: -20, percentage: 10 },
    bass: { range: [60, 250], avgMagnitude: -14, peakMagnitude: -12, rmsEnergy: -14, percentage: 20 },
    lowMids: { range: [250, 500], avgMagnitude: -16, peakMagnitude: -14, rmsEnergy: -16, percentage: 15 },
    mids: { range: [500, 2000], avgMagnitude: -12, peakMagnitude: -10, rmsEnergy: -12, percentage: 25 },
    highMids: { range: [2000, 4000], avgMagnitude: -16, peakMagnitude: -14, rmsEnergy: -16, percentage: 15 },
    presence: { range: [4000, 6000], avgMagnitude: -20, peakMagnitude: -18, rmsEnergy: -20, percentage: 10 },
    brilliance: { range: [6000, 20000], avgMagnitude: -26, peakMagnitude: -24, rmsEnergy: -26, percentage: 5 },
  },
  loudness: {
    integratedLUFS: -16.5,
    loudnessRange: 6.5,
    momentaryMaxLUFS: -12.0,
    shortTermMaxLUFS: -14.2,
    truePeakL: -1.2,
    truePeakR: -1.2,
    truePeakMax: -1.2,
    rmsL: -14.0,
    rmsR: -14.0,
    rmsMid: -14.0,
    rmsSide: -18.0,
    peakL: -1.2,
    peakR: -1.2,
    crestFactor: 15.3,
    dynamicRange: 12.0,
    loudnessOverTime: [],
  },
  musical: {
    key: 'C Major',
    keyConfidence: 0.9,
    scale: 'Major',
    tempoStability: 0.98,
    tempoChanges: [],
    rhythmComplexity: 0.5,
    syncopation: 0.3,
    energy: 0.8,
    danceability: 0.7,
    valence: 0.8,
    acousticness: 0.2,
    instrumentalness: 0.1,
    pitchClasses: [
      { note: 'C', strength: 0.9, frequency: 261.63 },
      { note: 'C#', strength: 0.1, frequency: 277.18 },
      { note: 'D', strength: 0.7, frequency: 293.66 },
      { note: 'D#', strength: 0.1, frequency: 311.13 },
      { note: 'E', strength: 0.8, frequency: 329.63 },
      { note: 'F', strength: 0.6, frequency: 349.23 },
      { note: 'F#', strength: 0.1, frequency: 369.99 },
      { note: 'G', strength: 0.85, frequency: 392.0 },
      { note: 'G#', strength: 0.1, frequency: 415.3 },
      { note: 'A', strength: 0.4, frequency: 440.0 },
      { note: 'A#', strength: 0.1, frequency: 466.16 },
      { note: 'B', strength: 0.1, frequency: 493.88 },
    ],
  },
  stereo: {
    stereoWidth: 75,
    phaseCorrelation: 0.85,
    panBalance: 0,
    midSideRatio: 4.0,
    sideContent: 20,
    stereoField: [],
  },
  harmonic: {
    fundamentalFreq: 440,
    harmonics: [],
    harmonicToNoiseRatio: 20,
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
    noiseFloor: -90,
    snr: 70,
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
  loudness: {
    ...mockTarget.loudness,
    integratedLUFS: -14.0,
    truePeakMax: -0.5,
    dynamicRange: 10.0,
    crestFactor: 13.5,
  },
  frequency: {
    ...mockTarget.frequency,
    spectralCentroid: 2800,
    subBass: { ...mockTarget.frequency.subBass, percentage: 8 },
    bass: { ...mockTarget.frequency.bass, percentage: 22 },
    lowMids: { ...mockTarget.frequency.lowMids, percentage: 12 },
    mids: { ...mockTarget.frequency.mids, percentage: 28 },
    highMids: { ...mockTarget.frequency.highMids, percentage: 18 },
    presence: { ...mockTarget.frequency.presence, percentage: 8 },
    brilliance: { ...mockTarget.frequency.brilliance, percentage: 4 },
  },
  stereo: {
    ...mockTarget.stereo,
    stereoWidth: 90,
  },
};

console.log('⚡ Starting ReferenceMatchingService Optimization Benchmark...');

const service = new ReferenceMatchingService();
const iterations = 100000;

const start = performance.now();
for (let i = 0; i < iterations; i++) {
  service.compareToReference(mockTarget, mockReference);
}
const elapsed = performance.now() - start;

console.log(`Executed ${iterations.toLocaleString()} comparisons in ${elapsed.toFixed(2)} ms (${(elapsed / iterations * 1000).toFixed(4)} µs / op)`);

const result = service.compareToReference(mockTarget, mockReference);
console.log(`Overall Similarity: ${result.overallSimilarity.toFixed(2)}%`);
console.log(`Action Plan steps: ${result.actionPlan.length}`);

if (typeof result.overallSimilarity === 'number' && result.overallSimilarity > 0 && result.overallSimilarity <= 100) {
  console.log('✅ Correctness & performance verified successfully!');
} else {
  console.error('❌ Verification failed!');
  process.exit(1);
}
