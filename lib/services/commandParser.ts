// Voice Command Parser Service
// Parses natural language commands into structured actions

import type { ParsedCommand, VoiceIntent } from '@/types';

export class CommandParser {
  /**
   * Parse a voice transcript into a structured command
   */
  static async parse(transcript: string): Promise<ParsedCommand> {
    const text = transcript.toLowerCase().trim();

    // Detect intent
    const intent = this.detectIntent(text);

    // Parse based on intent
    switch (intent) {
      case 'generate':
        return this.parseGenerate(text);
      case 'beat-maker':
        return this.parseBeatMaker(text);
      case 'play':
        return this.parsePlay(text);
      case 'stop':
        return this.parseStop(text);
      case 'navigate':
        return this.parseNavigate(text);
      case 'adjust':
        return this.parseAdjust(text);
      case 'edit':
        return this.parseEdit(text);
      case 'export':
        return this.parseExport(text);
      case 'query':
        return this.parseQuery(text);
      case 'help':
        return this.parseHelp(text);
      default:
        return {
          intent: 'unknown',
          action: 'unknown',
          parameters: { transcript: text },
          confidence: 0.3,
        };
    }
  }

  /**
   * Detect the primary intent of the command
   */
  private static detectIntent(text: string): VoiceIntent {
    // Generate patterns
    if (
      /generate|create|make|build|compose/.test(text) &&
      /song|track|beat|music|melody/.test(text)
    ) {
      return 'generate';
    }

    // Beat maker patterns
    if (
      /beat maker|beat|drum|kick|snare|hi.?hat|bpm|pattern/.test(text) ||
      /(add|start|open|show) (the )?beat/.test(text)
    ) {
      return 'beat-maker';
    }

    // Play patterns
    if (/^(play|start|resume)/.test(text)) {
      return 'play';
    }

    // Stop patterns
    if (/^(stop|pause|halt)/.test(text)) {
      return 'stop';
    }

    // Navigation patterns
    if (
      /^(open|show|go to|navigate to|switch to)/.test(text) ||
      /(tab|page|section|view)/.test(text)
    ) {
      return 'navigate';
    }

    // Adjust patterns
    if (
      /^(set|change|adjust|increase|decrease|raise|lower)/.test(text) ||
      /(volume|bpm|tempo|pitch|key)/.test(text)
    ) {
      return 'adjust';
    }

    // Edit patterns
    if (
      /trim|cut|fade|add (effect|reverb|delay)|boost|compress|eq|mix/.test(text)
    ) {
      return 'edit';
    }

    // Export patterns
    if (/export|download|save|render/.test(text)) {
      return 'export';
    }

    // Query patterns
    if (
      /^(what|how|why|when|where|which|who)/.test(text) ||
      /\?$/.test(text)
    ) {
      return 'query';
    }

    // Help patterns
    if (/help|assist|guide|tutorial|how do i/.test(text)) {
      return 'help';
    }

    return 'unknown';
  }

