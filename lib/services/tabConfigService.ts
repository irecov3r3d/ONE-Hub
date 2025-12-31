// Tab Configuration Service
// Manages tab configurations and provides presets for common AI tools

import {
  TabConfig,
  TabType,
  TabPreset,
  ExtractionRule,
  InputTarget,
  TabAction,
  ExtractionConfig,
  InputConfig,
} from '@/types/automation';

// ============================================================================
// TAB PRESET DEFINITIONS
// ============================================================================

const createPreset = (
  id: string,
  name: string,
  type: TabType,
  description: string,
  extraction: ExtractionConfig,
  input: InputConfig,
  actions: TabAction[],
  options: Record<string, any> = {}
): TabPreset => ({
  id,
  name,
  type,
  description,
  config: {
    name,
    type,
    description,
    extraction,
    input,
    actions,
    options,
  },
});

// ============================================================================
// AI CHAT PRESETS
// ============================================================================

export const CHATGPT_PRESET = createPreset(
  'chatgpt',
  'ChatGPT',
  'ai-chat',
  'OpenAI ChatGPT web interface',
  {
    rules: [
      {
        id: 'response-text',
        name: 'AI Response',
        method: 'selector',
        selector: '[data-message-author-role="assistant"] .markdown',
        transform: [{ type: 'trim' }],
      },
      {
        id: 'last-response',
        name: 'Last Response',
        method: 'selector',
        selector: '[data-message-author-role="assistant"]:last-child .markdown',
        transform: [{ type: 'trim' }],
      },
      {
        id: 'code-blocks',
        name: 'Code Blocks',
        method: 'selector',
        selector: '[data-message-author-role="assistant"] pre code',
      },
    ],
    combineMode: 'object',
  },
  {
    targets: [
      {
        id: 'prompt-input',
        name: 'Prompt Input',
        method: 'type',
        selector: '#prompt-textarea',
        delay: 30,
        clearFirst: true,
      },
    ],
    submitAction: {
      id: 'send',
      name: 'Send Message',
      type: 'click',
      selector: '[data-testid="send-button"]',
    },
  },
  [
    {
      id: 'new-chat',
      name: 'New Chat',
      type: 'click',
      selector: '[data-testid="create-new-chat-button"]',
    },
    {
      id: 'wait-response',
      name: 'Wait for Response',
      type: 'wait',
      duration: 5000,
    },
    {
      id: 'copy-code',
      name: 'Copy Code Block',
      type: 'click',
      selector: '[data-testid="copy-code-button"]',
    },
  ],
  { model: 'gpt-4', temperature: 0.7 }
);

export const CLAUDE_PRESET = createPreset(
  'claude',
  'Claude',
  'ai-chat',
  'Anthropic Claude web interface',
  {
    rules: [
      {
        id: 'response-text',
        name: 'AI Response',
        method: 'selector',
        selector: '[data-is-streaming="false"] .prose',
        transform: [{ type: 'trim' }],
      },
      {
        id: 'last-response',
        name: 'Last Response',
        method: 'selector',
        selector: '.prose:last-of-type',
        transform: [{ type: 'trim' }],
      },
      {
        id: 'artifacts',
        name: 'Artifacts',
        method: 'selector',
        selector: '[data-artifact-id]',
      },
    ],
    combineMode: 'object',
  },
  {
    targets: [
      {
        id: 'prompt-input',
        name: 'Prompt Input',
        method: 'type',
        selector: '[contenteditable="true"]',
        delay: 30,
        clearFirst: true,
      },
    ],
    submitAction: {
      id: 'send',
      name: 'Send Message',
      type: 'click',
      selector: 'button[aria-label="Send Message"]',
    },
  },
  [
    {
      id: 'new-chat',
      name: 'New Chat',
      type: 'click',
      selector: '[data-testid="new-chat"]',
    },
    {
      id: 'wait-response',
      name: 'Wait for Response',
      type: 'wait',
      duration: 5000,
    },
  ],
  { model: 'claude-3-opus' }
);

