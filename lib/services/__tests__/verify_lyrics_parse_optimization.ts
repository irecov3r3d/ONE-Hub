import { LyricsService } from '../lyricsService';
import type { LyricSection } from '@/types';

// Unoptimized baseline implementation for comparison
function parseLyricsBaseline(text: string): LyricSection[] {
  const sections: LyricSection[] = [];
  const lines = text.split('\n');

  let currentSection: LyricSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.match(/^\[?(verse|chorus|bridge|pre-chorus|outro|intro)/i)) {
      if (currentSection) {
        sections.push(currentSection);
      }

      const type = trimmed
        .toLowerCase()
        .replace(/[\[\]]/g, '')
        .split(' ')[0] as LyricSection['type'];

      currentSection = {
        type: type || 'verse',
        text: '',
      };
    } else if (trimmed && currentSection) {
      currentSection.text += (currentSection.text ? '\n' : '') + trimmed;
    } else if (trimmed && !currentSection) {
      currentSection = {
        type: 'verse',
        text: trimmed,
      };
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

const mockLyrics = `
[Intro]
Welcome to the beat
Feel the rhythm in your feet

[Verse 1]
Walking down the road of dreams
Finding my way through the night
Every step brings me closer
To the dreams that shine so bright
Walking down the street
Keeping with the beat
Nothing can stop us now
We are going to make it somehow

[Pre-Chorus]
I feel it coming
Something's in the air
The moment's almost here

[Chorus]
Oh freedom, you light my way
Guiding me through every day
When the world seems dark and cold
Your story will be told
Oh freedom, you light my way
Guiding me through every day

[Verse 2]
Stars are shining in the sky
Clouds are slowly drifting by
Never thought I'd come this far
Following my lucky star

[Bridge]
And when the night falls down
I'll still be around
Holding on to hope
Never letting go

[Outro]
And so the story ends
But the memory transcends
Fade into the dark
Leaving a permanent mark
`.repeat(50);

// 1. Verify exact 100% equivalence
const baselineResult = parseLyricsBaseline(mockLyrics);
const optimizedResult = LyricsService.parseLyrics(mockLyrics);

const baselineJson = JSON.stringify(baselineResult);
const optimizedJson = JSON.stringify(optimizedResult);

if (baselineJson !== optimizedJson) {
  console.error("❌ Mismatch found between baseline and optimized parseLyrics!");
  process.exit(1);
} else {
  console.log("✅ Results match 100% between baseline and optimized parseLyrics!");
}

// 2. Measure performance benchmark
const iterations = 1000;

const startBase = performance.now();
for (let i = 0; i < iterations; i++) {
  parseLyricsBaseline(mockLyrics);
}
const baseTime = performance.now() - startBase;

const startOpt = performance.now();
for (let i = 0; i < iterations; i++) {
  LyricsService.parseLyrics(mockLyrics);
}
const optTime = performance.now() - startOpt;

console.log(`Baseline time: ${baseTime.toFixed(2)} ms`);
console.log(`Optimized time: ${optTime.toFixed(2)} ms`);
console.log(`Speedup: ${(baseTime / optTime).toFixed(2)}x`);