  /**
   * Parse generation commands
   */
  private static parseGenerate(text: string): ParsedCommand {
    const parameters: Record<string, any> = {};

    // Extract genre
    const genres = [
      'pop', 'rock', 'hip hop', 'electronic', 'jazz', 'classical',
      'r&b', 'country', 'metal', 'indie', 'folk', 'latin', 'trap', 'lo.?fi'
    ];
    for (const genre of genres) {
      const regex = new RegExp(genre, 'i');
      if (regex.test(text)) {
        parameters.genre = genre.replace(/\./g, '');
        break;
      }
    }

    // Extract mood
    const moods = [
      'happy', 'sad', 'energetic', 'chill', 'romantic', 'angry',
      'peaceful', 'dark', 'uplifting', 'mysterious', 'nostalgic', 'epic'
    ];
    for (const mood of moods) {
      if (text.includes(mood)) {
        parameters.mood = mood;
        break;
      }
    }

    // Extract BPM
    const bpmMatch = text.match(/(\d+)\s*(bpm|beats per minute)/i);
    if (bpmMatch) {
      parameters.bpm = parseInt(bpmMatch[1]);
    }

    // Extract duration
    const durationMatch = text.match(/(\d+)\s*(minute|min|second|sec)/i);
    if (durationMatch) {
      const value = parseInt(durationMatch[1]);
      const unit = durationMatch[2];
      parameters.duration = unit.startsWith('min') ? value * 60 : value;
    }

    // Extract prompt (clean up the text)
    let prompt = text
      .replace(/(generate|create|make|build|compose)\s+/i, '')
      .replace(/(song|track|beat|music|melody)/i, '')
      .replace(/\d+\s*(bpm|beats per minute)/i, '')
      .replace(/\d+\s*(minute|min|second|sec)/i, '')
      .trim();

    if (prompt) {
      parameters.prompt = prompt;
    }

    return {
      intent: 'generate',
      action: 'generate_song',
      parameters,
      confidence: 0.9,
    };
  }

  /**
   * Parse beat maker commands
   */
  private static parseBeatMaker(text: string): ParsedCommand {
    const parameters: Record<string, any> = {};

    // Navigation to beat maker
    if (/^(open|show|start|go to|navigate to)/.test(text)) {
      return {
        intent: 'beat-maker',
        action: 'navigate_to_beat_maker',
        parameters: {},
        confidence: 0.95,
      };
    }

    // BPM adjustment
    const bpmMatch = text.match(/(\d+)\s*bpm/i) || text.match(/(set|change)\s+bpm\s+to\s+(\d+)/i);
    if (bpmMatch) {
      parameters.bpm = parseInt(bpmMatch[bpmMatch.length - 1]);
      return {
        intent: 'beat-maker',
        action: 'set_bpm',
        parameters,
        target: 'beatmaker',
        confidence: 0.9,
      };
    }

    // Add instruments
    const instruments = ['kick', 'snare', 'hi.?hat', 'clap', 'rim', 'bass'];
    for (const inst of instruments) {
      const regex = new RegExp(`add (a )?${inst}`, 'i');
      if (regex.test(text)) {
        parameters.instrument = inst.replace(/\./g, '');

        // Extract beat positions (e.g., "on the 1 and 3", "on beats 1 and 3")
        const beatMatch = text.match(/on (the |beats? )?(\d+)(?: and (\d+))?/i);
        if (beatMatch) {
          parameters.beats = [parseInt(beatMatch[2])];
          if (beatMatch[3]) {
            parameters.beats.push(parseInt(beatMatch[3]));
          }
        }

        return {
          intent: 'beat-maker',
          action: 'add_instrument',
          parameters,
          target: 'beatmaker',
          confidence: 0.85,
        };
      }
    }

    // Generic beat maker action
    return {
      intent: 'beat-maker',
      action: 'beat_maker_action',
      parameters: { transcript: text },
      target: 'beatmaker',
      confidence: 0.7,
    };
  }

  /**
   * Parse play commands
   */
  private static parsePlay(text: string): ParsedCommand {
    return {
      intent: 'play',
      action: 'play_audio',
      parameters: {},
      confidence: 0.95,
    };
  }

  /**
   * Parse stop commands
   */
  private static parseStop(text: string): ParsedCommand {
    return {
      intent: 'stop',
      action: 'stop_audio',
      parameters: {},
      confidence: 0.95,
    };
  }

  /**
   * Parse navigation commands
   */
  private static parseNavigate(text: string): ParsedCommand {
    const tabs = [
      'generate', 'upload', 'lyrics', 'waveform', 'editor',
      'stems', 'album art', 'export', 'library', 'beat maker'
    ];

    for (const tab of tabs) {
      if (text.includes(tab)) {
        return {
          intent: 'navigate',
          action: 'navigate_to_tab',
          parameters: { tab: tab.replace(' ', '') },
          confidence: 0.9,
        };
      }
    }

    return {
      intent: 'navigate',
      action: 'navigate',
      parameters: { transcript: text },
      confidence: 0.6,
    };
  }

