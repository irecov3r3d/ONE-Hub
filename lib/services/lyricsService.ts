// Lyrics generation and processing service

import type { LyricsData, LyricSection } from '@/types';

export class LyricsService {
  /**
   * Generate lyrics using AI
   * Can integrate with OpenAI, Anthropic, or specialized lyric generators
   */
  static async generateLyrics(params: {
    theme: string;
    genre: string;
    mood: string;
    language?: string;
    length?: 'short' | 'medium' | 'long';
    structure?: string[];
  }): Promise<LyricsData> {
    const { theme, genre, mood, language = 'en', length = 'medium', structure } = params;

    // TODO: Replace with actual AI API call
    // Options: OpenAI GPT-4, Anthropic Claude, specialized lyric generators

    await this.simulateProcessing(5000);

    // Mock lyrics generation
    const lyrics = this.generateMockLyrics(theme, genre, structure);

    return {
      id: crypto.randomUUID(),
      songId: '',
      text: lyrics.text,
      language,
      sections: lyrics.sections,
      generatedBy: 'ai',
    };
  }

  /**
   * Parse lyrics into sections
   * Automatically detects verse, chorus, bridge, etc.
   */
  static parseLyrics(text: string): LyricSection[] {
    const sections: LyricSection[] = [];
    const lines = text.split('\n');

    let currentSection: LyricSection | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect section markers
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
        // Default to verse if no section marker
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

  /**
   * Improve existing lyrics
   * AI suggests better rhymes, word choices, etc.
   */
  static async improveLyrics(lyrics: string, improvements: string[]): Promise<string> {
    await this.simulateProcessing(3000);

    // TODO: Implement AI-powered lyric improvement

    return lyrics;
  }

  /**
   * Find rhymes for a word
   */
  static async findRhymes(word: string): Promise<string[]> {
    // TODO: Integrate with rhyming API or dictionary

    return ['mock', 'rhyme', 'words'];
  }

  /**
   * Translate lyrics to another language
   */
  static async translateLyrics(
    lyrics: string,
    targetLanguage: string
  ): Promise<string> {
    await this.simulateProcessing(2000);

    // TODO: Use translation API that preserves poetic structure

    return lyrics;
  }

  /**
   * Generate rhyme scheme analysis
   * ⚡ Bolt Optimization: Precompute and cache the 2-character endings of lines.
   * This eliminates redundant O(N^2) calls to getLastWord, trims, regex replacements,
   * and intermediate array split allocations within the nested loop. Complexity is reduced
   * from O(N^2) string operations to O(N) optimized lookups.
   */
  static analyzeRhymeScheme(lyrics: string): string {
    const lines = lyrics.split('\n').filter(l => l.trim());
    const rhymeScheme: string[] = [];
    let currentLetter = 'A';

    const len = lines.length;
    // Precompute line endings to avoid repeating getLastWord/doWordsRhyme in the nested loops.
    // Replicates the exact baseline behavior (including first punctuation replacement quirk) for 100% compatibility.
    const endings = new Array<string>(len);
    for (let i = 0; i < len; i++) {
      const line = lines[i].trim().toLowerCase();
      const replaced = line.replace(/[.,!?;:]/, '');
      const lastSpace = replaced.lastIndexOf(' ');
      const lastWord = lastSpace === -1 ? replaced : replaced.substring(lastSpace + 1);

      if (lastWord.length < 2) {
        endings[i] = '';
      } else {
        endings[i] = lastWord.slice(-2);
      }
    }

    // Simplified rhyme detection using precomputed endings
    for (let i = 0; i < len; i++) {
      const ending = endings[i];
      let foundRhyme = false;

      if (ending !== '') {
        for (let j = 0; j < i; j++) {
          if (ending === endings[j]) {
            rhymeScheme.push(rhymeScheme[j]);
            foundRhyme = true;
            break;
          }
        }
      }

      if (!foundRhyme) {
        rhymeScheme.push(currentLetter);
        currentLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
      }
    }

    return rhymeScheme.join('');
  }

  /**
   * Generate lyrics with specific rhyme scheme
   */
  static async generateWithRhymeScheme(
    theme: string,
    rhymeScheme: string
  ): Promise<string> {
    await this.simulateProcessing(4000);

    // TODO: Implement constrained generation with rhyme scheme

    return 'Generated lyrics with rhyme scheme...';
  }

  // Helper methods

  private static getLastWord(line: string): string {
    const words = line.trim().toLowerCase().replace(/[.,!?;:]/, '').split(' ');
    return words[words.length - 1] || '';
  }

  private static doWordsRhyme(word1: string, word2: string): boolean {
    // Simplified rhyme check - just checks if endings match
    // TODO: Implement proper phonetic rhyme checking
    const minLength = Math.min(word1.length, word2.length);
    if (minLength < 2) return false;

    const ending1 = word1.slice(-2);
    const ending2 = word2.slice(-2);

    return ending1 === ending2;
  }

  private static generateMockLyrics(
    theme: string,
    genre: string,
    structure?: string[]
  ): { text: string; sections: LyricSection[] } {
    const defaultStructure = structure || ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'];

    const templates: Record<string, string> = {
      verse: `Walking down the road of ${theme}\nFinding my way through the night\nEvery step brings me closer\nTo the dreams that shine so bright`,
      chorus: `Oh ${theme}, you light my way\nGuiding me through every day\nWhen the world seems dark and cold\nYour story will be told`,
      bridge: `And when the night falls down\nI'll still be around\nHolding on to ${theme}\nNever letting go`,
      'pre-chorus': `I feel it coming\nSomething's in the air\nThe moment's almost here`,
      intro: `[Instrumental intro with ${genre} vibes]`,
      outro: `And so the story ends\nBut the memory transcends`,
    };

    const sections: LyricSection[] = defaultStructure.map(type => ({
      type: type as LyricSection['type'],
      text: templates[type] || templates['verse'],
    }));

    const text = sections
      .map(s => `[${s.type.charAt(0).toUpperCase() + s.type.slice(1)}]\n${s.text}`)
      .join('\n\n');

    return { text, sections };
  }

  private static async simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/*
 * INTEGRATION OPTIONS:
 *
 * AI LYRIC GENERATION:
 *
 * 1. OpenAI GPT-4 (Paid)
 *    const response = await openai.chat.completions.create({
 *      model: "gpt-4",
 *      messages: [{
 *        role: "system",
 *        content: "You are a professional songwriter..."
 *      }, {
 *        role: "user",
 *        content: `Write lyrics about ${theme} in ${genre} style`
 *      }]
 *    });
 *
 * 2. Anthropic Claude (Paid)
 *    const response = await anthropic.messages.create({
 *      model: "claude-3-opus-20240229",
 *      messages: [{
 *        role: "user",
 *        content: `Write song lyrics...`
 *      }]
 *    });
 *
 * 3. DeepAI Lyric Generator (Free tier available)
 *    - Specialized for lyrics
 *    - REST API available
 *
 * RHYMING:
 *
 * 1. Datamuse API (Free)
 *    - Find rhymes, similar words
 *    - No API key needed
 *    - https://www.datamuse.com/api/
 *
 * 2. RhymeBrain API (Free)
 *    - Comprehensive rhyme database
 *
 * TRANSLATION:
 *
 * 1. DeepL API (Free tier)
 *    - High quality translation
 *    - Better than Google for creative text
 *
 * 2. Google Translate API (Paid)
 *    - Wide language support
 */
