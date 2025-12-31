/**
 * Workflow Converter
 * Converts visual workflow (React Flow nodes/edges) to automation engine format
 */

import { Node, Edge } from 'reactflow';
import { WorkflowNodeData, AINodeData, ActionNodeData, ConditionNodeData, DataNodeData, OutputNodeData } from '@/components/workflow-builder/nodes/types';
import {
  Workflow,
  WorkflowStep,
  TabConfig,
  TabType,
  ExtractionRule,
  InputTarget,
  TabAction,
  StepConfig,
  WorkflowOptions
} from '@/types/automation';

interface ConversionResult {
  workflow: Workflow;
  tabConfigs: TabConfig[];
  errors: string[];
  warnings: string[];
}

/**
 * Convert React Flow nodes and edges to automation engine Workflow format
 */
export function convertToWorkflow(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  workflowName: string = 'Visual Workflow'
): ConversionResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tabConfigs: TabConfig[] = [];

  // Build adjacency map for determining step order
  const adjacencyMap = new Map<string, string[]>();
  const incomingEdges = new Map<string, number>();

  nodes.forEach((node) => {
    adjacencyMap.set(node.id, []);
    incomingEdges.set(node.id, 0);
  });

  edges.forEach((edge) => {
    const targets = adjacencyMap.get(edge.source) || [];
    targets.push(edge.target);
    adjacencyMap.set(edge.source, targets);
    incomingEdges.set(edge.target, (incomingEdges.get(edge.target) || 0) + 1);
  });

  // Find start nodes (no incoming edges)
  const startNodes = nodes.filter((node) => incomingEdges.get(node.id) === 0);

  if (startNodes.length === 0 && nodes.length > 0) {
    errors.push('No starting node found. Add a node without incoming connections.');
  }

  // Topological sort to get execution order
  const orderedNodes: Node<WorkflowNodeData>[] = [];
  const visited = new Set<string>();
  const queue = [...startNodes];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;

    visited.add(node.id);
    orderedNodes.push(node);

    const targets = adjacencyMap.get(node.id) || [];
    targets.forEach((targetId) => {
      const targetNode = nodes.find((n) => n.id === targetId);
      if (targetNode && !visited.has(targetId)) {
        queue.push(targetNode);
      }
    });
  }

  // Check for unvisited nodes (disconnected)
  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      warnings.push(`Node "${node.data.label}" is not connected to the workflow`);
    }
  });

  // Convert nodes to workflow steps
  const steps: WorkflowStep[] = [];
  const stepOrder: string[] = [];

  orderedNodes.forEach((node) => {
    const step = convertNodeToStep(node, adjacencyMap, edges, errors, warnings);
    if (step) {
      steps.push(step);
      stepOrder.push(step.id);

      // Create tab config for AI nodes
      if (node.data.category === 'ai') {
        const tabConfig = createTabConfig(node as Node<AINodeData>);
        tabConfigs.push(tabConfig);
      }
    }
  });

  // Create workflow options
  const options: WorkflowOptions = {
    sequential: true,
    stopOnError: false,
    logLevel: 'info',
    saveHistory: true,
    notifyOnComplete: true,
    notifyOnError: true,
  };

  // Create the workflow
  const workflow: Workflow = {
    id: `visual-${Date.now()}`,
    name: workflowName,
    description: `Workflow created from visual builder with ${nodes.length} nodes`,
    tabs: tabConfigs.map(tc => tc.id),
    steps,
    defaultOrder: stepOrder,
    options,
    variables: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { workflow, tabConfigs, errors, warnings };
}

/**
 * Convert a single node to a workflow step
 */
function convertNodeToStep(
  node: Node<WorkflowNodeData>,
  adjacencyMap: Map<string, string[]>,
  edges: Edge[],
  errors: string[],
  warnings: string[]
): WorkflowStep | null {
  const baseStep: Partial<WorkflowStep> = {
    id: node.id,
    name: node.data.label,
    tabId: node.id,
  };

  switch (node.data.category) {
    case 'ai':
      return convertAINode(node as Node<AINodeData>, baseStep);

    case 'action':
      return convertActionNode(node as Node<ActionNodeData>, baseStep);

    case 'condition':
      return convertConditionNode(node as Node<ConditionNodeData>, baseStep, edges);

    case 'data':
      return convertDataNode(node as Node<DataNodeData>, baseStep);

    case 'output':
      return convertOutputNode(node as Node<OutputNodeData>, baseStep);

    default:
      warnings.push(`Unknown node category: ${(node.data as any).category}`);
      return null;
  }
}

function convertAINode(
  node: Node<AINodeData>,
  baseStep: Partial<WorkflowStep>
): WorkflowStep {
  const config = node.data.config;

  const stepConfig: StepConfig = {
    inputData: config.prompt ? { prompt: config.prompt } : undefined,
  };

  return {
    ...baseStep,
    type: 'input',
    config: stepConfig,
    timeout: 60000,
  } as WorkflowStep;
}

function convertActionNode(
  node: Node<ActionNodeData>,
  baseStep: Partial<WorkflowStep>
): WorkflowStep {
  const config = node.data.config;
  const actionType = node.data.actionType;

  let stepConfig: StepConfig = {};

  switch (actionType) {
    case 'click':
    case 'type':
    case 'extract':
      stepConfig = {
        actions: [node.id],
      };
      break;
    case 'wait':
      stepConfig = {
        waitDuration: config.duration || 1000,
      };
      break;
  }

  return {
    ...baseStep,
    type: actionType === 'wait' ? 'wait' : 'action',
    config: stepConfig,
  } as WorkflowStep;
}

