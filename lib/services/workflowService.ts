// Workflow Service
// Manages workflow definitions, templates, and execution history

import {
  Workflow,
  WorkflowStep,
  WorkflowOptions,
  WorkflowTemplate,
  TemplateVariable,
  WorkflowExecution,
  DataMapping,
  StepCondition,
  TabType,
} from '@/types/automation';
import { automationEngine } from './automationEngine';

// ============================================================================
// WORKFLOW TEMPLATES
// ============================================================================

const createTemplate = (
  id: string,
  name: string,
  description: string,
  category: string,
  requiredTabs: TabType[],
  steps: Omit<WorkflowStep, 'id'>[],
  variables: TemplateVariable[] = [],
  options: Partial<WorkflowOptions> = {}
): WorkflowTemplate => {
  const stepsWithIds: WorkflowStep[] = steps.map((step, index) => ({
    ...step,
    id: `step_${index + 1}`,
  }));

  return {
    id,
    name,
    description,
    category,
    workflow: {
      name,
      description,
      tabs: [],
      steps: stepsWithIds,
      defaultOrder: stepsWithIds.map((s) => s.id),
      options: {
        sequential: true,
        stopOnError: false,
        logLevel: 'info',
        saveHistory: true,
        notifyOnComplete: true,
        ...options,
      },
      variables: {},
    },
    requiredTabs,
    variables,
  };
};

// ============================================================================
// PRE-BUILT WORKFLOW TEMPLATES
// ============================================================================

export const CONTENT_PIPELINE_TEMPLATE = createTemplate(
  'content-pipeline',
  'AI Content Pipeline',
  'Generate content through multiple AI tools in sequence: ideation → writing → refinement → images',
  'content',
  ['ai-chat', 'ai-image'],
  [
    {
      name: 'Generate Ideas',
      description: 'Use ChatGPT to brainstorm content ideas',
      tabId: 'chatgpt',
      type: 'input',
      config: {
        inputTargets: ['prompt-input'],
        inputData: { 'prompt-input': '{{ideaPrompt}}' },
      },
    },
    {
      name: 'Wait for Ideas',
      description: 'Wait for ChatGPT to generate ideas',
      tabId: 'chatgpt',
      type: 'wait',
      config: {
        waitDuration: 10000,
      },
    },
    {
      name: 'Extract Ideas',
      description: 'Extract generated ideas from ChatGPT',
      tabId: 'chatgpt',
      type: 'extract',
      config: {
        extractionRules: ['last-response'],
      },
      outputMapping: [
        { source: 'output.last-response', target: 'ideas' },
      ],
    },
    {
      name: 'Refine with Claude',
      description: 'Use Claude to refine and expand the ideas',
      tabId: 'claude',
      type: 'input',
      config: {
        inputTargets: ['prompt-input'],
      },
      inputMapping: [
        {
          source: 'ideas',
          target: 'prompt-input',
          transform: [
            {
              type: 'template',
              template: 'Please refine and expand on these ideas:\n\n{{ideas}}',
            },
          ],
        },
      ],
    },
    {
      name: 'Wait for Refinement',
      description: 'Wait for Claude to process',
      tabId: 'claude',
      type: 'wait',
      config: {
        waitDuration: 15000,
      },
    },
    {
      name: 'Extract Refined Content',
      description: 'Extract refined content from Claude',
      tabId: 'claude',
      type: 'extract',
      config: {
        extractionRules: ['last-response'],
      },
      outputMapping: [
        { source: 'output.last-response', target: 'refinedContent' },
      ],
    },
    {
      name: 'Generate Image Prompt',
      description: 'Create an image prompt from the content',
      tabId: '',
      type: 'transform',
      config: {
        transforms: [
          {
            type: 'template',
            template: 'Create a professional, visually stunning image representing: {{refinedContent}}',
          },
        ],
      },
      inputMapping: [
        { source: 'refinedContent', target: 'content' },
      ],
      outputMapping: [
        { source: 'output', target: 'imagePrompt' },
      ],
    },
    {
      name: 'Generate Image',
      description: 'Use DALL-E to generate an image',
      tabId: 'dalle',
      type: 'input',
      config: {
        inputTargets: ['prompt-input'],
      },
      inputMapping: [
        { source: 'imagePrompt', target: 'prompt-input' },
      ],
    },
  ],
  [
    {
      name: 'ideaPrompt',
      label: 'Initial Idea Prompt',
      type: 'string',
      required: true,
      defaultValue: 'Generate 5 creative blog post ideas about technology trends',
      description: 'The prompt to generate initial content ideas',
    },
    {
      name: 'contentType',
      label: 'Content Type',
      type: 'select',
      options: [
        { label: 'Blog Post', value: 'blog' },
        { label: 'Social Media', value: 'social' },
        { label: 'Marketing Copy', value: 'marketing' },
        { label: 'Technical Article', value: 'technical' },
      ],
      defaultValue: 'blog',
    },
  ],
  { stopOnError: true }
);

