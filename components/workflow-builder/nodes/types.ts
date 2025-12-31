import { Node, Edge } from 'reactflow';

// Node categories
export type NodeCategory = 'ai' | 'action' | 'condition' | 'data' | 'output';

// Platform types supported
export type AIPlatform =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'perplexity'
  | 'notebooklm'
  | 'suno'
  | 'udio'
  | 'midjourney'
  | 'dalle'
  | 'elevenlabs'
  | 'runway'
  | 'pika';

export type OutputPlatform = 'discord' | 'notion' | 'sheets' | 'webhook' | 'file';

// Base node data structure
export interface BaseNodeData {
  label: string;
  category: NodeCategory;
  description?: string;
  config: Record<string, any>;
  isConfigured: boolean;
}

// AI Platform node data
export interface AINodeData extends BaseNodeData {
  category: 'ai';
  platform: AIPlatform;
  config: {
    prompt?: string;
    extractSelector?: string;
    injectSelector?: string;
    waitCondition?: {
      type: 'element' | 'text' | 'timeout';
      value: string | number;
    };
    variables?: string[];
  };
}

// Action node data
export interface ActionNodeData extends BaseNodeData {
  category: 'action';
  actionType: 'click' | 'type' | 'scroll' | 'wait' | 'screenshot' | 'extract';
  config: {
    selector?: string;
    value?: string;
    duration?: number;
  };
}

// Condition node data
export interface ConditionNodeData extends BaseNodeData {
  category: 'condition';
  conditionType: 'contains' | 'equals' | 'regex' | 'length' | 'exists';
  config: {
    variable: string;
    operator: string;
    value: string;
    trueBranch?: string;
    falseBranch?: string;
  };
}

// Data transform node
export interface DataNodeData extends BaseNodeData {
  category: 'data';
  transformType: 'extract' | 'format' | 'merge' | 'split' | 'filter';
  config: {
    input?: string;
    output?: string;
    transform?: string;
    pattern?: string;
  };
}

// Output node data
export interface OutputNodeData extends BaseNodeData {
  category: 'output';
  platform: OutputPlatform;
  config: {
    target?: string;
    format?: string;
    template?: string;
  };
}

// Union type for all node data
export type WorkflowNodeData = AINodeData | ActionNodeData | ConditionNodeData | DataNodeData | OutputNodeData;

// Custom node type
export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

// Node template definitions for the palette
export interface NodeTemplate {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultData: Partial<WorkflowNodeData>;
}

// Platform-specific templates
export const AI_NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'chatgpt',
    category: 'ai',
    label: 'ChatGPT',
    description: 'OpenAI ChatGPT conversation',
    icon: '🤖',
    color: '#10a37f',
    defaultData: {
      platform: 'chatgpt',
      config: {
        extractSelector: '[data-message-author-role="assistant"]:last-child',
        injectSelector: '#prompt-textarea',
      }
    }
  },
  {
    type: 'claude',
    category: 'ai',
    label: 'Claude',
    description: 'Anthropic Claude conversation',
    icon: '🧠',
    color: '#cc785c',
    defaultData: {
      platform: 'claude',
      config: {
        extractSelector: '[data-is-streaming="false"]:last-child',
        injectSelector: '.ProseMirror',
      }
    }
  },
  {
    type: 'gemini',
    category: 'ai',
    label: 'Gemini',
    description: 'Google Gemini conversation',
    icon: '✨',
    color: '#4285f4',
    defaultData: {
      platform: 'gemini',
      config: {
        extractSelector: '.model-response-text:last-child',
        injectSelector: '.ql-editor',
      }
    }
  },
  {
    type: 'perplexity',
    category: 'ai',
    label: 'Perplexity',
    description: 'Perplexity AI search',
    icon: '🔍',
    color: '#20808d',
    defaultData: {
      platform: 'perplexity',
      config: {}
    }
  },
  {
    type: 'notebooklm',
    category: 'ai',
    label: 'NotebookLM',
    description: 'Google NotebookLM research',
    icon: '📓',
    color: '#ea4335',
    defaultData: {
      platform: 'notebooklm',
      config: {}
    }
  },
  {
    type: 'suno',
    category: 'ai',
    label: 'Suno',
    description: 'Suno AI music generation',
    icon: '🎵',
    color: '#000000',
    defaultData: {
      platform: 'suno',
      config: {
        extractSelector: '.song-card audio',
        injectSelector: 'textarea[name="prompt"]',
      }
    }
  },
  {
    type: 'udio',
    category: 'ai',
    label: 'Udio',
    description: 'Udio AI music generation',
    icon: '🎶',
    color: '#7c3aed',
    defaultData: {
      platform: 'udio',
      config: {}
    }
  },
  {
    type: 'midjourney',
    category: 'ai',
    label: 'Midjourney',
    description: 'Midjourney image generation',
    icon: '🎨',
    color: '#0d1117',
    defaultData: {
      platform: 'midjourney',
      config: {}
    }
  },
  {
    type: 'dalle',
    category: 'ai',
    label: 'DALL-E',
    description: 'OpenAI DALL-E images',
    icon: '🖼️',
    color: '#10a37f',
    defaultData: {
      platform: 'dalle',
      config: {}
    }
  },
  {
    type: 'elevenlabs',
    category: 'ai',
    label: 'ElevenLabs',
    description: 'ElevenLabs voice synthesis',
    icon: '🔊',
    color: '#000000',
    defaultData: {
      platform: 'elevenlabs',
      config: {}
    }
  }
];

