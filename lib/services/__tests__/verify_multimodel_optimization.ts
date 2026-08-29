import { MultiModelService } from '../multiModelService';

function baselineEnhancePrompt(params: {
  prompt: string;
  genre: string;
  mood: string;
}): string {
  let enhanced = params.prompt;

  const qualityDescriptors = [
    'high quality',
    'professional production',
    'studio recording',
    'clear mix',
  ];

  const genreTerms: Record<string, string[]> = {
    'Pop': ['catchy', 'radio-ready', 'polished'],
    'Rock': ['driving', 'powerful', 'energetic'],
    'Electronic': ['crisp', 'detailed', 'modern'],
    'Jazz': ['sophisticated', 'smooth', 'refined'],
    'Hip Hop': ['punchy', 'dynamic', 'hard-hitting'],
  };

  const terms = genreTerms[params.genre] || [];

  enhanced = `${params.genre} music, ${params.mood.toLowerCase()} mood. ${enhanced}. ${qualityDescriptors.join(', ')}. ${terms.join(', ')}.`;

  return enhanced;
}

async function runBenchmark() {
  console.log('⚡ Starting MultiModelService.enhancePrompt Benchmark...\n');

  const testCases = [
    { prompt: 'Energetic guitar riff with synth bass', genre: 'Rock', mood: 'Energetic' },
    { prompt: 'Lofi chill beat to study to', genre: 'Pop', mood: 'Relaxed' },
    { prompt: 'Future bass synth drop', genre: 'Electronic', mood: 'Hyped' },
    { prompt: 'Smooth saxophone solos', genre: 'Jazz', mood: 'Smooth' },
    { prompt: 'Boom bap 90s drums', genre: 'Hip Hop', mood: 'Gritty' },
    { prompt: 'Ambient soundscape with orchestral pads', genre: 'Classical', mood: 'Peaceful' },
  ];

  // 1. Correctness Verification
  console.log('--- Correctness Verification ---');
  let allMatched = true;
  for (const tc of testCases) {
    const expected = baselineEnhancePrompt(tc);
    const actual = (MultiModelService as any).enhancePrompt(tc);
    if (expected !== actual) {
      console.error(`❌ Mismatch for genre=${tc.genre}:\nExpected: "${expected}"\nActual:   "${actual}"`);
      allMatched = false;
    }
  }

  if (allMatched) {
    console.log('✅ 100% Correctness verified! Optimized output matches baseline perfectly.\n');
  } else {
    process.exit(1);
  }

  // 2. Performance Benchmark
  console.log('--- Performance Benchmark ---');
  const ITERATIONS = 1_000_000;

  // Baseline Benchmark
  const startBaseline = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const tc = testCases[i % testCases.length];
    baselineEnhancePrompt(tc);
  }
  const endBaseline = performance.now();
  const baselineTime = endBaseline - startBaseline;

  // Optimized Benchmark
  const startOptimized = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const tc = testCases[i % testCases.length];
    (MultiModelService as any).enhancePrompt(tc);
  }
  const endOptimized = performance.now();
  const optimizedTime = endOptimized - startOptimized;

  const speedup = baselineTime / optimizedTime;

  console.log(`Baseline (${ITERATIONS.toLocaleString()} ops): ${baselineTime.toFixed(2)} ms`);
  console.log(`Optimized (${ITERATIONS.toLocaleString()} ops): ${optimizedTime.toFixed(2)} ms`);
  console.log(`⚡ Speedup: ${speedup.toFixed(2)}x faster\n`);
}

runBenchmark().catch(console.error);