export const MUSIC_CREATION_TEMPLATE = createTemplate(
  'music-creation',
  'AI Music Creation Pipeline',
  'Generate music with lyrics: concept → lyrics → music generation → voice synthesis',
  'audio',
  ['ai-chat', 'ai-audio'],
  [
    {
      name: 'Generate Song Concept',
      description: 'Use Claude to create a song concept and theme',
      tabId: 'claude',
      type: 'input',
      config: {
        inputTargets: ['prompt-input'],
        inputData: {
          'prompt-input': 'Create a song concept for a {{genre}} song about {{theme}}. Include mood, tempo suggestions, and key elements.',
        },
      },
    },
    {
      name: 'Wait for Concept',
      tabId: 'claude',
      type: 'wait',
      config: { waitDuration: 8000 },
    },
    {
      name: 'Extract Concept',
      tabId: 'claude',
      type: 'extract',
      config: { extractionRules: ['last-response'] },
      outputMapping: [{ source: 'output.last-response', target: 'songConcept' }],
    },
    {
      name: 'Generate Lyrics',
      description: 'Generate lyrics based on the concept',
      tabId: 'chatgpt',
      type: 'input',
      config: {
        inputTargets: ['prompt-input'],
      },
      inputMapping: [
        {
          source: 'songConcept',
          target: 'prompt-input',
          transform: [
            {
              type: 'template',
              template: 'Write complete song lyrics based on this concept:\n\n{{value}}\n\nInclude verses, chorus, and bridge.',
            },
          ],
        },
      ],
    },
    {
      name: 'Wait for Lyrics',
      tabId: 'chatgpt',
      type: 'wait',
      config: { waitDuration: 12000 },
    },
    {
      name: 'Extract Lyrics',
      tabId: 'chatgpt',
      type: 'extract',
      config: { extractionRules: ['last-response'] },
      outputMapping: [{ source: 'output.last-response', target: 'lyrics' }],
    },
    {
      name: 'Create Song in Suno',
      description: 'Generate the song using Suno AI',
      tabId: 'suno',
      type: 'input',
      config: {
        inputTargets: ['song-description', 'lyrics-input'],
      },
      inputMapping: [
        { source: 'songConcept', target: 'song-description' },
        { source: 'lyrics', target: 'lyrics-input' },
      ],
    },
  ],
  [
    {
      name: 'genre',
      label: 'Music Genre',
      type: 'select',
      options: [
        { label: 'Pop', value: 'pop' },
        { label: 'Rock', value: 'rock' },
        { label: 'Hip Hop', value: 'hip-hop' },
        { label: 'Electronic', value: 'electronic' },
        { label: 'Jazz', value: 'jazz' },
        { label: 'Classical', value: 'classical' },
      ],
      defaultValue: 'pop',
    },
    {
      name: 'theme',
      label: 'Song Theme',
      type: 'string',
      required: true,
      defaultValue: 'love and adventure',
      description: 'What the song should be about',
    },
  ]
);

