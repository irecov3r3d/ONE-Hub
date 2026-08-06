import { LyricsService } from '../lyricsService';

// Original unoptimized implementation of analyzeRhymeScheme
function baselineAnalyzeRhymeScheme(lyrics: string): string {
  // We use the exact unoptimized code to compare
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

async function verifyLyricsOptimization() {
  console.log('⚡ Starting Lyrics Performance Benchmark...');

  // Generate a realistic, larger set of lyrics (e.g. 500 lines) to amplify the impact of O(N^2) complexity
  const repeatingStanzas = [
    "Walking down the road of music dreams",
    "Finding my way through the night gleams",
    "Every step brings me closer to the light",
    "To the dreams that shine so bright",
    "And when the melody begins to play",
    "Guiding me through every brand new day",
    "In the cold of the winter breeze",
    "Singing songs under the giant trees",
    "Through the valleys and the highest hill",
    "The rhythm stays and keeps me still",
    "But the beat goes on and does not stop",
    "Until we reach the very mountain top",
  ];

  let longLyrics = "";
  for (let i = 0; i < 40; i++) { // ~480 lines
    longLyrics += repeatingStanzas.join('\n') + '\n';
  }

  console.log(`Analyzing lyrics of length: ${longLyrics.split('\n').length} lines.`);

  // 1. Verify correctness
  const baselineResult = baselineAnalyzeRhymeScheme(longLyrics);
  const optimizedResult = LyricsService.analyzeRhymeScheme(longLyrics);

  if (baselineResult !== optimizedResult) {
    console.error(`Baseline: ${baselineResult.substring(0, 50)}...`);
    console.error(`Optimized: ${optimizedResult.substring(0, 50)}...`);
    throw new Error('❌ Optimization verification failed: Output mismatch!');
  }
  console.log('✅ Correctness verified: Baseline and Optimized results are identical!');

  // 2. Measure performance of baseline
  const startBaseline = performance.now();
  for (let i = 0; i < 20; i++) {
    baselineAnalyzeRhymeScheme(longLyrics);
  }
  const endBaseline = performance.now();
  const baselineDuration = (endBaseline - startBaseline) / 20;

  // 3. Measure performance of optimized
  const startOptimized = performance.now();
  for (let i = 0; i < 20; i++) {
    LyricsService.analyzeRhymeScheme(longLyrics);
  }
  const endOptimized = performance.now();
  const optimizedDuration = (endOptimized - startOptimized) / 20;

  const speedup = baselineDuration / optimizedDuration;

  console.log(`\nResults (Avg of 20 iterations):`);
  console.log(`- Baseline:  ${baselineDuration.toFixed(4)}ms / op`);
  console.log(`- Optimized: ${optimizedDuration.toFixed(4)}ms / op`);
  console.log(`- Speedup:   ${speedup.toFixed(2)}x`);

  if (speedup < 1.5) {
    console.warn('⚠️ Warning: Optimization speedup is lower than expected on this run!');
  } else {
    console.log('⚡ Verification success: Lyrics optimization achieved significant speedup!');
  }
}

verifyLyricsOptimization().catch(err => {
  console.error('❌ Error executing lyrics benchmark:', err);
  process.exit(1);
});
