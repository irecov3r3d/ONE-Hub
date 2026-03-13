// Genre-Specific Mastering Presets
// Professional mastering settings optimized for different genres

import type { MasteringSettings } from '@/types';

export const MASTERING_PRESETS = {
  // Electronic Dance Music
  edm: {
    name: 'EDM / Dance',
    description: 'Loud, punchy, with enhanced sub-bass and brightness',
    settings: {
      targetLUFS: -8,
      truePeakLimit: -0.3,
      eqBands: [
        { id: 'hp', enabled: true, frequency: 30, gain: 0, q: 0.7, type: 'highPass' as const },
        { id: 'sub', enabled: true, frequency: 60, gain: 2, q: 1.2, type: 'bell' as const },
        { id: 'kick', enabled: true, frequency: 80, gain: 1.5, q: 1.5, type: 'bell' as const },
        { id: 'presence', enabled: true, frequency: 8000, gain: 1.5, q: 1.0, type: 'highShelf' as const },
      ],
      compression: [{
        id: 'main',
        enabled: true,
        threshold: -12,
        ratio: 4,
        attack: 5,
        release: 80,
        knee: 3,
        makeupGain: 2,
      }],
      limiting: {
        enabled: true,
        threshold: -0.5,
        ceiling: -0.1,
        release: 30,
        lookahead: 5,
        oversampling: 4,
      },
      stereoWidth: 120,
      midSideProcessing: {
        enabled: true,
        midGain: 0,
        sideGain: 2,
        stereoWidth: 120,
      },
      exciter: {
        enabled: true,
        amount: 40,
        harmonics: 2,
        mix: 25,
      },
      saturation: {
        enabled: true,
        type: 'transistor' as const,
        drive: 15,
        mix: 20,
      },
      dithering: {
        enabled: false,
        type: 'triangular' as const,
        depth: 16,
        noiseShaping: false,
      },
    } as MasteringSettings,
  },

  // Hip-Hop / Rap
  hiphop: {
    name: 'Hip-Hop / Rap',
    description: 'Heavy bass, punchy drums, clear vocals',
    settings: {
      targetLUFS: -10,
      truePeakLimit: -0.5,
      eqBands: [
        { id: 'hp', enabled: true, frequency: 25, gain: 0, q: 0.7, type: 'highPass' as const },
        { id: 'subbass', enabled: true, frequency: 50, gain: 3, q: 1.0, type: 'lowShelf' as const },
        { id: 'kick', enabled: true, frequency: 80, gain: 2, q: 1.5, type: 'bell' as const },
        { id: 'vocals', enabled: true, frequency: 3000, gain: 1, q: 1.0, type: 'bell' as const },
      ],
      compression: [{
        id: 'main',
        enabled: true,
        threshold: -16,
        ratio: 3,
        attack: 10,
        release: 100,
        knee: 6,
        makeupGain: 3,
      }],
      limiting: {
        enabled: true,
        threshold: -1,
        ceiling: -0.3,
        release: 50,
        lookahead: 5,
        oversampling: 2,
      },
      stereoWidth: 100,
      midSideProcessing: {
        enabled: false,
        midGain: 0,
        sideGain: 0,
        stereoWidth: 100,
      },
      saturation: {
        enabled: true,
        type: 'tape' as const,
        drive: 20,
        mix: 30,
      },
    } as MasteringSettings,
  },

  // Rock / Metal
  rock: {
    name: 'Rock / Metal',
    description: 'Aggressive, with controlled dynamics and clarity',
    settings: {
      targetLUFS: -11,
      truePeakLimit: -0.5,
      eqBands: [
        { id: 'hp', enabled: true, frequency: 35, gain: 0, q: 0.7, type: 'highPass' as const },
        { id: 'lowmid', enabled: true, frequency: 250, gain: -1, q: 1.0, type: 'bell' as const },
        { id: 'presence', enabled: true, frequency: 4000, gain: 1.5, q: 1.2, type: 'bell' as const },
        { id: 'air', enabled: true, frequency: 10000, gain: 1, q: 0.7, type: 'highShelf' as const },
      ],
      compression: [{
        id: 'main',
        enabled: true,
        threshold: -18,
        ratio: 3.5,
        attack: 15,
        release: 120,
        knee: 6,
        makeupGain: 2,
      }],
      limiting: {
        enabled: true,
        threshold: -1,
        ceiling: -0.3,
        release: 60,
        lookahead: 5,
        oversampling: 2,
      },
      stereoWidth: 110,
      midSideProcessing: {
        enabled: false,
        midGain: 0,
        sideGain: 0,
        stereoWidth: 110,
      },
      saturation: {
        enabled: true,
        type: 'tube' as const,
        drive: 25,
        mix: 25,
      },
    } as MasteringSettings,
  },

  // Pop
  pop: {
    name: 'Pop',
    description: 'Balanced, bright, radio-ready',
    settings: {
      targetLUFS: -10,
      truePeakLimit: -0.5,
      eqBands: [
        { id: 'hp', enabled: true, frequency: 30, gain: 0, q: 0.7, type: 'highPass' as const },
        { id: 'warmth', enabled: true, frequency: 120, gain: 0.5, q: 1.0, type: 'lowShelf' as const },
        { id: 'presence', enabled: true, frequency: 5000, gain: 1, q: 1.0, type: 'bell' as const },
        { id: 'air', enabled: true, frequency: 12000, gain: 1.5, q: 0.7, type: 'highShelf' as const },
      ],
      compression: [{
        id: 'main',
        enabled: true,
        threshold: -16,
        ratio: 3,
        attack: 10,
        release: 100,
        knee: 6,
        makeupGain: 2,
      }],
      limiting: {
        enabled: true,
        threshold: -1,
        ceiling: -0.3,
        release: 50,
        lookahead: 5,
        oversampling: 2,
      },
      stereoWidth: 110,
      midSideProcessing: {
        enabled: true,
        midGain: 0,
        sideGain: 1,
        stereoWidth: 110,
      },
      exciter: {
        enabled: true,
        amount: 30,
        harmonics: 2,
        mix: 20,
      },
    } as MasteringSettings,
  },

  // Classical / Orchestral
  classical: {
    name: 'Classical / Orchestral',
    description: 'Natural dynamics, wide soundstage, minimal processing',
    settings: {
      targetLUFS: -18,
      truePeakLimit: -1,
      eqBands: [
        { id: 'hp', enabled: true, frequency: 20, gain: 0, q: 0.7, type: 'highPass' as const },
        { id: 'warmth', enabled: true, frequency: 200, gain: 0.5, q: 0.7, type: 'lowShelf' as const },
        { id: 'air', enabled: true, frequency: 10000, gain: 0.5, q: 0.5, type: 'highShelf' as const },
      ],
      compression: [{
        id: 'main',
        enabled: false,  // Minimal compression for classical
        threshold: -24,
        ratio: 1.5,
        attack: 30,
        release: 200,
        knee: 10,
        makeupGain: 0,
      }],
      limiting: {
        enabled: true,
        threshold: -2,
        ceiling: -0.5,
        release: 100,
        lookahead: 10,
        oversampling: 4,
      },
      stereoWidth: 120,
      midSideProcessing: {
        enabled: true,
        midGain: 0,
        sideGain: 1.5,
        stereoWidth: 120,
      },
    } as MasteringSettings,
  },

  // Jazz
  jazz: {
    name: 'Jazz',
    description: 'Natural, warm, with preserved dynamics',
    settings: {
      targetLUFS: -16,
      truePeakLimit: -1,
      eqBands: [
        { id: 'hp', enabled: true, frequency: 25, gain: 0, q: 0.7, type: 'highPass' as const },
        { id: 'warmth', enabled: true, frequency: 150, gain: 1, q: 0.7, type: 'lowShelf' as const },
        { id: 'presence', enabled: true, frequency: 6000, gain: 0.5, q: 0.7, type: 'bell' as const },
      ],
      compression: [{
        id: 'main',
        enabled: true,
        threshold: -20,
        ratio: 2,
        attack: 20,
        release: 150,
        knee: 8,
        makeupGain: 1,
      }],
      limiting: {
        enabled: true,
        threshold: -1.5,
        ceiling: -0.5,
        release: 80,
        lookahead: 5,
        oversampling: 2,
      },
      stereoWidth: 115,
      midSideProcessing: {
        enabled: true,
        midGain: 0,
        sideGain: 1,
        stereoWidth: 115,
      },
      saturation: {
        enabled: true,
        type: 'tape' as const,
        drive: 10,
        mix: 15,
      },
    } as MasteringSettings,
  },

  // Podcast / Spoken Word
  podcast: {
    name: 'Podcast / Voice',
    description: 'Clear speech, consistent loudness, de-essing',
    settings: {
      targetLUFS: -16,
      truePeakLimit: -1,
      eqBands: [
        { id: 'hp', enabled: true, frequency: 80, gain: 0, q: 0.7, type: 'highPass' as const },
        { id: 'rumble', enabled: true, frequency: 120, gain: -2, q: 1.0, type: 'bell' as const },
        { id: 'presence', enabled: true, frequency: 3000, gain: 2, q: 1.0, type: 'bell' as const },
        { id: 'deess', enabled: true, frequency: 7000, gain: -2, q: 2.0, type: 'bell' as const },
      ],
      compression: [{
        id: 'main',
        enabled: true,
        threshold: -20,
        ratio: 4,
        attack: 5,
        release: 80,
        knee: 6,
        makeupGain: 4,
      }],
      limiting: {
        enabled: true,
        threshold: -2,
        ceiling: -0.5,
        release: 50,
        lookahead: 5,
        oversampling: 1,
      },
      stereoWidth: 80,  // Narrow for speech
      midSideProcessing: {
        enabled: true,
        midGain: 2,
        sideGain: -2,
        stereoWidth: 80,
      },
    } as MasteringSettings,
  },

  // Ambient / Chill
  ambient: {
    name: 'Ambient / Chill',
    description: 'Spacious, gentle, with preserved dynamics',
    settings: {
      targetLUFS: -14,
      truePeakLimit: -0.8,
      eqBands: [
        { id: 'hp', enabled: true, frequency: 25, gain: 0, q: 0.5, type: 'highPass' as const },
        { id: 'warmth', enabled: true, frequency: 100, gain: 1, q: 0.7, type: 'lowShelf' as const },
        { id: 'air', enabled: true, frequency: 12000, gain: 2, q: 0.5, type: 'highShelf' as const },
      ],
      compression: [{
        id: 'main',
        enabled: true,
        threshold: -22,
        ratio: 2,
        attack: 30,
        release: 200,
        knee: 10,
        makeupGain: 1,
      }],
      limiting: {
        enabled: true,
        threshold: -1.5,
        ceiling: -0.5,
        release: 100,
        lookahead: 10,
        oversampling: 2,
      },
      stereoWidth: 140,
      midSideProcessing: {
        enabled: true,
        midGain: 0,
        sideGain: 2,
        stereoWidth: 140,
      },
      exciter: {
        enabled: true,
        amount: 20,
        harmonics: 3,
        mix: 15,
      },
      saturation: {
        enabled: true,
        type: 'tape' as const,
        drive: 10,
        mix: 20,
      },
    } as MasteringSettings,
  },

  // Electronic / Synthwave
  synthwave: {
    name: 'Synthwave / Retro',
    description: 'Vintage warmth with modern loudness',
    settings: {
      targetLUFS: -9,
      truePeakLimit: -0.3,
      eqBands: [
        { id: 'hp', enabled: true, frequency: 30, gain: 0, q: 0.7, type: 'highPass' as const },
        { id: 'bass', enabled: true, frequency: 80, gain: 2, q: 1.0, type: 'lowShelf' as const },
        { id: 'mids', enabled: true, frequency: 1000, gain: -0.5, q: 1.0, type: 'bell' as const },
        { id: 'presence', enabled: true, frequency: 6000, gain: 1.5, q: 1.0, type: 'bell' as const },
      ],
      compression: [{
        id: 'main',
        enabled: true,
        threshold: -14,
        ratio: 3.5,
        attack: 8,
        release: 90,
        knee: 4,
        makeupGain: 2.5,
      }],
      limiting: {
        enabled: true,
        threshold: -0.8,
        ceiling: -0.2,
        release: 40,
        lookahead: 5,
        oversampling: 2,
      },
      stereoWidth: 125,
      midSideProcessing: {
        enabled: true,
        midGain: 0,
        sideGain: 1.5,
        stereoWidth: 125,
      },
      saturation: {
        enabled: true,
        type: 'tape' as const,
        drive: 30,
        mix: 35,
      },
    } as MasteringSettings,
  },

  // Lo-Fi
  lofi: {
    name: 'Lo-Fi / Vintage',
    description: 'Warm, slightly degraded, nostalgic',
    settings: {
      targetLUFS: -14,
      truePeakLimit: -0.8,
      eqBands: [
        { id: 'hp', enabled: true, frequency: 100, gain: 0, q: 0.7, type: 'highPass' as const },
        { id: 'lp', enabled: true, frequency: 8000, gain: 0, q: 0.7, type: 'lowPass' as const },
        { id: 'warmth', enabled: true, frequency: 200, gain: 2, q: 0.7, type: 'lowShelf' as const },
        { id: 'mids', enabled: true, frequency: 800, gain: 1, q: 1.0, type: 'bell' as const },
      ],
      compression: [{
        id: 'main',
        enabled: true,
        threshold: -18,
        ratio: 3,
        attack: 20,
        release: 150,
        knee: 8,
        makeupGain: 2,
      }],
      limiting: {
        enabled: true,
        threshold: -1.5,
        ceiling: -0.5,
        release: 80,
        lookahead: 5,
        oversampling: 1,
      },
      stereoWidth: 90,
      midSideProcessing: {
        enabled: true,
        midGain: 1,
        sideGain: -1,
        stereoWidth: 90,
      },
      saturation: {
        enabled: true,
        type: 'tape' as const,
        drive: 40,
        mix: 50,
      },
      dithering: {
        enabled: true,
        type: 'triangular' as const,
        depth: 16,
        noiseShaping: true,
      },
    } as MasteringSettings,
  },
};