export const RESEARCH_SYNTHESIS_TEMPLATE = createTemplate(
  'research-synthesis',
  'Multi-AI Research Synthesis',
  'Gather perspectives from multiple AI models and synthesize findings',
  'research',
  ['ai-chat'],
  [
    {
      name: 'Query ChatGPT',
      description: 'Get ChatGPT perspective on the research topic',
      tabId: 'chatgpt',
      type: 'input',
      config: {
        inputTargets: ['prompt-input'],
        inputData: { 'prompt-input': '{{researchQuery}}' },
      },
    },
    {
      name: 'Wait ChatGPT',
      tabId: 'chatgpt',
      type: 'wait',
      config: { waitDuration: 15000 },
    },
    {
      name: 'Extract ChatGPT Response',
      tabId: 'chatgpt',
      type: 'extract',
      config: { extractionRules: ['last-response'] },
      outputMapping: [{ source: 'output.last-response', target: 'chatgptResponse' }],
    },
    {
      name: 'Query Claude',
      description: 'Get Claude perspective on the same topic',
      tabId: 'claude',
      type: 'input',
      config: {
        inputTargets: ['prompt-input'],
        inputData: { 'prompt-input': '{{researchQuery}}' },
      },
    },
    {
      name: 'Wait Claude',
      tabId: 'claude',
      type: 'wait',
      config: { waitDuration: 15000 },
    },
    {
      name: 'Extract Claude Response',
      tabId: 'claude',
      type: 'extract',
      config: { extractionRules: ['last-response'] },
      outputMapping: [{ source: 'output.last-response', target: 'claudeResponse' }],
    },
    {
      name: 'Query Gemini',
      description: 'Get Gemini perspective on the same topic',
      tabId: 'gemini',
      type: 'input',
      config: {
        inputTargets: ['prompt-input'],
        inputData: { 'prompt-input': '{{researchQuery}}' },
      },
    },
    {
      name: 'Wait Gemini',
      tabId: 'gemini',
      type: 'wait',
      config: { waitDuration: 15000 },
    },
    {
      name: 'Extract Gemini Response',
      tabId: 'gemini',
      type: 'extract',
      config: { extractionRules: ['last-response'] },
      outputMapping: [{ source: 'output.last-response', target: 'geminiResponse' }],
    },
    {
      name: 'Synthesize Responses',
      description: 'Use Claude to synthesize all perspectives',
      tabId: 'claude',
      type: 'input',
      config: {
        inputTargets: ['prompt-input'],
      },
      inputMapping: [
        {
          source: '',
          target: 'prompt-input',
          transform: [
            {
              type: 'template',
              template: `Synthesize these three AI perspectives into a comprehensive analysis:

**ChatGPT's Perspective:**
{{chatgptResponse}}

**Claude's Perspective:**
{{claudeResponse}}

**Gemini's Perspective:**
{{geminiResponse}}

Please identify:
1. Common themes across all responses
2. Unique insights from each
3. Areas of disagreement
4. A synthesized conclusion`,
            },
          ],
        },
      ],
    },
  ],
  [
    {
      name: 'researchQuery',
      label: 'Research Question',
      type: 'string',
      required: true,
      defaultValue: 'What are the key challenges and opportunities in AI development for 2025?',
      description: 'The research question to investigate across multiple AI models',
    },
  ],
  { sequential: true }
);

export const DATA_ENRICHMENT_TEMPLATE = createTemplate(
  'data-enrichment',
  'Data Enrichment Pipeline',
  'Extract data from spreadsheet, enrich with AI, and write back',
  'data',
  ['data-source', 'ai-chat'],
  [
    {
      name: 'Extract Data',
      description: 'Extract data from Google Sheets',
      tabId: 'google-sheets',
      type: 'extract',
      config: {
        extractionRules: ['range-values'],
      },
      outputMapping: [{ source: 'output.range-values', target: 'rawData' }],
    },
    {
      name: 'Process Each Row',
      description: 'Loop through each data row',
      tabId: '',
      type: 'loop',
      config: {
        loopOver: 'rawData',
        loopSteps: ['enrich-row'],
        maxIterations: 100,
      },
    },
    {
      name: 'Enrich Row',
      description: 'Use AI to enrich the current row',
      tabId: 'chatgpt',
      type: 'input',
      config: {
        inputTargets: ['prompt-input'],
      },
      inputMapping: [
        {
          source: 'loop.item',
          target: 'prompt-input',
          transform: [
            {
              type: 'template',
              template: '{{enrichmentPrompt}}\n\nData: {{value}}',
            },
          ],
        },
      ],
    },
  ],
  [
    {
      name: 'enrichmentPrompt',
      label: 'Enrichment Prompt',
      type: 'string',
      required: true,
      defaultValue: 'Analyze this data and provide additional insights:',
      description: 'The prompt used to enrich each data row',
    },
    {
      name: 'outputColumn',
      label: 'Output Column',
      type: 'string',
      defaultValue: 'D',
      description: 'Which column to write enriched data to',
    },
  ]
);