export const GEMINI_PRESET = createPreset(
  'gemini',
  'Google Gemini',
  'ai-chat',
  'Google Gemini AI interface',
  {
    rules: [
      {
        id: 'response-text',
        name: 'AI Response',
        method: 'selector',
        selector: 'model-response .response-content',
        transform: [{ type: 'trim' }],
      },
    ],
    combineMode: 'object',
  },
  {
    targets: [
      {
        id: 'prompt-input',
        name: 'Prompt Input',
        method: 'type',
        selector: 'rich-textarea',
        delay: 30,
        clearFirst: true,
      },
    ],
    submitAction: {
      id: 'send',
      name: 'Send Message',
      type: 'click',
      selector: 'button.send-button',
    },
  },
  [
    {
      id: 'new-chat',
      name: 'New Chat',
      type: 'click',
      selector: 'button[aria-label="New chat"]',
    },
  ],
  {}
);

// ============================================================================
// AI IMAGE PRESETS
// ============================================================================

export const MIDJOURNEY_PRESET = createPreset(
  'midjourney',
  'Midjourney (Discord)',
  'ai-image',
  'Midjourney via Discord interface',
  {
    rules: [
      {
        id: 'generated-images',
        name: 'Generated Images',
        method: 'selector',
        selector: 'img[data-safe-src]',
      },
      {
        id: 'latest-image',
        name: 'Latest Image URL',
        method: 'selector',
        selector: '[class*="imageWrapper"] img:last-child',
      },
    ],
    combineMode: 'object',
  },
  {
    targets: [
      {
        id: 'prompt-input',
        name: 'Discord Message',
        method: 'type',
        selector: '[data-slate-editor="true"]',
        delay: 50,
        clearFirst: true,
      },
    ],
    submitAction: {
      id: 'send',
      name: 'Send Message',
      type: 'evaluate',
      script: 'document.querySelector(\'[data-slate-editor="true"]\').dispatchEvent(new KeyboardEvent("keydown", {key: "Enter"}))',
    },
  },
  [
    {
      id: 'upscale-1',
      name: 'Upscale U1',
      type: 'click',
      selector: 'button:contains("U1")',
    },
    {
      id: 'vary-subtle',
      name: 'Vary Subtle',
      type: 'click',
      selector: 'button:contains("Vary (Subtle)")',
    },
  ],
  { aspectRatio: '1:1', version: 6 }
);

export const DALLE_PRESET = createPreset(
  'dalle',
  'DALL-E (ChatGPT)',
  'ai-image',
  'DALL-E image generation via ChatGPT',
  {
    rules: [
      {
        id: 'generated-image',
        name: 'Generated Image',
        method: 'selector',
        selector: '[data-message-author-role="assistant"] img[alt]',
      },
    ],
    combineMode: 'object',
  },
  {
    targets: [
      {
        id: 'prompt-input',
        name: 'Image Prompt',
        method: 'type',
        selector: '#prompt-textarea',
        delay: 30,
        clearFirst: true,
      },
    ],
    submitAction: {
      id: 'send',
      name: 'Generate',
      type: 'click',
      selector: '[data-testid="send-button"]',
    },
  },
  [
    {
      id: 'download-image',
      name: 'Download Image',
      type: 'click',
      selector: 'button[aria-label="Download"]',
    },
  ],
  { size: '1024x1024', quality: 'hd' }
);

// ============================================================================
// AI AUDIO PRESETS
// ============================================================================