  /**
   * Parse adjustment commands
   */
  private static parseAdjust(text: string): ParsedCommand {
    const parameters: Record<string, any> = {};

    // Volume
    const volumeMatch = text.match(/(set|change|adjust)?\s*volume\s+to\s+(-?\d+)/i);
    if (volumeMatch || text.includes('volume')) {
      if (volumeMatch) {
        parameters.volume = parseInt(volumeMatch[2]);
      } else if (/increase|raise|up|louder/i.test(text)) {
        parameters.volumeChange = 5;
      } else if (/decrease|lower|down|quieter/i.test(text)) {
        parameters.volumeChange = -5;
      }

      return {
        intent: 'adjust',
        action: 'adjust_volume',
        parameters,
        confidence: 0.9,
      };
    }

    // BPM
    const bpmMatch = text.match(/bpm\s+to\s+(\d+)/i);
    if (bpmMatch) {
      parameters.bpm = parseInt(bpmMatch[1]);
      return {
        intent: 'adjust',
        action: 'adjust_bpm',
        parameters,
        confidence: 0.9,
      };
    }

    return {
      intent: 'adjust',
      action: 'adjust',
      parameters: { transcript: text },
      confidence: 0.6,
    };
  }

  /**
   * Parse edit commands
   */
  private static parseEdit(text: string): ParsedCommand {
    const parameters: Record<string, any> = {};

    // Trim
    const trimMatch = text.match(/trim\s+from\s+(\d+)\s+(?:seconds?|secs?)?\s+to\s+(\d+)/i);
    if (trimMatch) {
      parameters.startTime = parseInt(trimMatch[1]);
      parameters.endTime = parseInt(trimMatch[2]);
      return {
        intent: 'edit',
        action: 'trim_audio',
        parameters,
        confidence: 0.9,
      };
    }

    // Effects
    const effects = ['reverb', 'delay', 'echo', 'compression', 'eq', 'distortion'];
    for (const effect of effects) {
      if (text.includes(effect)) {
        parameters.effect = effect;
        return {
          intent: 'edit',
          action: 'add_effect',
          parameters,
          confidence: 0.85,
        };
      }
    }

    return {
      intent: 'edit',
      action: 'edit',
      parameters: { transcript: text },
      confidence: 0.6,
    };
  }

  /**
   * Parse export commands
   */
  private static parseExport(text: string): ParsedCommand {
    const parameters: Record<string, any> = {};

    // Format
    const formats = ['mp3', 'wav', 'flac', 'ogg'];
    for (const format of formats) {
      if (text.includes(format)) {
        parameters.format = format;
        break;
      }
    }

    // Quality
    if (/high quality|hq|320|lossless/.test(text)) {
      parameters.quality = '320';
    } else if (/spotify quality/.test(text)) {
      parameters.quality = '320';
      parameters.format = 'mp3';
    }

    // Stems
    if (/with stems|include stems/.test(text)) {
      parameters.includeStems = true;
    }

    return {
      intent: 'export',
      action: 'export_audio',
      parameters,
      confidence: 0.85,
    };
  }

  /**
   * Parse query commands
   */
  private static parseQuery(text: string): ParsedCommand {
    return {
      intent: 'query',
      action: 'ask_ai',
      parameters: { question: text },
      confidence: 0.8,
    };
  }

  /**
   * Parse help commands
   */
  private static parseHelp(text: string): ParsedCommand {
    return {
      intent: 'help',
      action: 'show_help',
      parameters: { topic: text.replace(/help|assist|guide|tutorial|how do i/gi, '').trim() },
      confidence: 0.9,
    };
  }
}
