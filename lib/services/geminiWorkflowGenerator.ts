/**
 * Gemini-powered Workflow Generator
 * Converts natural language descriptions into visual workflow nodes
 */

import { Node, Edge } from 'reactflow';
import { WorkflowNodeData, AINodeData, ActionNodeData, ConditionNodeData, DataNodeData, OutputNodeData, AIPlatform, NodeCategory } from '@/components/workflow-builder/nodes/types';

// Gemini API configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface GeneratedWorkflow {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  name: string;
  description: string;
}

interface WorkflowGenerationResult {
  success: boolean;
  workflow?: GeneratedWorkflow;
  error?: string;
}

// Platform detection keywords
const PLATFORM_KEYWORDS: Record<string, AIPlatform> = {
  'chatgpt': 'chatgpt',
  'gpt': 'chatgpt',
  'openai': 'chatgpt',
  'claude': 'claude',
  'anthropic': 'claude',
  'gemini': 'gemini',
  'bard': 'gemini',
  'google ai': 'gemini',
  'perplexity': 'perplexity',
  'notebooklm': 'notebooklm',
  'notebook': 'notebooklm',
  'suno': 'suno',
  'music': 'suno',
  'song': 'suno',
  'udio': 'udio',
  'midjourney': 'midjourney',
  'mj': 'midjourney',
  'dalle': 'dalle',
  'dall-e': 'dalle',
  'image': 'midjourney',
  'elevenlabs': 'elevenlabs',
  'voice': 'elevenlabs',
  'tts': 'elevenlabs',
};

const OUTPUT_KEYWORDS: Record<string, string> = {
  'discord': 'discord',
  'notion': 'notion',
  'webhook': 'webhook',
  'save': 'file',
  'file': 'file',
  'download': 'file',
};

/**
 * Generate a workflow from natural language using Gemini
 */
export async function generateWorkflowFromDescription(
  description: string,
  apiKey: string
): Promise<WorkflowGenerationResult> {
  if (!apiKey) {
    return { success: false, error: 'Gemini API key is required' };
  }

  if (!description.trim()) {
    return { success: false, error: 'Please describe what you want the workflow to do' };
  }

  try {
    const prompt = buildPrompt(description);
    const response = await callGeminiAPI(prompt, apiKey);

    if (!response.success) {
      return { success: false, error: response.error };
    }

    const workflow = parseGeminiResponse(response.text!, description);
    return { success: true, workflow };
  } catch (error) {
    console.error('Workflow generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate workflow'
    };
  }
}

/**
 * Build the prompt for Gemini
 */
function buildPrompt(description: string): string {
  return `You are a workflow automation expert. Convert this natural language description into a structured workflow.

USER REQUEST: "${description}"

Analyze the request and output a JSON workflow with this EXACT structure:
{
  "name": "Short workflow name",
  "description": "One sentence description",
  "steps": [
    {
      "type": "ai" | "action" | "condition" | "data" | "output",
      "platform": "chatgpt" | "claude" | "gemini" | "suno" | "midjourney" | "notebooklm" | "discord" | "notion" | etc,
      "label": "Step name",
      "prompt": "What to ask/do (for AI steps)",
      "action": "click" | "wait" | "extract" (for action steps),
      "condition": "contains X" (for condition steps),
      "target": "where to send output (for output steps)"
    }
  ]
}

RULES:
1. Order steps logically - data flows from one to the next
2. Use appropriate platforms based on the task:
   - Text/chat tasks: chatgpt, claude, gemini
   - Music generation: suno, udio
   - Image generation: midjourney, dalle
   - Research: perplexity, notebooklm
   - Voice: elevenlabs
   - Output: discord, notion, webhook, file
3. Keep prompts specific and actionable
4. Add conditions if the user mentions "if", "when", "check", etc.
5. Maximum 10 steps

Respond with ONLY the JSON, no explanation.`;
}

/**
 * Call the Gemini API
 */
async function callGeminiAPI(
  prompt: string,
  apiKey: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || `API error: ${response.status}`
      };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return { success: false, error: 'No response from Gemini' };
    }

    return { success: true, text };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'API request failed'
    };
  }
}

