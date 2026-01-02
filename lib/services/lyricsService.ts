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
   * Find rhymes for a word using free Datamuse API
   */
  static async findRhymes(word: string): Promise<string[]> {
    try {
      // Use free Datamuse API (no key required!)
      const response = await fetch(
        `https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(word)}&max=20`
      );

      if (!response.ok) {
        throw new Error('Rhyme API failed');
      }

      const data = await response.json();
      return data.map((item: { word: string }) => item.word);
    } catch (error) {
      console.error('Error finding rhymes:', error);
      // Fallback to simple suffix matching
      return this.simpleSuffixRhymes(word);
    }
  }

  /**
   * Fallback rhyme finder using common English rhyming patterns
   */
  private static simpleSuffixRhymes(word: string): string[] {
    const commonRhymes: Record<string, string[]> = {
      'love': ['above', 'dove', 'shove', 'glove'],
      'night': ['light', 'bright', 'sight', 'right', 'flight', 'might'],
      'day': ['way', 'say', 'play', 'stay', 'gray', 'pay'],
      'heart': ['part', 'start', 'art', 'chart', 'smart'],
      'time': ['rhyme', 'climb', 'prime', 'chime', 'sublime'],
      'dream': ['beam', 'team', 'stream', 'gleam', 'extreme'],
      'fire': ['desire', 'higher', 'wire', 'inspire', 'acquire'],
      'soul': ['whole', 'goal', 'role', 'control', 'console'],
    };

    return commonRhymes[word.toLowerCase()] || [];
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
   */
  static analyzeRhymeScheme(lyrics: string): string {
    const lines = lyrics.split('\n').filter(l => l.trim());
    const rhymeScheme: string[] = [];
    let currentLetter = 'A';

    // Simplified rhyme detection
    for (let i = 0; i < lines.length; i++) {
      const lastWord = this.getLastWord(lines[i]);
      let foundRhyme = false;

      for (let j = 0; j < i; j++) {
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

    // Genre-specific verse templates
    const verseTemplates: Record<string, string[]> = {
      'Pop': [
        `Dancing through the ${theme}\nYou and me until the end\nEvery moment feels so right\nLike a dream that won't pretend`,
        `Caught up in the ${theme}\nSpinning round and round tonight\nHeartbeat racing with the sound\nEverything feels so alive`,
      ],
      'Rock': [
        `Breaking through the ${theme}\nScreaming out into the void\nNothing's gonna hold me back\nAll my fears have been destroyed`,
        `Thunder in the ${theme}\nLightning crashes in my soul\nRising from the ashes now\nFinally taking back control`,
      ],
      'Hip Hop': [
        `Yeah, I'm living for the ${theme}\nEvery day I'm on my grind\nCame up from the bottom now\nLeaving all the hate behind`,
        `Started from the ${theme}\nNow I'm reaching for the sky\nHaters gonna talk their game\nBut I just let them all fly by`,
      ],
      'Electronic': [
        `Pulse of electric ${theme}\nSynthesized across the night\nDigital heartbeats calling out\nNeon dreams in ultraviolet light`,
        `Lost in waves of ${theme}\nBass drops shaking up my core\nRhythm flowing through my veins\nTake me to the dance floor`,
      ],
      'Jazz': [
        `Smooth as midnight ${theme}\nSwaying to that sultry beat\nEvery note a sweet caress\nMelodies so bittersweet`,
        `Blue notes paint the ${theme}\nImprovisations fill the air\nSyncopated memories\nFloating without a care`,
      ],
      'Country': [
        `Down this dusty road of ${theme}\nWhere the wildflowers grow\nSimple life and honest hearts\nThat's all I need to know`,
        `Sunset on the ${theme}\nFields of gold beneath the sky\nHome is where the heart remains\nNo need to wonder why`,
      ],
      'Classical': [
        `Symphony of ${theme}\nOrchestrated through the years\nTimeless melodies unfold\nBringing joy through all the tears`,
        `Crescendo of ${theme}\nHarmony in every phrase\nEchoes of eternity\nThrough the music's gentle maze`,
      ],
      'default': [
        `Walking through the ${theme}\nFinding meaning in the night\nEvery step reveals a truth\nGuiding me toward the light`,
      ],
    };

    // Genre-specific chorus templates
    const chorusTemplates: Record<string, string[]> = {
      'Pop': [
        `Oh ${theme}, you're all I need\nYou're the reason that I breathe\nWhen the world feels upside down\nYou're my solid ground`,
        `We're alive in the ${theme}\nFeel the magic in the air\nNothing's gonna break us now\nWe're an answered prayer`,
      ],
      'Rock': [
        `${theme}! Can you feel it?\nBurning like a raging fire\nWe're unstoppable tonight\nTaking it higher and higher`,
        `This is our ${theme}\nScreaming loud for all to hear\nWe won't back down, we won't give in\nWe've got nothing left to fear`,
      ],
      'Hip Hop': [
        `${theme} running through my mind\nStacking up my wins, yeah\nNever looking back again\nThis is where it all begins, yeah`,
        `Got that ${theme} in my soul\nCan't nobody take my shine\nI'm just out here living proof\nIt's my moment, it's my time`,
      ],
      'Electronic': [
        `Drop into the ${theme}\nBass is pumping, lights collide\nLose yourself in frequencies\nLet the beat be your guide`,
        `${theme} amplified\nPulse and rhythm synchronize\nWe're electric, we're alive\nUnderneath the strobe light skies`,
      ],
      'default': [
        `Oh ${theme}, light my way\nThrough the darkness and the pain\nYou're the hope I'm holding on to\nLike sunshine after rain`,
      ],
    };

    // Bridge templates
    const bridgeTemplates = [
      `And if the stars fall down tonight\nI'll still hold on with all my might\nThe ${theme} will carry me through\nBecause I believe in something true`,
      `When everything seems far away\nAnd shadows try to make me stray\nI remember what you said\nThe ${theme} keeps me moving ahead`,
      `In the silence, I can hear\nEvery word rings loud and clear\nThis ${theme} will never fade\nIt's the promise that we made`,
    ];

    // Get random templates based on genre
    const genreVerses = verseTemplates[genre] || verseTemplates['default'];
    const genreChorus = chorusTemplates[genre] || chorusTemplates['default'];

    let verseCount = 0;
    let chorusCount = 0;

    const sections: LyricSection[] = defaultStructure.map(type => {
      let text = '';

      switch (type) {
        case 'verse':
          text = genreVerses[verseCount % genreVerses.length];
          verseCount++;
          break;
        case 'chorus':
          text = genreChorus[chorusCount % genreChorus.length];
          chorusCount++;
          break;
        case 'bridge':
          text = bridgeTemplates[Math.floor(Math.random() * bridgeTemplates.length)];
          break;
        case 'pre-chorus':
          text = `I feel it building up inside\nSomething that I cannot hide\nThe ${theme} is calling me`;
          break;
        case 'intro':
          text = `[Instrumental intro - ${genre} style]`;
          break;
        case 'outro':
          text = `The ${theme} remains\nLong after the song ends\n[Fade out]`;
          break;
        default:
          text = genreVerses[0];
      }

      return {
        type: type as LyricSection['type'],
        text,
      };
    });

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
