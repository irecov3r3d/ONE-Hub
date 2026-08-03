import { LyricsService } from '../lyricsService';

/**
 * Old, unoptimized implementation of the rhyme scheme analysis for A/B benchmarking
 */
class OldLyricsService {
  static analyzeRhymeScheme(lyrics: string): string {
    const lines = lyrics.split('\n').filter(l => l.trim());
    const rhymeScheme: string[] = [];
    let currentLetter = 'A';

    // Simplified rhyme detection
    for (let i = 0; i < lines.length; i++) {
      // O(N^2) calls: this is called once for every outer loop iteration
      const lastWord = this.getLastWord(lines[i]);
      let foundRhyme = false;

      for (let j = 0; j < i; j++) {
        // O(N^2) calls: this is called up to N times per outer loop iteration
        const prevLastWord = this.getLastWord(lines[j]);
        if (this.doWordsRhyme(lastWord, prevLastWord)) {
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

  private static getLastWord(line: string): string {
    const words = line.trim().toLowerCase().replace(/[.,!?;:]/, '').split(' ');
    return words[words.length - 1] || '';
  }

  private static doWordsRhyme(word1: string, word2: string): boolean {
    const minLength = Math.min(word1.length, word2.length);
    if (minLength < 2) return false;

    const ending1 = word1.slice(-2);
    const ending2 = word2.slice(-2);

    return ending1 === ending2;
  }
}

async function runBenchmark() {
  console.log('⚡ Starting Lyrics Rhyme Scheme Analyzer Benchmark...');

  // Generate a large set of lyrics to simulate multi-verse, multi-chorus, or bulk analysis
  const verse1 = `
    Walking down the street of gold,
    Seeing stories unfold,
    No one here is getting old,
    But the truth is never told.
  `;
  const chorus = `
    This is my song for the night,
    Everything is shining bright,
    We will reach a greater height,
    With our spirits taking flight.
  `;
  const verse2 = `
    Listen to the sound of rain,
    Washing away all the pain,
    Nothing here is in vain,
    Riding on a fast train.
  `;
  const bridge = `
    Sometimes we win, sometimes we lose,
    But this is the path we choose,
    No time to sit and sing the blues,
    Spread the word and share the news.
  `;

  // Repeat sections to build a substantial document (e.g. 100+ lines)
  let bulkLyrics = '';
  for (let i = 0; i < 30; i++) {
    bulkLyrics += `${verse1}\n${chorus}\n${verse2}\n${bridge}\n`;
  }

  const linesCount = bulkLyrics.split('\n').filter(l => l.trim()).length;
  console.log(`- Benchmarking with ${linesCount} lines of lyrics`);

  // 1. Warm-up
  for (let i = 0; i < 10; i++) {
    OldLyricsService.analyzeRhymeScheme(bulkLyrics);
    LyricsService.analyzeRhymeScheme(bulkLyrics);
  }

  const iterations = 200;

  // 2. Benchmark Old Implementation
  const startOld = Date.now();
  for (let i = 0; i < iterations; i++) {
    OldLyricsService.analyzeRhymeScheme(bulkLyrics);
  }
  const endOld = Date.now();
  const oldTime = (endOld - startOld) / iterations;

  // 3. Benchmark New Implementation (Bolt Optimized)
  const startNew = Date.now();
  for (let i = 0; i < iterations; i++) {
    LyricsService.analyzeRhymeScheme(bulkLyrics);
  }
  const endNew = Date.now();
  const newTime = (endNew - startNew) / iterations;

  console.log(`\nResults (${iterations} iterations):`);
  console.log(`- Old O(N^2) extraction: ${oldTime.toFixed(4)}ms / op`);
  console.log(`- Bolt Optimized O(N):   ${newTime.toFixed(4)}ms / op`);
  console.log(`- Speedup:               ${(oldTime / newTime).toFixed(2)}x`);

  // 4. Verify Numerical Correctness & Edge Cases
  const oldResult = OldLyricsService.analyzeRhymeScheme(bulkLyrics);
  const newResult = LyricsService.analyzeRhymeScheme(bulkLyrics);

  console.log(`\nCorrectness Verification:`);
  console.log(`- Old output sample: ${oldResult.slice(0, 16)}...`);
  console.log(`- New output sample: ${newResult.slice(0, 16)}...`);

  if (oldResult === newResult) {
    console.log('✅ Correctness verified! Both outputs are identical.');
  } else {
    console.error('❌ Mismatch detected!');
    console.error(`Expected: ${oldResult}`);
    console.error(`Got:      ${newResult}`);
    process.exit(1);
  }
}

runBenchmark().catch(console.error);