export const ACTION_NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'click',
    category: 'action',
    label: 'Click',
    description: 'Click an element',
    icon: '👆',
    color: '#f59e0b',
    defaultData: {
      actionType: 'click',
      config: {}
    }
  },
  {
    type: 'type',
    category: 'action',
    label: 'Type',
    description: 'Type text into an element',
    icon: '⌨️',
    color: '#f59e0b',
    defaultData: {
      actionType: 'type',
      config: {}
    }
  },
  {
    type: 'wait',
    category: 'action',
    label: 'Wait',
    description: 'Wait for condition or timeout',
    icon: '⏳',
    color: '#f59e0b',
    defaultData: {
      actionType: 'wait',
      config: { duration: 1000 }
    }
  },
  {
    type: 'extract',
    category: 'action',
    label: 'Extract',
    description: 'Extract data from page',
    icon: '📋',
    color: '#f59e0b',
    defaultData: {
      actionType: 'extract',
      config: {}
    }
  }
];

export const CONDITION_NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'condition',
    category: 'condition',
    label: 'If/Else',
    description: 'Branch based on condition',
    icon: '🔀',
    color: '#8b5cf6',
    defaultData: {
      conditionType: 'contains',
      config: {}
    }
  },
  {
    type: 'loop',
    category: 'condition',
    label: 'Loop',
    description: 'Repeat steps',
    icon: '🔄',
    color: '#8b5cf6',
    defaultData: {
      conditionType: 'exists',
      config: {}
    }
  }
];

export const DATA_NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'transform',
    category: 'data',
    label: 'Transform',
    description: 'Transform data format',
    icon: '🔧',
    color: '#06b6d4',
    defaultData: {
      transformType: 'format',
      config: {}
    }
  },
  {
    type: 'merge',
    category: 'data',
    label: 'Merge',
    description: 'Merge multiple inputs',
    icon: '🔗',
    color: '#06b6d4',
    defaultData: {
      transformType: 'merge',
      config: {}
    }
  },
  {
    type: 'variable',
    category: 'data',
    label: 'Variable',
    description: 'Store/retrieve variable',
    icon: '📦',
    color: '#06b6d4',
    defaultData: {
      transformType: 'extract',
      config: {}
    }
  }
];

export const OUTPUT_NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'discord',
    category: 'output',
    label: 'Discord',
    description: 'Post to Discord',
    icon: '💬',
    color: '#5865f2',
    defaultData: {
      platform: 'discord',
      config: {}
    }
  },
  {
    type: 'notion',
    category: 'output',
    label: 'Notion',
    description: 'Save to Notion',
    icon: '📝',
    color: '#000000',
    defaultData: {
      platform: 'notion',
      config: {}
    }
  },
  {
    type: 'webhook',
    category: 'output',
    label: 'Webhook',
    description: 'Send to webhook URL',
    icon: '🌐',
    color: '#22c55e',
    defaultData: {
      platform: 'webhook',
      config: {}
    }
  },
  {
    type: 'file',
    category: 'output',
    label: 'Save File',
    description: 'Save to local file',
    icon: '💾',
    color: '#64748b',
    defaultData: {
      platform: 'file',
      config: {}
    }
  }
];

export const ALL_NODE_TEMPLATES = [
  ...AI_NODE_TEMPLATES,
  ...ACTION_NODE_TEMPLATES,
  ...CONDITION_NODE_TEMPLATES,
  ...DATA_NODE_TEMPLATES,
  ...OUTPUT_NODE_TEMPLATES,
];

// Helper to get category color
export function getCategoryColor(category: NodeCategory): string {
  switch (category) {
    case 'ai': return '#10a37f';
    case 'action': return '#f59e0b';
    case 'condition': return '#8b5cf6';
    case 'data': return '#06b6d4';
    case 'output': return '#5865f2';
    default: return '#64748b';
  }
}
