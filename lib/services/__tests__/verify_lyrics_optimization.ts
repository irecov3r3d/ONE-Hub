import { LyricsService } from '../lyricsService';

// Unoptimized baseline implementation of analyzeRhymeScheme
function baselineAnalyzeRhymeScheme(lyrics: string): string {
  const lines = lyrics.split('\n').filter(l => l.trim());
  const rhymeScheme: string[] = [];
  let currentLetter = 'A';

  // Helper method matching the original getLastWord
  const getLastWord = (line: string): string => {
    const words = line.trim().toLowerCase().replace(/[.,!?;:]/, '').split(' ');
    return words[words.length - 1] || '';
  };

  const doWordsRhyme = (word1: string, word2: string): boolean => {
    const minLength = Math.min(word1.length, word2.length);
    if (minLength < 2) return false;
    return word1.slice(-2) === word2.slice(-2);
  };

  // O(N^2) Simplified rhyme detection (original code)
  for (let i = 0; i < lines.length; i++) {
    const lastWord = getLastWord(lines[i]);
    let foundRhyme = false;

    for (let j = 0; j < i; j++) {
      const prevLastWord = getLastWord(lines[j]);
      if (doWordsRhyme(lastWord, prevLastWord)) {
        rhymeScheme.push(rhymeScheme[j]);
        foundRhyme = true;
        break;
      }
    }

    if (!foundRhyme) {
      rhymeScheme.push(currentLetter);
      currentLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
    }
  }

  return rhymeScheme.join('');
}

async function runBenchmark() {
  console.log('⚡ Starting Lyrics Rhyme Scheme Analyzer Performance Benchmark...');

  // Generate large mock lyrics of 600 lines
  const themes = ['love', 'life', 'dreams', 'roads', 'stars', 'night', 'sky', 'fire', 'ice', 'rain'];
  const endings = ['day', 'way', 'cold', 'told', 'bright', 'night', 'deep', 'keep', 'fire', 'desire'];
  const linesArray: string[] = [];

  for (let i = 0; i < 600; i++) {
    const theme = themes[i % themes.length];
    const ending = endings[i % endings.length];
    linesArray.push(`This is line number ${i} about our ${theme} and finding a ${ending}`);
  }
  const largeLyricsText = linesArray.join('\n');

  // Warmup
  baselineAnalyzeRhymeScheme(largeLyricsText);
  LyricsService.analyzeRhymeScheme(largeLyricsText);

  // Measure baseline O(N^2)
  const runs = 20;
  const startBaseline = performance.now();
  let baselineResult = '';
  for (let i = 0; i < runs; i++) {
    baselineResult = baselineAnalyzeRhymeScheme(largeLyricsText);
  }
  const endBaseline = performance.now();
  const baselineAvg = (endBaseline - startBaseline) / runs;

  // Measure optimized O(N)
  const startOptimized = performance.now();
  let optimizedResult = '';
  for (let i = 0; i < runs; i++) {
    optimizedResult = LyricsService.analyzeRhymeScheme(largeLyricsText);
  }
  const endOptimized = performance.now();
  const optimizedAvg = (endOptimized - startOptimized) / runs;

  const speedup = baselineAvg / (optimizedAvg || 1e-10);

  console.log(`\nResults (Lyrics Size: 600 lines):`);
  console.log(`- Baseline O(N^2) Array Splits:  ${baselineAvg.toFixed(3)}ms`);
  console.log(`- Bolt Optimized O(N) Cached:    ${optimizedAvg.toFixed(3)}ms`);
  console.log(`- Speedup:                      ${speedup.toFixed(2)}x`);

  // Correctness check
  console.log(`\nNumerical and Logical Verification:`);
  console.log(`- Baseline Output Length:  ${baselineResult.length}`);
  console.log(`- Optimized Output Length: ${optimizedResult.length}`);

  if (baselineResult === optimizedResult) {
    console.log(`✅ Correctness verified! Results are 100% identical.`);
  } else {
    console.error(`❌ Mismatch detected!`);
    console.log(`Baseline:  ${baselineResult.slice(0, 100)}`);
    console.log(`Optimized: ${optimizedResult.slice(0, 100)}`);
    process.exit(1);
  }
}

runBenchmark().catch(console.error);