export const VISUAL_STORYBOARD_TEMPLATE = createTemplate(
  'visual-storyboard',
  'Visual Storyboard Generator',
  'Generate a visual storyboard: story → scene descriptions → images',
  'creative',
  ['ai-chat', 'ai-image'],
  [
    {
      name: 'Generate Story',
      description: 'Create a short story or narrative',
      tabId: 'claude',
      type: 'input',
      config: {
        inputTargets: ['prompt-input'],
        inputData: {
          'prompt-input': 'Write a short {{storyType}} story ({{sceneCount}} scenes) about {{storyTheme}}. For each scene, provide a vivid visual description.',
        },
      },
    },
    {
      name: 'Wait for Story',
      tabId: 'claude',
      type: 'wait',
      config: { waitDuration: 20000 },
    },
    {
      name: 'Extract Story',
      tabId: 'claude',
      type: 'extract',
      config: { extractionRules: ['last-response'] },
      outputMapping: [{ source: 'output.last-response', target: 'story' }],
    },
    {
      name: 'Generate Image Prompts',
      description: 'Convert story scenes into image prompts',
      tabId: 'chatgpt',
      type: 'input',
      config: {
        inputTargets: ['prompt-input'],
      },
      inputMapping: [
        {
          source: 'story',
          target: 'prompt-input',
          transform: [
            {
              type: 'template',
              template: 'For each scene in this story, create a detailed image generation prompt suitable for DALL-E or Midjourney. Format as a numbered list.\n\n{{value}}',
            },
          ],
        },
      ],
    },
    {
      name: 'Wait for Prompts',
      tabId: 'chatgpt',
      type: 'wait',
      config: { waitDuration: 15000 },
    },
    {
      name: 'Extract Image Prompts',
      tabId: 'chatgpt',
      type: 'extract',
      config: { extractionRules: ['last-response'] },
      outputMapping: [{ source: 'output.last-response', target: 'imagePrompts' }],
    },
    {
      name: 'Human Review',
      description: 'Review prompts before generating images',
      tabId: '',
      type: 'human',
      config: {
        message: 'Review the generated image prompts. Edit if needed, then continue.',
        inputRequired: true,
      },
    },
  ],
  [
    {
      name: 'storyType',
      label: 'Story Type',
      type: 'select',
      options: [
        { label: 'Adventure', value: 'adventure' },
        { label: 'Fantasy', value: 'fantasy' },
        { label: 'Sci-Fi', value: 'sci-fi' },
        { label: 'Drama', value: 'drama' },
        { label: 'Comedy', value: 'comedy' },
      ],
      defaultValue: 'adventure',
    },
    {
      name: 'storyTheme',
      label: 'Story Theme',
      type: 'string',
      required: true,
      defaultValue: 'a journey of self-discovery',
    },
    {
      name: 'sceneCount',
      label: 'Number of Scenes',
      type: 'select',
      options: [
        { label: '3 Scenes', value: '3' },
        { label: '5 Scenes', value: '5' },
        { label: '7 Scenes', value: '7' },
      ],
      defaultValue: '5',
    },
  ]
);

// ============================================================================
// ALL TEMPLATES
// ============================================================================

export const ALL_TEMPLATES: WorkflowTemplate[] = [
  CONTENT_PIPELINE_TEMPLATE,
  MUSIC_CREATION_TEMPLATE,
  RESEARCH_SYNTHESIS_TEMPLATE,
  DATA_ENRICHMENT_TEMPLATE,
  VISUAL_STORYBOARD_TEMPLATE,
];

// ============================================================================
// WORKFLOW SERVICE
// ============================================================================

export class WorkflowService {
  private static workflows: Map<string, Workflow> = new Map();
  private static executionHistory: WorkflowExecution[] = [];