export const SUNO_PRESET = createPreset(
  'suno',
  'Suno AI',
  'ai-audio',
  'Suno AI music generation',
  {
    rules: [
      {
        id: 'generated-tracks',
        name: 'Generated Tracks',
        method: 'selector',
        selector: '[data-track-id]',
      },
      {
        id: 'audio-url',
        name: 'Audio URL',
        method: 'selector',
        selector: 'audio source',
      },
      {
        id: 'track-title',
        name: 'Track Title',
        method: 'selector',
        selector: '.track-title',
      },
    ],
    combineMode: 'object',
  },
  {
    targets: [
      {
        id: 'song-description',
        name: 'Song Description',
        method: 'type',
        selector: 'textarea[placeholder*="description"]',
        delay: 30,
        clearFirst: true,
      },
      {
        id: 'lyrics-input',
        name: 'Lyrics',
        method: 'type',
        selector: 'textarea[placeholder*="lyrics"]',
        delay: 20,
        clearFirst: true,
      },
    ],
    submitAction: {
      id: 'create',
      name: 'Create Song',
      type: 'click',
      selector: 'button:contains("Create")',
    },
  },
  [
    {
      id: 'download-audio',
      name: 'Download Audio',
      type: 'click',
      selector: 'button[aria-label="Download"]',
    },
    {
      id: 'extend-song',
      name: 'Extend Song',
      type: 'click',
      selector: 'button:contains("Extend")',
    },
  ],
  { style: 'custom', duration: 120 }
);

export const ELEVENLABS_PRESET = createPreset(
  'elevenlabs',
  'ElevenLabs',
  'ai-audio',
  'ElevenLabs voice synthesis',
  {
    rules: [
      {
        id: 'generated-audio',
        name: 'Generated Audio',
        method: 'selector',
        selector: 'audio',
      },
    ],
    combineMode: 'object',
  },
  {
    targets: [
      {
        id: 'text-input',
        name: 'Text to Speak',
        method: 'type',
        selector: 'textarea',
        delay: 20,
        clearFirst: true,
      },
      {
        id: 'voice-select',
        name: 'Voice Selection',
        method: 'select',
        selector: 'select[name="voice"]',
      },
    ],
    submitAction: {
      id: 'generate',
      name: 'Generate',
      type: 'click',
      selector: 'button:contains("Generate")',
    },
  },
  [
    {
      id: 'download',
      name: 'Download Audio',
      type: 'click',
      selector: 'button[aria-label="Download"]',
    },
  ],
  { voice: 'adam', stability: 0.5, clarity: 0.75 }
);

// ============================================================================
// AI CODE PRESETS
// ============================================================================

export const GITHUB_COPILOT_PRESET = createPreset(
  'github-copilot',
  'GitHub Copilot',
  'ai-code',
  'GitHub Copilot in VS Code (web)',
  {
    rules: [
      {
        id: 'suggestions',
        name: 'Code Suggestions',
        method: 'selector',
        selector: '.ghost-text',
      },
      {
        id: 'chat-response',
        name: 'Chat Response',
        method: 'selector',
        selector: '.copilot-chat-response',
      },
    ],
    combineMode: 'object',
  },
  {
    targets: [
      {
        id: 'chat-input',
        name: 'Chat Input',
        method: 'type',
        selector: '.copilot-chat-input',
        delay: 30,
        clearFirst: true,
      },
    ],
    submitAction: {
      id: 'send',
      name: 'Send',
      type: 'evaluate',
      script: 'document.querySelector(".copilot-chat-input").dispatchEvent(new KeyboardEvent("keydown", {key: "Enter"}))',
    },
  },
  [
    {
      id: 'accept-suggestion',
      name: 'Accept Suggestion',
      type: 'evaluate',
      script: 'document.dispatchEvent(new KeyboardEvent("keydown", {key: "Tab"}))',
    },
  ],
  {}
);

export const REPLIT_PRESET = createPreset(
  'replit',
  'Replit AI',
  'ai-code',
  'Replit AI assistant',
  {
    rules: [
      {
        id: 'ai-response',
        name: 'AI Response',
        method: 'selector',
        selector: '[data-cy="ai-response"]',
      },
      {
        id: 'generated-code',
        name: 'Generated Code',
        method: 'selector',
        selector: '.ai-generated-code',
      },
    ],
    combineMode: 'object',
  },
  {
    targets: [
      {
        id: 'ai-prompt',
        name: 'AI Prompt',
        method: 'type',
        selector: '[data-cy="ai-input"]',
        delay: 30,
        clearFirst: true,
      },
    ],
    submitAction: {
      id: 'send',
      name: 'Send',
      type: 'click',
      selector: '[data-cy="ai-submit"]',
    },
  },
  [
    {
      id: 'apply-code',
      name: 'Apply Generated Code',
      type: 'click',
      selector: 'button:contains("Apply")',
    },
  ],
  {}
);

