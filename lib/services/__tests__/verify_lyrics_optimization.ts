import { LyricsService } from '../lyricsService';
import { performance } from 'perf_hooks';

// Baseline implementation for verification and comparison
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
  console.log('⚡ Starting Lyrics Rhyme Scheme Optimization Benchmark...\n');

  // Generate representative large lyrics
  const lyricBases = [
    "I was walking down the street today.",
    "Watching all the people pass my way.",
    "I had a feeling that I couldn't shake.",
    "A promise that I would never break.",
    "But then the sky turned grey and dark.",
    "And there was no light inside the park.",
    "I tried to find a place to hide.",
    "With all this heavy weight inside.",
    "The rain began to fall and pour.",
    "As I stood knocking on your door.",
    "You opened up and looked at me.",
    "The key to set my spirit free.",
    "We sat and talked about the past.",
    "Knowing that this moment couldn't last.",
    "But for a second, time stood still.",
    "Looking out across the windy hill."
  ];

  // Repeat the lyrics to make a large set of lines (e.g. 1600 lines) to demonstrate O(N^2) vs O(N) scaling
  const iterations = 100;
  let largeLyricsArray: string[] = [];
  for (let k = 0; k < iterations; k++) {
    largeLyricsArray = largeLyricsArray.concat(lyricBases);
  }
  const largeLyrics = largeLyricsArray.join('\n');

  console.log(`Lyrics dataset size: ${largeLyricsArray.length} lines.\n`);

  // --- Baseline Run ---
  const startBaseline = performance.now();
  const baselineResult = baselineAnalyzeRhymeScheme(largeLyrics);
  const endBaseline = performance.now();
  const baselineDuration = endBaseline - startBaseline;
  console.log(`- Baseline (O(N^2) loops): ${baselineDuration.toFixed(3)}ms`);

  // --- Optimized Run ---
  const startOptimized = performance.now();
  const optimizedResult = LyricsService.analyzeRhymeScheme(largeLyrics);
  const endOptimized = performance.now();
  const optimizedDuration = endOptimized - startOptimized;
  console.log(`- Bolt Optimized (O(N) cache): ${optimizedDuration.toFixed(3)}ms`);

  const speedup = baselineDuration / optimizedDuration;
  console.log(`\n🚀 Speedup factor: ${speedup.toFixed(2)}x`);

  // --- Correctness Verification ---
  const matches = baselineResult === optimizedResult;
  console.log(`\nCorrectness Verification:`);
  console.log(`- Baseline length:  ${baselineResult.length}`);
  console.log(`- Optimized length: ${optimizedResult.length}`);
  console.log(`- Exact match:      ${matches ? '✅ Yes' : '❌ No'}`);

  if (!matches) {
    console.log(`Baseline:  ${baselineResult.slice(0, 100)}...`);
    console.log(`Optimized: ${optimizedResult.slice(0, 100)}...`);
    throw new Error('Verification failed: results do not match!');
  }

  console.log('\n✅ Lyrics Optimization Verification Successful!');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