  // ============================================================================
  // TEMPLATE METHODS
  // ============================================================================

  static getTemplates(): WorkflowTemplate[] {
    return ALL_TEMPLATES;
  }

  static getTemplatesByCategory(category: string): WorkflowTemplate[] {
    return ALL_TEMPLATES.filter((t) => t.category === category);
  }

  static getTemplateById(id: string): WorkflowTemplate | undefined {
    return ALL_TEMPLATES.find((t) => t.id === id);
  }

  static getCategories(): string[] {
    return [...new Set(ALL_TEMPLATES.map((t) => t.category))];
  }

  // ============================================================================
  // WORKFLOW CREATION
  // ============================================================================

  static createFromTemplate(
    templateId: string,
    tabMappings: Record<string, string>,
    variableValues?: Record<string, any>
  ): Workflow {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const now = new Date();
    const id = this.generateId();

    // Map template tab references to actual tab IDs
    const steps = template.workflow.steps.map((step) => ({
      ...step,
      tabId: tabMappings[step.tabId] || step.tabId,
    }));

    // Apply variable values
    const variables = { ...template.workflow.variables };
    if (variableValues) {
      for (const [key, value] of Object.entries(variableValues)) {
        variables[key] = value;
      }
    }

    // Set default values for template variables
    for (const templateVar of template.variables) {
      if (!(templateVar.name in variables) && templateVar.defaultValue !== undefined) {
        variables[templateVar.name] = templateVar.defaultValue;
      }
    }

    const workflow: Workflow = {
      id,
      name: template.workflow.name,
      description: template.workflow.description,
      tabs: Object.values(tabMappings),
      steps,
      defaultOrder: template.workflow.defaultOrder,
      options: { ...template.workflow.options },
      variables,
      createdAt: now,
      updatedAt: now,
    };

    this.workflows.set(id, workflow);
    return workflow;
  }