// ============================================================================
// AI VIDEO PRESETS
// ============================================================================

export const RUNWAY_PRESET = createPreset(
  'runway',
  'Runway ML',
  'ai-video',
  'Runway ML video generation',
  {
    rules: [
      {
        id: 'generated-video',
        name: 'Generated Video',
        method: 'selector',
        selector: 'video source',
      },
      {
        id: 'project-name',
        name: 'Project Name',
        method: 'selector',
        selector: '.project-title',
      },
    ],
    combineMode: 'object',
  },
  {
    targets: [
      {
        id: 'prompt-input',
        name: 'Video Prompt',
        method: 'type',
        selector: 'textarea[placeholder*="prompt"]',
        delay: 30,
        clearFirst: true,
      },
    ],
    submitAction: {
      id: 'generate',
      name: 'Generate Video',
      type: 'click',
      selector: 'button:contains("Generate")',
    },
  },
  [
    {
      id: 'download-video',
      name: 'Download Video',
      type: 'click',
      selector: 'button[aria-label="Download"]',
    },
  ],
  { model: 'gen-2', duration: 4 }
);

// ============================================================================
// DATA SOURCE PRESETS
// ============================================================================

export const GOOGLE_SHEETS_PRESET = createPreset(
  'google-sheets',
  'Google Sheets',
  'data-source',
  'Google Sheets spreadsheet',
  {
    rules: [
      {
        id: 'cell-value',
        name: 'Selected Cell Value',
        method: 'selector',
        selector: '.cell-input input',
      },
      {
        id: 'range-values',
        name: 'Selected Range',
        method: 'selector',
        selector: '.selection-box .cell-content',
      },
    ],
    combineMode: 'array',
  },
  {
    targets: [
      {
        id: 'cell-input',
        name: 'Cell Input',
        method: 'type',
        selector: '.cell-input input',
        delay: 20,
        clearFirst: true,
        pressEnter: true,
      },
    ],
  },
  [
    {
      id: 'copy',
      name: 'Copy Selection',
      type: 'evaluate',
      script: 'document.execCommand("copy")',
    },
    {
      id: 'paste',
      name: 'Paste',
      type: 'evaluate',
      script: 'document.execCommand("paste")',
    },
  ],
  {}
);

export const NOTION_PRESET = createPreset(
  'notion',
  'Notion',
  'data-source',
  'Notion workspace',
  {
    rules: [
      {
        id: 'page-content',
        name: 'Page Content',
        method: 'selector',
        selector: '.notion-page-content',
        transform: [{ type: 'trim' }],
      },
      {
        id: 'block-text',
        name: 'Selected Block Text',
        method: 'selector',
        selector: '[data-block-id].selected .notranslate',
      },
    ],
    combineMode: 'object',
  },
  {
    targets: [
      {
        id: 'block-input',
        name: 'Block Input',
        method: 'type',
        selector: '[contenteditable="true"]',
        delay: 30,
      },
    ],
  },
  [
    {
      id: 'new-page',
      name: 'New Page',
      type: 'evaluate',
      script: 'document.dispatchEvent(new KeyboardEvent("keydown", {key: "n", ctrlKey: true, shiftKey: true}))',
    },
  ],
  {}
);

// ============================================================================
// ALL PRESETS
// ============================================================================

