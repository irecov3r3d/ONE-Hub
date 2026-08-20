import DAWExportService from '../dawExport';
import type { MasteringSettings, AudioAnalysisResult } from '@/types';

function runBenchmark() {
  console.log('⚡ Starting DAW Export Performance Verification...');

  const dawExport = new DAWExportService();

  const dummySettings: MasteringSettings = {
    targetLUFS: -14,
    truePeakLimit: -1.0,
    eqBands: [
      { id: '1', frequency: 60, gain: -1.5, q: 0.7, type: 'lowShelf', enabled: true },
      { id: '2', frequency: 250, gain: -2.0, q: 1.0, type: 'bell', enabled: true },
      { id: '3', frequency: 1000, gain: 0.5, q: 1.2, type: 'bell', enabled: true },
      { id: '4', frequency: 4000, gain: 1.0, q: 0.8, type: 'bell', enabled: true },
      { id: '5', frequency: 10000, gain: 1.5, q: 0.7, type: 'highShelf', enabled: true },
    ],
    compression: [
      { id: 'comp1', enabled: true, threshold: -18, ratio: 2.5, attack: 15, release: 120, knee: 4, makeupGain: 2 }
    ],
    limiting: { enabled: true, threshold: -1.0, ceiling: -0.3, release: 50, lookahead: 5, oversampling: 4 },
    stereoWidth: 110,
    midSideProcessing: { enabled: true, midGain: 0, sideGain: 1.5, stereoWidth: 110 },
  };

  const dummyAnalysis: AudioAnalysisResult = {
    fileInfo: {
      fileName: 'test_track_master.wav',
      format: 'WAV',
      duration: 180,
      sampleRate: 44100,
      bitDepth: 24,
      bitrate: 2116,
      channels: 2,
      fileSize: 31752000,
      codec: 'PCM',
    },
    temporal: {
      bpm: 120,
      bpmConfidence: 0.95,
      timeSignature: { numerator: 4, denominator: 4, confidence: 0.9 },
      beats: [0, 0.5, 1.0, 1.5],
      downbeats: [0],
      sections: [],
      onsets: [0, 0.5, 1.0],
    },
    frequency: {
      spectrum: [],
      subBass: { range: [20, 60], avgMagnitude: -20, peakMagnitude: -10, rmsEnergy: -15, percentage: 10 },
      bass: { range: [60, 250], avgMagnitude: -18, peakMagnitude: -8, rmsEnergy: -12, percentage: 25 },
      lowMids: { range: [250, 500], avgMagnitude: -22, peakMagnitude: -12, rmsEnergy: -18, percentage: 15 },
      mids: { range: [500, 2000], avgMagnitude: -20, peakMagnitude: -10, rmsEnergy: -14, percentage: 30 },
      highMids: { range: [2000, 4000], avgMagnitude: -24, peakMagnitude: -14, rmsEnergy: -19, percentage: 10 },
      presence: { range: [4000, 6000], avgMagnitude: -28, peakMagnitude: -18, rmsEnergy: -22, percentage: 6 },
      brilliance: { range: [6000, 20000], avgMagnitude: -32, peakMagnitude: -22, rmsEnergy: -26, percentage: 4 },
      spectralCentroid: 2500,
      spectralRolloff: 8500,
      spectralFlux: 0.05,
      spectralFlatness: 0.1,
      dominantFrequencies: [],
    },
    loudness: {
      integratedLUFS: -14.2,
      loudnessRange: 6.5,
      momentaryMaxLUFS: -11.0,
      shortTermMaxLUFS: -12.5,
      truePeakL: -0.8,
      truePeakR: -0.7,
      truePeakMax: -0.7,
      rmsL: -14.5,
      rmsR: -14.3,
      rmsMid: -14.0,
      rmsSide: -18.0,
      peakL: -0.8,
      peakR: -0.7,
      crestFactor: 13.5,
      dynamicRange: 12.0,
      loudnessOverTime: [],
    },
    musical: {
      key: 'A Minor',
      keyConfidence: 0.9,
      scale: 'Minor',
      tempoStability: 0.98,
      tempoChanges: [],
      pitchClasses: [],
      rhythmComplexity: 0.5,
      syncopation: 0.3,
      energy: 0.8,
      danceability: 0.75,
      valence: 0.6,
      acousticness: 0.2,
      instrumentalness: 0.8,
    },
    stereo: {
      stereoWidth: 110,
      phaseCorrelation: 0.85,
      panBalance: 0,
      midSideRatio: 2.5,
      sideContent: 25,
      stereoField: [],
    },
    harmonic: {
      fundamentalFreq: 220,
      harmonics: [],
      harmonicToNoiseRatio: 25,
      thd: 0.05,
      inharmonicity: 0.01,
      spectralContrast: [0.5],
      mfcc: [],
    },
    spectral: {
      spectrogram: { times: [], frequencies: [], magnitudes: [] },
      frequencyBins: [],
      fftSize: 2048,
      hopSize: 512,
      windowType: 'Hann',
      sampleRate: 44100,
      nyquistFreq: 22050,
    },
    quality: {
      clipping: false,
      clippedSamples: 0,
      clippingPercentage: 0,
      noiseFloor: -85,
      snr: 70.8,
      bitDepthUtilization: 95,
      dcOffsetL: 0,
      dcOffsetR: 0,
      silentSections: [],
      qualityScore: 98,
      issues: [],
    },
    masteringSuggestions: {
      needsNormalization: false,
      targetLUFS: -14,
      eqSuggestions: [],
      recommendations: [],
    },
  };

  const iterations = 50000;

  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    dawExport.exportForLogicPro(dummySettings, dummyAnalysis);
    dawExport.exportForProTools(dummySettings, dummyAnalysis);
    dawExport.exportUniversalCSV(dummySettings, dummyAnalysis);
  }
  const end = Date.now();
  const totalMs = end - start;

  console.log(`Executed ${iterations * 3} exports in ${totalMs}ms (${(totalMs / iterations).toFixed(4)}ms per iteration).`);

  // Correctness sanity check
  const logicXml = dawExport.exportForLogicPro(dummySettings, dummyAnalysis);
  const proToolsTxt = dawExport.exportForProTools(dummySettings, dummyAnalysis);
  const csvData = dawExport.exportUniversalCSV(dummySettings, dummyAnalysis);

  if (!logicXml.includes('<ChannelEQ') || !proToolsTxt.includes('=== PRO TOOLS') || !csvData.includes('Target LUFS')) {
    console.error('❌ Correctness check failed!');
    process.exit(1);
  }

  console.log('✅ Correctness and performance verification complete!');
}

runBenchmark();