/**
 * Parse Gemini's response into workflow nodes and edges
 */
function parseGeminiResponse(responseText: string, originalDescription: string): GeneratedWorkflow {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = responseText;
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr.trim());
  } catch {
    // If JSON parsing fails, generate a simple workflow from keywords
    return generateFallbackWorkflow(originalDescription);
  }

  const nodes: Node<WorkflowNodeData>[] = [];
  const edges: Edge[] = [];

  const steps = parsed.steps || [];

  steps.forEach((step: any, index: number) => {
    const nodeId = `node-${Date.now()}-${index}`;
    const position = { x: 100 + (index % 4) * 250, y: 100 + Math.floor(index / 4) * 150 };

    const node = createNodeFromStep(step, nodeId, position);
    if (node) {
      nodes.push(node);

      // Create edge from previous node
      if (index > 0 && nodes.length > 1) {
        edges.push({
          id: `edge-${index}`,
          source: nodes[nodes.length - 2].id,
          target: nodeId,
          type: 'smoothstep',
          animated: true,
        });
      }
    }
  });

  // If no nodes were created, use fallback
  if (nodes.length === 0) {
    return generateFallbackWorkflow(originalDescription);
  }

  return {
    nodes,
    edges,
    name: parsed.name || 'Generated Workflow',
    description: parsed.description || originalDescription,
  };
}

/**
 * Create a node from a parsed step
 */
function createNodeFromStep(
  step: any,
  nodeId: string,
  position: { x: number; y: number }
): Node<WorkflowNodeData> | null {
  const type = step.type?.toLowerCase() || 'ai';
  const platform = step.platform?.toLowerCase() || 'chatgpt';

  switch (type) {
    case 'ai':
      return {
        id: nodeId,
        type: 'ai',
        position,
        data: {
          label: step.label || `${platform} Step`,
          category: 'ai' as NodeCategory,
          platform: (platform as AIPlatform) || 'chatgpt',
          isConfigured: !!step.prompt,
          config: {
            prompt: step.prompt || '',
            extractSelector: getDefaultExtractSelector(platform),
            injectSelector: getDefaultInjectSelector(platform),
          },
        } as AINodeData,
      };

    case 'action':
      return {
        id: nodeId,
        type: 'action',
        position,
        data: {
          label: step.label || 'Action',
          category: 'action' as NodeCategory,
          actionType: step.action || 'click',
          isConfigured: !!step.selector,
          config: {
            selector: step.selector || '',
            duration: step.duration || 1000,
          },
        } as ActionNodeData,
      };

    case 'condition':
      return {
        id: nodeId,
        type: 'condition',
        position,
        data: {
          label: step.label || 'Condition',
          category: 'condition' as NodeCategory,
          conditionType: 'contains',
          isConfigured: !!step.condition,
          config: {
            variable: 'previousOutput',
            operator: 'contains',
            value: step.condition || '',
          },
        } as ConditionNodeData,
      };

    case 'data':
    case 'transform':
      return {
        id: nodeId,
        type: 'data',
        position,
        data: {
          label: step.label || 'Transform',
          category: 'data' as NodeCategory,
          transformType: 'format',
          isConfigured: !!step.transform,
          config: {
            transform: step.transform || '',
            output: step.output || 'transformedData',
          },
        } as DataNodeData,
      };

    case 'output':
      return {
        id: nodeId,
        type: 'output',
        position,
        data: {
          label: step.label || `${platform} Output`,
          category: 'output' as NodeCategory,
          platform: platform as any,
          isConfigured: !!step.target,
          config: {
            target: step.target || '',
            template: step.template || '{{previousOutput}}',
          },
        } as OutputNodeData,
      };

    default:
      return null;
  }
}

/**
 * Generate a fallback workflow by parsing keywords from description
 */
