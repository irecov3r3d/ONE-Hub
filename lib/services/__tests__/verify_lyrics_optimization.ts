import { LyricsService } from '../lyricsService';

/**
 * Baseline/Legacy analyzeRhymeScheme implementation doing O(N^2) getLastWord calls.
 */
function baselineAnalyzeRhymeScheme(lyrics: string): string {
  const lines = lyrics.split('\n').filter(l => l.trim());
  const rhymeScheme: string[] = [];
  let currentLetter = 'A';

  const getLastWord = (line: string): string => {
    const words = line.trim().toLowerCase().replace(/[.,!?;:]/, '').split(' ');
    return words[words.length - 1] || '';
  };

  const doWordsRhyme = (word1: string, word2: string): boolean => {
    const minLength = Math.min(word1.length, word2.length);
    if (minLength < 2) return false;
    const ending1 = word1.slice(-2);
    const ending2 = word2.slice(-2);
    return ending1 === ending2;
  };

  // Simplified rhyme detection
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
  console.log('🧪 Starting Lyrics Rhyme Scheme Analyzer Optimization Benchmark...\n');

  // Let's construct a synthetic lyrics set with 150 lines to emphasize O(N^2) complexity
  const repeatingStanza = [
    "Walking down the road of dream",
    "Finding my way in the night",
    "Every step closer it will seem",
    "Underneath the neon light",
    "The world is spinning round and round",
    "But we are safe and sound",
    "On this solid ground",
    "Letting the sweet music sound",
    "So look up to the sky above",
    "And feel the power of true love",
  ];

  const lines: string[] = [];
  for (let i = 0; i < 20; i++) { // 200 lines total
    lines.push(...repeatingStanza);
  }
  const lyrics = lines.join('\n');

  console.log(`Lyrics dataset size: ${lines.length} lines`);

  // Warm up
  baselineAnalyzeRhymeScheme(lyrics);
  LyricsService.analyzeRhymeScheme(lyrics);

  const iterations = 50;

  // 1. Benchmark Baseline
  const startBaseline = Date.now();
  for (let i = 0; i < iterations; i++) {
    baselineAnalyzeRhymeScheme(lyrics);
  }
  const endBaseline = Date.now();
  const baselineTime = (endBaseline - startBaseline) / iterations;

  // 2. Benchmark Optimized (Bolt pre-calculated lastWords)
  const startOptimized = Date.now();
  for (let i = 0; i < iterations; i++) {
    LyricsService.analyzeRhymeScheme(lyrics);
  }
  const endOptimized = Date.now();
  const optimizedTime = (endOptimized - startOptimized) / iterations;

  console.log(`\nResults:`);
  console.log(`- Baseline O(N^2) analyzeRhymeScheme: ${baselineTime.toFixed(3)}ms / op`);
  console.log(`- Bolt Optimized O(N) analyzeRhymeScheme:  ${optimizedTime.toFixed(3)}ms / op`);
  console.log(`- Speedup:                             ${(baselineTime / (optimizedTime || 1)).toFixed(2)}x`);

  // 3. Correctness Verification
  console.log('\n🔍 Verifying correctness...');
  const baselineResult = baselineAnalyzeRhymeScheme(lyrics);
  const optimizedResult = LyricsService.analyzeRhymeScheme(lyrics);

  if (baselineResult === optimizedResult) {
    console.log('✅ Correctness verified! Optimized O(N) implementation is 100% numerically identical to baseline.');
  } else {
    console.error('❌ Mismatch detected!');
    console.error(`  Expected: "${baselineResult.substring(0, 100)}..."`);
    console.error(`  Got:      "${optimizedResult.substring(0, 100)}..."`);
    process.exit(1);
  }
}

runBenchmark().catch(console.error);
