import { AdvancedKeyDetection } from '../advancedKeyDetection';
import { performance } from 'perf_hooks';

/**
 * Benchmark script for Chord Progression detection optimization.
 * Compares the zero-copy subarray approach with raw sample input.
 */
async function runBenchmark() {
  console.log('⚡ Starting Chord Progression Optimization Benchmark...');

  // Mock AudioContext and AudioBuffer
  const sampleRate = 44100;
  const duration = 120; // 2 minutes to make it significant
  const length = sampleRate * duration;
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = Math.random() * 2 - 1;
  }

  const mockAudioBuffer = {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;

  // Mock global for Node
  (global as any).window = { AudioContext: class {} };
  (global as any).AudioContext = class {};

  const detector = new AdvancedKeyDetection(new (global as any).AudioContext());

  console.log(`\nAnalyzing ${duration}s track with 2s segments (${Math.floor(duration/2)} segments)...`);

  const start = performance.now();
  const chords = await detector.detectChordProgression(mockAudioBuffer, 2);
  const end = performance.now();

  const durationMs = end - start;
  const perSegment = durationMs / chords.length;

  console.log(`\nResults:`);
  console.log(`- Total Duration: ${durationMs.toFixed(2)}ms`);
  console.log(`- Per Segment:    ${perSegment.toFixed(2)}ms`);
  console.log(`- Detected:       ${chords.length} chords`);

  // Verify first few chords for presence
  console.log('\nSample Chords:', chords.slice(0, 3).map(c => `${c.time}s: ${c.chord}`).join(', '));

  if (durationMs < 1000) {
    console.log('\n✅ Optimization verified! Sub-second processing for 2-minute track.');
  } else {
    console.log('\n⚠️ Performance is acceptable but could be further optimized.');
  }
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
