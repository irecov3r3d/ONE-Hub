import BatchProcessingService from '../batchProcessing';

class MockAudioContext {}
(global as any).window = { AudioContext: MockAudioContext };

function createMockResult(index: number) {
  return {
    fileInfo: {
      fileName: `track_${index}.mp3`,
      duration: 180.45,
    },
    loudness: {
      integratedLUFS: -14.2,
      truePeakMax: -0.8,
      dynamicRange: 9.1,
    },
    temporal: {
      bpm: 124,
    },
    musical: {
      key: 'C Major',
    },
    stereo: {
      stereoWidth: 105,
    },
    quality: {
      qualityScore: 88,
      issues: [{ type: 'clipping' }],
    },
  } as any;
}

function runVerification() {
  console.log('🧪 Starting Batch CSV Export Optimization Verification...');

  const batchService = new BatchProcessingService();
  const mockResults = new Map<string, any>();

  // Add 1000 mock audio analysis results
  const TOTAL_TRACKS = 1000;
  for (let i = 0; i < TOTAL_TRACKS; i++) {
    const fileName = `track_${i}.mp3`;
    mockResults.set(fileName, createMockResult(i));
  }

  (batchService as any).activeJobs.set('benchmark_job', {
    id: 'benchmark_job',
    files: [],
    results: mockResults,
    errors: new Map(),
    startTime: new Date(),
    endTime: new Date(),
  });

  // Benchmark Optimized implementation
  const ITERATIONS = 100;
  const startOpt = performance.now();
  let csvOpt = '';
  for (let i = 0; i < ITERATIONS; i++) {
    csvOpt = batchService.exportBatchResultsCSV('benchmark_job');
  }
  const durationOpt = performance.now() - startOpt;

  console.log(`⚡ Exported CSV for ${TOTAL_TRACKS} tracks (${ITERATIONS} runs): ${durationOpt.toFixed(2)}ms`);

  // Verify structure & parity
  const lines = csvOpt.split('\n');
  if (lines.length !== TOTAL_TRACKS + 1) {
    throw new Error(`Expected ${TOTAL_TRACKS + 1} lines in CSV, got ${lines.length}`);
  }

  const expectedHeader = 'File Name,Duration (s),BPM,Key,LUFS,True Peak (dBTP),Dynamic Range (dB),Quality Score,Stereo Width (%),Issues';
  if (lines[0] !== expectedHeader) {
    throw new Error(`Header mismatch!\nExpected: ${expectedHeader}\nGot: ${lines[0]}`);
  }

  const expectedFirstRow = 'track_0.mp3,180.45,124,C Major,-14.2,-0.8,9.1,88,105,1';
  if (lines[1] !== expectedFirstRow) {
    throw new Error(`First row mismatch!\nExpected: ${expectedFirstRow}\nGot: ${lines[1]}`);
  }

  console.log('✅ Structure, formatting, and numerical parity verified successfully!');
}

runVerification();