  static createCustomWorkflow(
    name: string,
    description: string,
    tabs: string[],
    options?: Partial<WorkflowOptions>
  ): Workflow {
    const now = new Date();
    const workflow: Workflow = {
      id: this.generateId(),
      name,
      description,
      tabs,
      steps: [],
      defaultOrder: [],
      options: {
        sequential: true,
        stopOnError: false,
        logLevel: 'info',
        saveHistory: true,
        notifyOnComplete: true,
        ...options,
      },
      variables: {},
      createdAt: now,
      updatedAt: now,
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  // ============================================================================
  // WORKFLOW MANAGEMENT
  // ============================================================================

  static updateWorkflow(id: string, updates: Partial<Workflow>): Workflow {
    const existing = this.workflows.get(id);
    if (!existing) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const updated: Workflow = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.workflows.set(id, updated);
    return updated;
  }

  static deleteWorkflow(id: string): boolean {
    return this.workflows.delete(id);
  }

  static getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  static getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  static duplicateWorkflow(id: string, newName?: string): Workflow {
    const existing = this.workflows.get(id);
    if (!existing) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const now = new Date();
    const newWorkflow: Workflow = {
      ...JSON.parse(JSON.stringify(existing)),
      id: this.generateId(),
      name: newName || `${existing.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    // Regenerate step IDs
    newWorkflow.steps = newWorkflow.steps.map((step, index) => ({
      ...step,
      id: `step_${index + 1}_${Date.now()}`,
    }));
    newWorkflow.defaultOrder = newWorkflow.steps.map((s) => s.id);

    this.workflows.set(newWorkflow.id, newWorkflow);
    return newWorkflow;
  }

  // ============================================================================
  // STEP MANAGEMENT
  // ============================================================================

  static addStep(workflowId: string, step: Omit<WorkflowStep, 'id'>, position?: number): WorkflowStep {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const newStep: WorkflowStep = {
      ...step,
      id: this.generateId('step'),
    };

    if (position !== undefined && position >= 0 && position <= workflow.steps.length) {
      workflow.steps.splice(position, 0, newStep);
      workflow.defaultOrder.splice(position, 0, newStep.id);
    } else {
      workflow.steps.push(newStep);
      workflow.defaultOrder.push(newStep.id);
    }

    workflow.updatedAt = new Date();
    return newStep;
  }

  static updateStep(workflowId: string, stepId: string, updates: Partial<WorkflowStep>): WorkflowStep {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const stepIndex = workflow.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) {
      throw new Error(`Step not found: ${stepId}`);
    }

    workflow.steps[stepIndex] = {
      ...workflow.steps[stepIndex],
      ...updates,
      id: stepId,
    };
    workflow.updatedAt = new Date();

    return workflow.steps[stepIndex];
  }

  static removeStep(workflowId: string, stepId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const stepIndex = workflow.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) {
      return false;
    }

    workflow.steps.splice(stepIndex, 1);
    workflow.defaultOrder = workflow.defaultOrder.filter((id) => id !== stepId);
    workflow.updatedAt = new Date();

    return true;
  }

  static reorderSteps(workflowId: string, newOrder: string[]): Workflow {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Validate that all step IDs exist
    for (const stepId of newOrder) {
      if (!workflow.steps.find((s) => s.id === stepId)) {
        throw new Error(`Invalid step ID in order: ${stepId}`);
      }
    }

    workflow.defaultOrder = newOrder;
    workflow.updatedAt = new Date();

    return workflow;
  }

  // ============================================================================
  // WORKFLOW EXECUTION
  // ============================================================================

  static async executeWorkflow(
    workflowId: string,
    customOrder?: string[],
    variables?: Record<string, any>
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const execution = await automationEngine.executeWorkflow(workflow, customOrder, variables);

    if (workflow.options.saveHistory) {
      this.executionHistory.push(execution);
      workflow.lastRunAt = execution.startedAt;
    }

    return execution;
  }

  static getExecutionHistory(workflowId?: string): WorkflowExecution[] {
    if (workflowId) {
      return this.executionHistory.filter((e) => e.workflowId === workflowId);
    }
    return [...this.executionHistory];
  }

  static clearExecutionHistory(workflowId?: string): void {
    if (workflowId) {
      this.executionHistory = this.executionHistory.filter((e) => e.workflowId !== workflowId);
    } else {
      this.executionHistory = [];
    }
  }

  // ============================================================================
  // IMPORT / EXPORT
  // ============================================================================

  static exportWorkflow(workflowId: string): string {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    return JSON.stringify(workflow, null, 2);
  }

  static importWorkflow(json: string): Workflow {
    const parsed = JSON.parse(json);
    const now = new Date();

    const workflow: Workflow = {
      ...parsed,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  static exportAllWorkflows(): string {
    const workflows = Array.from(this.workflows.values());
    return JSON.stringify(workflows, null, 2);
  }

  static importWorkflows(json: string): Workflow[] {
    const parsed = JSON.parse(json);
    const imported: Workflow[] = [];

    for (const workflowData of parsed) {
      const workflow = this.importWorkflow(JSON.stringify(workflowData));
      imported.push(workflow);
    }

    return imported;
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  static validateWorkflow(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!workflow.name?.trim()) {
      errors.push('Workflow name is required');
    }

    if (workflow.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }

    // Check that all tabs referenced in steps exist
    const tabIds = new Set(workflow.tabs);
    for (const step of workflow.steps) {
      if (step.tabId && !tabIds.has(step.tabId) && step.type !== 'transform' && step.type !== 'condition') {
        errors.push(`Step "${step.name}" references unknown tab: ${step.tabId}`);
      }
    }

    // Check for circular references in conditions
    const visited = new Set<string>();
    for (const step of workflow.steps) {
      if (step.type === 'condition') {
        const thenSteps = step.config.thenSteps || [];
        const elseSteps = step.config.elseSteps || [];

        for (const targetId of [...thenSteps, ...elseSteps]) {
          if (visited.has(targetId)) {
            errors.push(`Potential circular reference in condition step: ${step.name}`);
          }
        }
      }
      visited.add(step.id);
    }

    // Check default order matches steps
    const stepIds = new Set(workflow.steps.map((s) => s.id));
    for (const orderId of workflow.defaultOrder) {
      if (!stepIds.has(orderId)) {
        errors.push(`Default order contains unknown step ID: ${orderId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private static generateId(prefix = 'wf'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
