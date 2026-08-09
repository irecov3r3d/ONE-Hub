import { LyricsService } from '../lyricsService';

function runBenchmark() {
  console.log('🧪 Starting Lyrics Rhyme Scheme Analyzer Benchmark...\n');

  // Generate 1000 lines of mock lyrics to simulate a larger corpus/long-form lyric composition
  const themes = ['love', 'destiny', 'dreams', 'victory', 'horizon', 'shadow', 'echoes', 'starlight'];
  const baseLines = [
    'Walking down the road of destiny',
    'Finding my way through the night',
    'Every step brings me closer',
    'To the dreams that shine so bright',
    'Oh destiny, you light my way',
    'Guiding me through every day',
    'When the world seems dark and cold',
    'Your story will be told',
    'And when the night falls down',
    'I will still be around',
    'Holding on to dreams',
    'Never letting go',
    'I feel it coming',
    'Somethings in the air',
    'The moments almost here',
    'And so the story ends',
    'But the memory transcends'
  ];

  const lines: string[] = [];
  for (let i = 0; i < 60; i++) {
    const theme = themes[i % themes.length];
    for (const base of baseLines) {
      lines.push(base.replace('destiny', theme).replace('dreams', theme));
    }
  }

  const testLyrics = lines.join('\n');
  const lineCount = lines.filter(l => l.trim()).length;
  console.log(`Analyzing ${lineCount} lines...`);

  // Baseline unoptimized implementation for measurement
  function baselineAnalyzeRhymeScheme(lyrics: string): string {
    const lines = lyrics.split('\n').filter(l => l.trim());
    const rhymeScheme: string[] = [];
    let currentLetter = 'A';

    // Helper functions from the baseline implementation
    function getLastWord(line: string): string {
      const words = line.trim().toLowerCase().replace(/[.,!?;:]/, '').split(' ');
      return words[words.length - 1] || '';
    }

    function doWordsRhyme(word1: string, word2: string): boolean {
      const minLength = Math.min(word1.length, word2.length);
      if (minLength < 2) return false;
      const ending1 = word1.slice(-2);
      const ending2 = word2.slice(-2);
      return ending1 === ending2;
    }

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

  // Warmup
  for (let i = 0; i < 5; i++) {
    baselineAnalyzeRhymeScheme(testLyrics);
    LyricsService.analyzeRhymeScheme(testLyrics);
  }

  const ITERATIONS = 100;

  // Measure Baseline
  const startBaseline = performance.now();
  let baselineResult = '';
  for (let i = 0; i < ITERATIONS; i++) {
    baselineResult = baselineAnalyzeRhymeScheme(testLyrics);
  }
  const endBaseline = performance.now();
  const baselineDuration = (endBaseline - startBaseline) / ITERATIONS;

  // Measure Bolt Optimized
  const startOptimized = performance.now();
  let optimizedResult = '';
  for (let i = 0; i < ITERATIONS; i++) {
    optimizedResult = LyricsService.analyzeRhymeScheme(testLyrics);
  }
  const endOptimized = performance.now();
  const optimizedDuration = (endOptimized - startOptimized) / ITERATIONS;

  const speedup = baselineDuration / optimizedDuration;

  console.log(`\nResults (${lineCount} lines, ${ITERATIONS} iterations):`);
  console.log(`- Baseline: ${baselineDuration.toFixed(4)}ms / op`);
  console.log(`- Optimized:  ${optimizedDuration.toFixed(4)}ms / op`);
  console.log(`- Speedup:    ${speedup.toFixed(2)}x\n`);

  console.log('🔍 Verifying numerical and logical correctness...');
  if (baselineResult === optimizedResult) {
    console.log('✅ Success: Optimized rhyme scheme output is 100% identical to the baseline!');
  } else {
    console.error('❌ Error: Output mismatch!');
    console.log(`Baseline length: ${baselineResult.length}, Optimized length: ${optimizedResult.length}`);
    for (let i = 0; i < Math.max(baselineResult.length, optimizedResult.length); i++) {
      if (baselineResult[i] !== optimizedResult[i]) {
        console.log(`Mismatch at index ${i}: Baseline='${baselineResult[i]}', Optimized='${optimizedResult[i]}'`);
        break;
      }
    }
    process.exit(1);
  }
}

runBenchmark();