function convertConditionNode(
  node: Node<ConditionNodeData>,
  baseStep: Partial<WorkflowStep>,
  edges: Edge[]
): WorkflowStep {
  const config = node.data.config;

  // Find true and false branches from edges
  const trueEdge = edges.find((e) => e.source === node.id && e.sourceHandle === 'true');
  const falseEdge = edges.find((e) => e.source === node.id && e.sourceHandle === 'false');

  const stepConfig: StepConfig = {
    condition: {
      type: (config.operator as any) || 'contains',
      left: config.variable || 'previousOutput',
      right: config.value,
    },
    thenSteps: trueEdge ? [trueEdge.target] : undefined,
    elseSteps: falseEdge ? [falseEdge.target] : undefined,
  };

  return {
    ...baseStep,
    type: 'condition',
    config: stepConfig,
  } as WorkflowStep;
}

function convertDataNode(
  node: Node<DataNodeData>,
  baseStep: Partial<WorkflowStep>
): WorkflowStep {
  const config = node.data.config;

  const stepConfig: StepConfig = {
    transforms: config.transform ? [
      {
        type: 'custom',
        script: config.transform,
      }
    ] : undefined,
  };

  return {
    ...baseStep,
    type: 'transform',
    config: stepConfig,
  } as WorkflowStep;
}

function convertOutputNode(
  node: Node<OutputNodeData>,
  baseStep: Partial<WorkflowStep>
): WorkflowStep {
  const config = node.data.config;

  const stepConfig: StepConfig = {
    inputData: {
      target: config.target,
      template: config.template,
    },
  };

  return {
    ...baseStep,
    type: 'input',
    config: stepConfig,
  } as WorkflowStep;
}

function createTabConfig(node: Node<AINodeData>): TabConfig {
  const platform = node.data.platform;
  const config = node.data.config;

  const tabType = getTabType(platform);
  const now = new Date();

  // Create extraction rules
  const extractionRules: ExtractionRule[] = config.extractSelector
    ? [{
        id: `${node.id}-extract`,
        name: 'response',
        method: 'selector',
        selector: config.extractSelector,
      }]
    : [];

  // Create input targets
  const inputTargets: InputTarget[] = config.injectSelector
    ? [{
        id: `${node.id}-input`,
        name: 'prompt',
        method: 'type',
        selector: config.injectSelector,
        pressEnter: true,
      }]
    : [];

  // Create actions
  const actions: TabAction[] = [{
    id: `${node.id}-submit`,
    name: 'Submit',
    type: 'click',
    selector: 'button[type="submit"]',
  }];

  return {
    id: node.id,
    name: node.data.label,
    type: tabType,
    url: getPlatformUrl(platform),
    description: `${platform} tab for workflow`,
    extraction: {
      rules: extractionRules,
      waitFor: config.waitCondition ? {
        type: config.waitCondition.type as 'element' | 'text' | 'timeout',
        selector: config.waitCondition.type === 'element' ? String(config.waitCondition.value) : undefined,
        text: config.waitCondition.type === 'text' ? String(config.waitCondition.value) : undefined,
        duration: config.waitCondition.type === 'timeout' ? Number(config.waitCondition.value) * 1000 : undefined,
        timeout: 60000,
      } : undefined,
    },
    input: {
      targets: inputTargets,
    },
    actions,
    options: {},
    createdAt: now,
    updatedAt: now,
  };
}

function getTabType(platform: string): TabType {
  const typeMap: Record<string, TabType> = {
    chatgpt: 'ai-chat',
    claude: 'ai-chat',
    gemini: 'ai-chat',
    perplexity: 'ai-chat',
    notebooklm: 'ai-chat',
    suno: 'ai-audio',
    udio: 'ai-audio',
    elevenlabs: 'ai-audio',
    midjourney: 'ai-image',
    dalle: 'ai-image',
    runway: 'ai-video',
    pika: 'ai-video',
  };
  return typeMap[platform] || 'custom';
}

function getPlatformUrl(platform: string): string {
  const urls: Record<string, string> = {
    chatgpt: 'https://chatgpt.com/',
    claude: 'https://claude.ai/',
    gemini: 'https://gemini.google.com/',
    perplexity: 'https://perplexity.ai/',
    notebooklm: 'https://notebooklm.google.com/',
    suno: 'https://suno.com/',
    udio: 'https://udio.com/',
    midjourney: 'https://www.midjourney.com/',
    dalle: 'https://chatgpt.com/',
    elevenlabs: 'https://elevenlabs.io/',
    runway: 'https://app.runwayml.com/',
    pika: 'https://pika.art/',
  };
  return urls[platform] || '';
}

/**
 * Validate a workflow before execution
 */
export function validateWorkflow(nodes: Node<WorkflowNodeData>[], edges: Edge[]): string[] {
  const errors: string[] = [];

  // Check for empty workflow
  if (nodes.length === 0) {
    errors.push('Workflow is empty. Add at least one node.');
    return errors;
  }

  // Check for unconfigured nodes
  nodes.forEach((node) => {
    if (!node.data.isConfigured) {
      errors.push(`Node "${node.data.label}" is not fully configured`);
    }
  });

  // Check for orphan nodes (no connections)
  const connectedNodes = new Set<string>();
  edges.forEach((edge) => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  if (nodes.length > 1) {
    nodes.forEach((node) => {
      if (!connectedNodes.has(node.id)) {
        errors.push(`Node "${node.data.label}" is not connected to other nodes`);
      }
    });
  }

  return errors;
}