function generateFallbackWorkflow(description: string): GeneratedWorkflow {
  const lowerDesc = description.toLowerCase();
  const nodes: Node<WorkflowNodeData>[] = [];
  const edges: Edge[] = [];

  let nodeIndex = 0;

  // Detect AI platforms mentioned
  const detectedPlatforms: AIPlatform[] = [];
  for (const [keyword, platform] of Object.entries(PLATFORM_KEYWORDS)) {
    if (lowerDesc.includes(keyword) && !detectedPlatforms.includes(platform)) {
      detectedPlatforms.push(platform);
    }
  }

  // Detect output platforms
  const detectedOutputs: string[] = [];
  for (const [keyword, output] of Object.entries(OUTPUT_KEYWORDS)) {
    if (lowerDesc.includes(keyword) && !detectedOutputs.includes(output)) {
      detectedOutputs.push(output);
    }
  }

  // If no platforms detected, default to chatgpt
  if (detectedPlatforms.length === 0) {
    detectedPlatforms.push('chatgpt');
  }

  // Create nodes for each detected platform
  detectedPlatforms.forEach((platform, i) => {
    const nodeId = `node-${Date.now()}-${nodeIndex}`;
    const position = { x: 100 + (nodeIndex % 4) * 250, y: 100 + Math.floor(nodeIndex / 4) * 150 };

    nodes.push({
      id: nodeId,
      type: 'ai',
      position,
      data: {
        label: getPlatformLabel(platform),
        category: 'ai' as NodeCategory,
        platform,
        isConfigured: false,
        config: {
          prompt: '',
          extractSelector: getDefaultExtractSelector(platform),
          injectSelector: getDefaultInjectSelector(platform),
        },
      } as AINodeData,
    });

    // Add edge from previous node
    if (nodeIndex > 0) {
      edges.push({
        id: `edge-${nodeIndex}`,
        source: nodes[nodeIndex - 1].id,
        target: nodeId,
        type: 'smoothstep',
        animated: true,
      });
    }

    nodeIndex++;
  });

  // Add output nodes
  detectedOutputs.forEach((output) => {
    const nodeId = `node-${Date.now()}-${nodeIndex}`;
    const position = { x: 100 + (nodeIndex % 4) * 250, y: 100 + Math.floor(nodeIndex / 4) * 150 };

    nodes.push({
      id: nodeId,
      type: 'output',
      position,
      data: {
        label: output.charAt(0).toUpperCase() + output.slice(1),
        category: 'output' as NodeCategory,
        platform: output as any,
        isConfigured: false,
        config: {},
      } as OutputNodeData,
    });

    if (nodeIndex > 0) {
      edges.push({
        id: `edge-${nodeIndex}`,
        source: nodes[nodeIndex - 1].id,
        target: nodeId,
        type: 'smoothstep',
        animated: true,
      });
    }

    nodeIndex++;
  });

  return {
    nodes,
    edges,
    name: 'Generated Workflow',
    description,
  };
}

function getPlatformLabel(platform: AIPlatform): string {
  const labels: Record<string, string> = {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    gemini: 'Gemini',
    perplexity: 'Perplexity',
    notebooklm: 'NotebookLM',
    suno: 'Suno',
    udio: 'Udio',
    midjourney: 'Midjourney',
    dalle: 'DALL-E',
    elevenlabs: 'ElevenLabs',
    runway: 'Runway',
    pika: 'Pika',
  };
  return labels[platform] || platform;
}

function getDefaultExtractSelector(platform: string): string {
  const selectors: Record<string, string> = {
    chatgpt: '[data-message-author-role="assistant"]:last-child',
    claude: '[data-is-streaming="false"]:last-child .prose',
    gemini: '.model-response-text:last-child',
    suno: '.song-card audio',
    notebooklm: '.response-container',
  };
  return selectors[platform] || '.response:last-child';
}

function getDefaultInjectSelector(platform: string): string {
  const selectors: Record<string, string> = {
    chatgpt: '#prompt-textarea',
    claude: '.ProseMirror',
    gemini: '.ql-editor',
    suno: 'textarea[name="prompt"]',
    notebooklm: 'textarea',
  };
  return selectors[platform] || 'textarea';
}
