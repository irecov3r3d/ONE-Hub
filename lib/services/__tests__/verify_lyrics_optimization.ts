import { LyricsService } from '../lyricsService';

// Reference original implementation
function originalAnalyzeRhymeScheme(lyrics: string): string {
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

  const lines = lyrics.split('\n').filter(l => l.trim());
  const rhymeScheme: string[] = [];
  let currentLetter = 'A';

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

// Generate large fake lyrics for testing scale
function generateLargeLyrics(numLines: number): string {
  const wordEndings = ['me', 'ht', 'er', 'ay', 'go', 'un', 'in', 'ea', 'on', 'ar'];
  const lines: string[] = [];
  for (let i = 0; i < numLines; i++) {
    const ending = wordEndings[i % wordEndings.length];
    // Create random-looking lines ending with specific 2-char combinations
    lines.push(`Line number ${i} which ends with word${ending}`);
  }
  return lines.join('\n');
}

console.log('🧪 Starting LyricsService Rhyme Scheme Optimization Benchmark...\n');

// 1. Correctness check
const testLyrics = `
Walking down the road of theme
Finding my way through the night
Every step brings me closer
To the dreams that shine so bright
`;

const originalResult = originalAnalyzeRhymeScheme(testLyrics);
const optimizedResult = LyricsService.analyzeRhymeScheme(testLyrics);

console.log(`Original Result:  ${originalResult}`);
console.log(`Optimized Result: ${optimizedResult}`);

if (originalResult !== optimizedResult) {
  console.error('❌ Error: Results do not match for testLyrics!');
  process.exit(1);
} else {
  console.log('✅ Correctness check passed for short lyrics!');
}

// Check with short/irregular words
const irregularLyrics = `
A
Short
Line
Of
Text.
With punctuation!
And more.
`;
const originalIrreg = originalAnalyzeRhymeScheme(irregularLyrics);
const optimizedIrreg = LyricsService.analyzeRhymeScheme(irregularLyrics);

if (originalIrreg !== optimizedIrreg) {
  console.error('❌ Error: Results do not match for irregularLyrics!');
  process.exit(1);
} else {
  console.log('✅ Correctness check passed for irregular/short/punctuated lyrics!');
}

// 2. Performance benchmarking
const scale = 2000; // 2000 lines
const largeLyrics = generateLargeLyrics(scale);

// Warmup
for (let i = 0; i < 5; i++) {
  originalAnalyzeRhymeScheme(largeLyrics);
  LyricsService.analyzeRhymeScheme(largeLyrics);
}

console.log(`\n--- Benchmarking with ${scale} lines of lyrics ---`);

const startOriginal = performance.now();
const resOrig = originalAnalyzeRhymeScheme(largeLyrics);
const endOriginal = performance.now();
const originalTime = endOriginal - startOriginal;

const startOptimized = performance.now();
const resOpt = LyricsService.analyzeRhymeScheme(largeLyrics);
const endOptimized = performance.now();
const optimizedTime = endOptimized - startOptimized;

console.log(`Original Time (O(N^2)):  ${originalTime.toFixed(2)}ms`);
console.log(`Optimized Time (O(N)):   ${optimizedTime.toFixed(2)}ms`);
const speedup = originalTime / optimizedTime;
console.log(`Speedup factor:          ${speedup.toFixed(2)}x`);

if (resOrig !== resOpt) {
  console.error('❌ Error: Benchmark results do not match!');
  process.exit(1);
} else {
  console.log('✅ Correctness verified on large dataset!');
}

console.log('\n✨ BENCHMARK COMPLETE! ✨');
