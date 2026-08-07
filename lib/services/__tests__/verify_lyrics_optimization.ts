import { LyricsService } from '../lyricsService';

// Original unoptimized rhyme scheme logic copied for comparison
function originalAnalyzeRhymeScheme(lyrics: string): string {
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

function generateLargeLyrics(numParagraphs: number): string {
  const stanza = [
    "Walking down the road of dreams",
    "Finding my way through the beams",
    "Every step brings me closer",
    "To the light that shines bright",
    "Oh sweet heart, you light my night",
    "Never letting go of our tight plight",
    "And when the silent rain starts to fall",
    "I will hear your sweet recall",
    "Underneath the starlit dome",
    "We will find our happy home"
  ];

  let lyrics = "";
  for (let i = 0; i < numParagraphs; i++) {
    lyrics += stanza.join("\n") + "\n";
  }
  return lyrics;
}

function runBenchmark() {
  console.log("⚡ Starting LyricsService.analyzeRhymeScheme Benchmark...");

  const testLyrics = generateLargeLyrics(80); // 800 lines of lyrics
  const linesCount = testLyrics.split('\n').filter(l => l.trim()).length;
  console.log(`Analyzing ${linesCount} lines of lyrics...\n`);

  // 1. Parity Check
  console.log("--- Phase 1: Correctness and Parity Check ---");
  const originalResult = originalAnalyzeRhymeScheme(testLyrics);
  const optimizedResult = LyricsService.analyzeRhymeScheme(testLyrics);

  if (originalResult !== optimizedResult) {
    console.error("❌ ERROR: Output mismatch!");
    console.error(`Original (${originalResult.length} chars): ${originalResult.slice(0, 50)}...`);
    console.error(`Optimized (${optimizedResult.length} chars): ${optimizedResult.slice(0, 50)}...`);
    process.exit(1);
  }
  console.log("✅ SUCCESS: Optimized and Original outputs match perfectly!\n");

  // 2. Performance Comparison
  console.log("--- Phase 2: Execution Performance ---");
  const iterations = 10;

  // Measure Original
  const startOriginal = performance.now();
  for (let i = 0; i < iterations; i++) {
    originalAnalyzeRhymeScheme(testLyrics);
  }
  const durationOriginal = performance.now() - startOriginal;
  const avgOriginal = durationOriginal / iterations;

  // Measure Optimized
  const startOptimized = performance.now();
  for (let i = 0; i < iterations; i++) {
    LyricsService.analyzeRhymeScheme(testLyrics);
  }
  const durationOptimized = performance.now() - startOptimized;
  const avgOptimized = durationOptimized / iterations;

  console.log(`Original average duration: ${avgOriginal.toFixed(3)}ms`);
  console.log(`Optimized average duration: ${avgOptimized.toFixed(3)}ms`);

  const speedup = avgOriginal / avgOptimized;
  console.log(`⚡ Speedup Multiplier: ${speedup.toFixed(2)}x faster!\n`);

  console.log("⚡ Benchmark Complete.");
}

runBenchmark();