export const ALL_PRESETS: TabPreset[] = [
  // AI Chat
  CHATGPT_PRESET,
  CLAUDE_PRESET,
  GEMINI_PRESET,
  // AI Image
  MIDJOURNEY_PRESET,
  DALLE_PRESET,
  // AI Audio
  SUNO_PRESET,
  ELEVENLABS_PRESET,
  // AI Code
  GITHUB_COPILOT_PRESET,
  REPLIT_PRESET,
  // AI Video
  RUNWAY_PRESET,
  // Data Sources
  GOOGLE_SHEETS_PRESET,
  NOTION_PRESET,
];

// ============================================================================
// TAB CONFIGURATION SERVICE
// ============================================================================

export class TabConfigService {
  private static configs: Map<string, TabConfig> = new Map();

  static getPresets(): TabPreset[] {
    return ALL_PRESETS;
  }

  static getPresetsByType(type: TabType): TabPreset[] {
    return ALL_PRESETS.filter((p) => p.type === type);
  }

  static getPresetById(id: string): TabPreset | undefined {
    return ALL_PRESETS.find((p) => p.id === id);
  }

  static createFromPreset(presetId: string, customizations?: Partial<TabConfig>): TabConfig {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      throw new Error(`Preset not found: ${presetId}`);
    }

    const now = new Date();
    const config: TabConfig = {
      id: this.generateId(),
      ...preset.config,
      ...customizations,
      createdAt: now,
      updatedAt: now,
    };

    this.configs.set(config.id, config);
    return config;
  }

  static createCustomTab(config: Omit<TabConfig, 'id' | 'createdAt' | 'updatedAt'>): TabConfig {
    const now = new Date();
    const fullConfig: TabConfig = {
      ...config,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };

    this.configs.set(fullConfig.id, fullConfig);
    return fullConfig;
  }

  static updateTab(id: string, updates: Partial<TabConfig>): TabConfig {
    const existing = this.configs.get(id);
    if (!existing) {
      throw new Error(`Tab config not found: ${id}`);
    }

    const updated: TabConfig = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.configs.set(id, updated);
    return updated;
  }

  static deleteTab(id: string): boolean {
    return this.configs.delete(id);
  }

  static getTab(id: string): TabConfig | undefined {
    return this.configs.get(id);
  }

  static getAllTabs(): TabConfig[] {
    return Array.from(this.configs.values());
  }

  static addExtractionRule(tabId: string, rule: Omit<ExtractionRule, 'id'>): ExtractionRule {
    const tab = this.configs.get(tabId);
    if (!tab) {
      throw new Error(`Tab not found: ${tabId}`);
    }

    const newRule: ExtractionRule = {
      ...rule,
      id: this.generateId('rule'),
    };

    tab.extraction.rules.push(newRule);
    tab.updatedAt = new Date();
    return newRule;
  }

  static addInputTarget(tabId: string, target: Omit<InputTarget, 'id'>): InputTarget {
    const tab = this.configs.get(tabId);
    if (!tab) {
      throw new Error(`Tab not found: ${tabId}`);
    }

    const newTarget: InputTarget = {
      ...target,
      id: this.generateId('target'),
    };

    tab.input.targets.push(newTarget);
    tab.updatedAt = new Date();
    return newTarget;
  }

  static addAction(tabId: string, action: Omit<TabAction, 'id'>): TabAction {
    const tab = this.configs.get(tabId);
    if (!tab) {
      throw new Error(`Tab not found: ${tabId}`);
    }

    const newAction: TabAction = {
      ...action,
      id: this.generateId('action'),
    };

    tab.actions.push(newAction);
    tab.updatedAt = new Date();
    return newAction;
  }

  static exportConfig(tabId: string): string {
    const tab = this.configs.get(tabId);
    if (!tab) {
      throw new Error(`Tab not found: ${tabId}`);
    }
    return JSON.stringify(tab, null, 2);
  }

  static importConfig(json: string): TabConfig {
    const parsed = JSON.parse(json);
    const now = new Date();

    const config: TabConfig = {
      ...parsed,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };

    this.configs.set(config.id, config);
    return config;
  }

  private static generateId(prefix = 'tab'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
