import { LyricsService } from '../lyricsService';

function runLyricsBenchmark() {
  console.log('⚡ Starting LyricsService.analyzeRhymeScheme Performance Benchmark...');

  // 1. Correctness check
  const testLyrics = `Walking down the road of dreams
Finding my way through the night
Every step brings me closer to the beams
To the dreams that shine so bright`;

  const scheme = LyricsService.analyzeRhymeScheme(testLyrics);
  console.log(`Computed scheme: ${scheme}`);
  const expectedScheme = 'ABAB';

  if (scheme !== expectedScheme) {
    console.error(`❌ Correctness verification failed! Expected: ${expectedScheme}, Got: ${scheme}`);
    process.exit(1);
  }
  console.log('✅ Correctness verified!');

  // 2. Performance benchmark
  // Generate a mock lyric book of 1000 lines
  const numLines = 1000;
  const lines: string[] = [];
  const words = ['beams', 'night', 'dreams', 'bright', 'climb', 'time', 'flow', 'glow', 'sound', 'round'];
  for (let i = 0; i < numLines; i++) {
    const endWord = words[i % words.length];
    lines.push(`This is line ${i} that ends with ${endWord}`);
  }
  const largeLyrics = lines.join('\n');

  // Benchmark baseline (recreating the unoptimized logic using the internal helpers)
  const startBaseline = performance.now();
  // Simulate baseline: we run a duplicate of the original unoptimized loop
  const baselineRhymeScheme: string[] = [];
  let baselineCurrentLetter = 'A';
  const parsedLines = largeLyrics.split('\n').filter(l => l.trim());
  for (let i = 0; i < parsedLines.length; i++) {
    // Redundant extraction inside loop (original implementation)
    const lastWord = parsedLines[i].trim().toLowerCase().replace(/[.,!?;:]/, '').split(' ').slice(-1)[0] || '';
    let foundRhyme = false;

    for (let j = 0; j < i; j++) {
      const prevLastWord = parsedLines[j].trim().toLowerCase().replace(/[.,!?;:]/, '').split(' ').slice(-1)[0] || '';

      const minLength = Math.min(lastWord.length, prevLastWord.length);
      const doRhyme = minLength >= 2 && lastWord.slice(-2) === prevLastWord.slice(-2);

      if (doRhyme) {
        baselineRhymeScheme.push(baselineRhymeScheme[j]);
        foundRhyme = true;
        break;
      }
    }

    if (!foundRhyme) {
      baselineRhymeScheme.push(baselineCurrentLetter);
      baselineCurrentLetter = String.fromCharCode(baselineCurrentLetter.charCodeAt(0) + 1);
    }
  }
  const baselineResult = baselineRhymeScheme.join('');
  const endBaseline = performance.now();
  const baselineTime = endBaseline - startBaseline;

  // Benchmark Bolt Optimized
  const startOptimized = performance.now();
  const optimizedResult = LyricsService.analyzeRhymeScheme(largeLyrics);
  const endOptimized = performance.now();
  const optimizedTime = endOptimized - startOptimized;

  console.log('\nResults (1000 lines):');
  console.log(`- Baseline (O(N^2) Parsing): ${baselineTime.toFixed(3)}ms`);
  console.log(`- Bolt Optimized (O(N)):      ${optimizedTime.toFixed(3)}ms`);

  const speedup = baselineTime / optimizedTime;
  console.log(`- Speedup:                   ${speedup.toFixed(2)}x`);

  if (baselineResult !== optimizedResult) {
    console.error('❌ Results mismatch between baseline and optimized!');
    process.exit(1);
  }
  console.log('✅ Optimization results are identical and correct!');
}

runLyricsBenchmark();