export type PresetName = keyof typeof MASTERING_PRESETS;

export function getPreset(name: PresetName): MasteringSettings {
  return MASTERING_PRESETS[name].settings;
}

export function getAllPresets(): Array<{
  id: PresetName;
  name: string;
  description: string;
}> {
  return Object.entries(MASTERING_PRESETS).map(([id, preset]) => ({
    id: id as PresetName,
    name: preset.name,
    description: preset.description,
  }));
}

export function detectGenre(analysis: any): PresetName {
  // Simple genre detection based on audio features
  const { musical, loudness, frequency } = analysis;

  // High energy + loud = EDM
  if (musical.energy > 0.8 && loudness.integratedLUFS > -12) {
    return 'edm';
  }

  // Heavy bass + punchy = Hip-Hop
  if (frequency.bass.percentage > 25 && loudness.crestFactor < 8) {
    return 'hiphop';
  }

  // High dynamic range = Classical
  if (loudness.dynamicRange > 12 && musical.acousticness > 0.7) {
    return 'classical';
  }

  // Narrow stereo + speech-like = Podcast
  if (analysis.stereo.stereoWidth < 60 && musical.instrumentalness < 0.3) {
    return 'podcast';
  }

  // Wide stereo + low energy = Ambient
  if (analysis.stereo.stereoWidth > 120 && musical.energy < 0.4) {
    return 'ambient';
  }

  // Default to pop
  return 'pop';
}
