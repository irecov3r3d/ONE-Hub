// AI Model Configuration and Management
// Supports multiple music generation models for ensemble approach

export interface AIModelConfig {
  id: string;
  name: string;
  provider: 'replicate' | 'huggingface' | 'custom' | 'openai' | 'stability';
  modelId: string;
  strengths: string[];
  maxDuration: number; // seconds
  costPerGeneration: number; // USD
  avgGenerationTime: number; // seconds
  enabled: boolean;
}

export const AI_MODELS: Record<string, AIModelConfig> = {
  musicgen: {
    id: 'musicgen',
    name: 'MusicGen (Meta)',
    provider: 'replicate',
    modelId: 'meta/musicgen:7be0f12c54a8d033a0fbd14418c9af98962da9a86f5ff7811f9b3423a1f0b7d7',
    strengths: ['melody', 'coherent-structure', 'genre-accuracy'],
    maxDuration: 300,
    costPerGeneration: 0.05,
    avgGenerationTime: 45,
    enabled: true,
  },

  audiocraft: {
    id: 'audiocraft',
    name: 'AudioCraft (Meta)',
    provider: 'replicate',
    modelId: 'meta/audiocraft-plus:7a76a825e9e3f78f7c6a0c1f4c7b0e2f8d9e0a1b2c3d4e5f6g7h8i9j0k1l2m3n',
    strengths: ['effects', 'atmosphere', 'texture'],
    maxDuration: 300,
    costPerGeneration: 0.05,
    avgGenerationTime: 50,
    enabled: true,
  },

  riffusion: {
    id: 'riffusion',
    name: 'Riffusion',
    provider: 'replicate',
    modelId: 'riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05',
    strengths: ['experimentation', 'unique-sounds', 'creative'],
    maxDuration: 60,
    costPerGeneration: 0.03,
    avgGenerationTime: 30,
    enabled: true,
  },

  stableAudio: {
    id: 'stableAudio',
    name: 'Stable Audio',
    provider: 'stability',
    modelId: 'stable-audio-open-1.0',
    strengths: ['coherent-long-form', 'consistent-quality', 'stereo-width'],
    maxDuration: 300,
    costPerGeneration: 0.08,
    avgGenerationTime: 60,
    enabled: false, // Enable when API key is added
  },

  musicLM: {
    id: 'musicLM',
    name: 'MusicLM (Google)',
    provider: 'custom',
    modelId: 'google/musiclm',
    strengths: ['text-understanding', 'prompt-adherence', 'variety'],
    maxDuration: 300,
    costPerGeneration: 0.10,
    avgGenerationTime: 90,
    enabled: false, // Requires custom integration
  },
};

// Model selection strategy
export type ModelSelectionStrategy =
  | 'fastest'        // Use fastest model only
  | 'best-quality'   // Use highest quality model only
  | 'ensemble-all'   // Generate with all enabled models
  | 'ensemble-top3'  // Generate with top 3 models
  | 'adaptive';      // Choose based on prompt characteristics

export interface GenerationConfig {
  strategy: ModelSelectionStrategy;
  maxParallelModels: number;
  qualityThreshold: number; // 0-1, minimum quality to accept
  enableRefinement: boolean;
  enableMastering: boolean;
  targetLoudness: number; // LUFS
  outputFormat: 'wav' | 'mp3' | 'flac';
}

export const DEFAULT_CONFIG: GenerationConfig = {
  strategy: 'ensemble-top3',
  maxParallelModels: 3,
  qualityThreshold: 0.7,
  enableRefinement: true,
  enableMastering: true,
  targetLoudness: -14, // Industry standard for streaming
  outputFormat: 'wav',
};

// Get models based on strategy
export function selectModels(
  strategy: ModelSelectionStrategy,
  prompt: string,
  duration: number
): AIModelConfig[] {
  const enabledModels = Object.values(AI_MODELS).filter(
    m => m.enabled && m.maxDuration >= duration
  );

  switch (strategy) {
    case 'fastest':
      return [enabledModels.sort((a, b) => a.avgGenerationTime - b.avgGenerationTime)[0]];

    case 'best-quality':
      // MusicGen is generally highest quality for most cases
      return [AI_MODELS.musicgen];

    case 'ensemble-all':
      return enabledModels;

    case 'ensemble-top3':
      // Select top 3 based on cost-effectiveness and quality
      return [
        AI_MODELS.musicgen,
        AI_MODELS.audiocraft,
        AI_MODELS.riffusion,
      ].filter(m => m.enabled);

    case 'adaptive':
      // Analyze prompt to choose best models
      return adaptiveModelSelection(prompt, enabledModels);

    default:
      return [AI_MODELS.musicgen];
  }
}

function adaptiveModelSelection(
  prompt: string,
  availableModels: AIModelConfig[]
): AIModelConfig[] {
  const promptLower = prompt.toLowerCase();
  const selected: AIModelConfig[] = [];

  // If prompt mentions melody, structure - use MusicGen
  if (promptLower.match(/melody|tune|catchy|song|structure|rap|hip hop|vocal/)) {
    selected.push(AI_MODELS.musicgen);
  }

  // If prompt mentions atmosphere, ambient, texture - use AudioCraft
  if (promptLower.match(/ambient|atmosphere|texture|soundscape|mood|rock|guitar/)) {
    selected.push(AI_MODELS.audiocraft);
  }

  // If prompt mentions experimental, weird, unique - use Riffusion
  if (promptLower.match(/experimental|weird|unique|creative|different|dubstep|wobble/)) {
    selected.push(AI_MODELS.riffusion);
  }

  // If nothing matched or too few selected, add MusicGen as default
  if (selected.length === 0) {
    selected.push(AI_MODELS.musicgen);
  }

  // Ensure we have at least 2 for comparison
  if (selected.length === 1 && availableModels.length > 1) {
    const other = availableModels.find(m => m.id !== selected[0].id);
    if (other) selected.push(other);
  }

  return selected.filter(m => m.enabled);
}

// Quality metrics for ranking
export interface QualityMetrics {
  spectralClarity: number;      // 0-1
  dynamicRange: number;          // dB
  stereoWidth: number;           // 0-1
  frequencyBalance: number;      // 0-1
  rmsLevel: number;              // dB
  peakLevel: number;             // dB
  coherence: number;             // 0-1
  promptAdherence: number;       // 0-1 (AI-judged)
  overallScore: number;          // 0-1
}

export interface GenerationResult {
  id: string;
  modelId: string;
  modelName: string;
  audioUrl: string;
  duration: number;
  metrics: QualityMetrics;
  generationTime: number;
  cost: number;
  timestamp: Date;
}

export interface EnsembleResult {
  generations: GenerationResult[];
  bestGeneration: GenerationResult;
  refinedVersion?: string;
  masteredVersion?: string;
  totalCost: number;
  totalTime: number;
}
