// Enhanced Automation Engine
// Extends base engine with real browser interactions via extension bridge

import { automationEngine, AutomationEngine } from './automationEngine';
import { extensionBridge, createBridge, ExtensionBridge } from './extensionBridge';
import { storageService } from './storageService';
import { responseDetection, DetectionConfig, ValidationConfig } from './responseDetection';
import {
  Workflow,
  WorkflowStep,
  WorkflowExecution,
  TabConfig,
  StepResult,
  ExtractionRule,
  InputTarget,
} from '@/types/automation';

// ============================================================================
// ENHANCED ENGINE
// ============================================================================

export class EnhancedAutomationEngine {
  private bridge: ExtensionBridge;
  private tabIdMap: Map<string, number> = new Map(); // config ID -> browser tab ID

  constructor() {
    this.bridge = createBridge();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<boolean> {
    // Connect to extension
    const connected = await this.bridge.connect();

    if (!connected) {
      console.warn('Extension not connected, using mock mode');
    }

    // Load saved data
    await storageService.init();

    // Set up event handlers
    this.bridge.on({
      onTabRegistered: (tab) => {
        console.log('Tab registered:', tab);
      },
      onTabClosed: (tabId) => {
        // Remove from map
        for (const [configId, id] of this.tabIdMap.entries()) {
          if (id === tabId) {
            this.tabIdMap.delete(configId);
            break;
          }
        }
      },
      onError: (error) => {
        console.error('Bridge error:', error);
      },
    });

    // Register tabs with engine
    const tabs = await storageService.getAllTabs();
    for (const tab of tabs) {
      automationEngine.registerTab(tab);
    }

    return connected;
  }

  // ============================================================================
  // TAB MANAGEMENT
  // ============================================================================

  async registerTab(tab: TabConfig): Promise<number> {
    // Save to storage
    await storageService.saveTab(tab);

    // Register with base engine
    automationEngine.registerTab(tab);

    // Register with browser via extension
    if (tab.url) {
      const browserTabId = await this.bridge.registerTab(tab.url, tab.type);
      this.tabIdMap.set(tab.id, browserTabId);
      return browserTabId;
    }

    return -1;
  }

  getBrowserTabId(configId: string): number | undefined {
    return this.tabIdMap.get(configId);
  }

  // ============================================================================
  // WORKFLOW EXECUTION
  // ============================================================================

  async executeWorkflow(
    workflow: Workflow,
    customOrder?: string[],
    initialVariables?: Record<string, any>
  ): Promise<WorkflowExecution> {
    // Ensure all tabs are registered with browser
    for (const tabConfigId of workflow.tabs) {
      if (!this.tabIdMap.has(tabConfigId)) {
        const tab = automationEngine.getTab(tabConfigId);
        if (tab?.url) {
          const browserTabId = await this.bridge.registerTab(tab.url, tab.type);
          this.tabIdMap.set(tabConfigId, browserTabId);
        }
      }
    }

    // Execute workflow with enhanced step handlers
    const execution = await this.executeWithEnhancements(workflow, customOrder, initialVariables);

    // Save execution to storage
    await storageService.saveExecution(execution);

    return execution;
  }

  private async executeWithEnhancements(
    workflow: Workflow,
    customOrder?: string[],
    initialVariables?: Record<string, any>
  ): Promise<WorkflowExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const stepOrder = customOrder || workflow.defaultOrder;

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      status: 'pending',
      stepOrder,
      completedSteps: [],
      failedSteps: [],
      skippedSteps: [],
      stepResults: {},
      variables: { ...workflow.variables, ...initialVariables },
      startedAt: new Date(),
      errors: [],
      log: [],
    };

    try {
      execution.status = 'running';

      for (const stepId of stepOrder) {
        const step = workflow.steps.find((s) => s.id === stepId);
        if (!step) continue;

        execution.currentStepId = stepId;
        const startTime = Date.now();

        try {
          const result = await this.executeEnhancedStep(step, execution);
          execution.stepResults[stepId] = result;

          if (result.status === 'success') {
            execution.completedSteps.push(stepId);
          } else {
            execution.failedSteps.push(stepId);
            if (workflow.options.stopOnError) {
              execution.status = 'failed';
              break;
            }
          }
        } catch (error) {
          execution.failedSteps.push(stepId);
          execution.errors.push({
            stepId,
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          });

          if (workflow.options.stopOnError) {
            execution.status = 'failed';
            break;
          }
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
      }
    } catch (error) {
      execution.status = 'failed';
      execution.errors.push({
        stepId: execution.currentStepId || 'unknown',
        message: error instanceof Error ? error.message : 'Execution failed',
        timestamp: new Date(),
      });
    }

    execution.completedAt = new Date();
    return execution;
  }

  private async executeEnhancedStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<StepResult> {
    const startTime = Date.now();

    switch (step.type) {
      case 'extract':
        return this.executeRealExtraction(step, execution, startTime);

      case 'input':
        return this.executeRealInput(step, execution, startTime);

      case 'action':
        return this.executeRealAction(step, execution, startTime);

      case 'wait':
        return this.executeSmartWait(step, execution, startTime);

      default:
        // Delegate to base engine for other step types
        return {
          stepId: step.id,
          status: 'success',
          output: {},
          duration: Date.now() - startTime,
          retries: 0,
        };
    }
  }

  // ============================================================================
  // REAL BROWSER INTERACTIONS
  // ============================================================================

  private async executeRealExtraction(
    step: WorkflowStep,
    execution: WorkflowExecution,
    startTime: number
  ): Promise<StepResult> {
    const browserTabId = this.tabIdMap.get(step.tabId);
    if (!browserTabId) {
      return {
        stepId: step.id,
        status: 'failed',
        error: `Browser tab not found for ${step.tabId}`,
        duration: Date.now() - startTime,
        retries: 0,
      };
    }

    const tab = automationEngine.getTab(step.tabId);
    if (!tab) {
      return {
        stepId: step.id,
        status: 'failed',
        error: `Tab config not found: ${step.tabId}`,
        duration: Date.now() - startTime,
        retries: 0,
      };
    }

    try {
      // Use extension bridge for real extraction
      const data = await this.bridge.extractData(browserTabId, tab.extraction);

      // Apply output mappings
      if (step.outputMapping) {
        for (const mapping of step.outputMapping) {
          const value = this.getNestedValue(data, mapping.source.replace('output.', ''));
          this.setNestedValue(execution.variables, mapping.target, value);
        }
      }

      execution.variables[`${step.id}.output`] = data;

      return {
        stepId: step.id,
        status: 'success',
        output: data,
        duration: Date.now() - startTime,
        retries: 0,
      };
    } catch (error) {
      return {
        stepId: step.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Extraction failed',
        duration: Date.now() - startTime,
        retries: 0,
      };
    }
  }

  private async executeRealInput(
    step: WorkflowStep,
    execution: WorkflowExecution,
    startTime: number
  ): Promise<StepResult> {
    const browserTabId = this.tabIdMap.get(step.tabId);
    if (!browserTabId) {
      return {
        stepId: step.id,
        status: 'failed',
        error: `Browser tab not found for ${step.tabId}`,
        duration: Date.now() - startTime,
        retries: 0,
      };
    }

    const tab = automationEngine.getTab(step.tabId);
    if (!tab) {
      return {
        stepId: step.id,
        status: 'failed',
        error: `Tab config not found: ${step.tabId}`,
        duration: Date.now() - startTime,
        retries: 0,
      };
    }

    try {
      // Resolve input data from variables and mappings
      const inputData: Record<string, any> = { ...step.config.inputData };

      if (step.inputMapping) {
        for (const mapping of step.inputMapping) {
          let value = this.getNestedValue(execution.variables, mapping.source);

          // Apply transforms
          if (mapping.transform) {
            for (const transform of mapping.transform) {
              value = this.applyTransform(value, transform);
            }
          }

          inputData[mapping.target] = value;
        }
      }

      // Use extension bridge for real input
      const success = await this.bridge.injectData(browserTabId, tab.input, inputData);

      return {
        stepId: step.id,
        status: success ? 'success' : 'failed',
        output: { injected: success },
        duration: Date.now() - startTime,
        retries: 0,
      };
    } catch (error) {
      return {
        stepId: step.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Injection failed',
        duration: Date.now() - startTime,
        retries: 0,
      };
    }
  }

  private async executeRealAction(
    step: WorkflowStep,
    execution: WorkflowExecution,
    startTime: number
  ): Promise<StepResult> {
    const browserTabId = this.tabIdMap.get(step.tabId);
    if (!browserTabId) {
      return {
        stepId: step.id,
        status: 'failed',
        error: `Browser tab not found for ${step.tabId}`,
        duration: Date.now() - startTime,
        retries: 0,
      };
    }

    const tab = automationEngine.getTab(step.tabId);
    if (!tab) {
      return {
        stepId: step.id,
        status: 'failed',
        error: `Tab config not found: ${step.tabId}`,
        duration: Date.now() - startTime,
        retries: 0,
      };
    }

    try {
      const results: Record<string, any> = {};
      const actionIds = step.config.actions || [];

      for (const actionId of actionIds) {
        const action = tab.actions.find((a) => a.id === actionId);
        if (action) {
          const result = await this.bridge.executeAction(browserTabId, action);
          results[actionId] = result;
        }
      }

      return {
        stepId: step.id,
        status: 'success',
        output: results,
        duration: Date.now() - startTime,
        retries: 0,
      };
    } catch (error) {
      return {
        stepId: step.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Action failed',
        duration: Date.now() - startTime,
        retries: 0,
      };
    }
  }

  private async executeSmartWait(
    step: WorkflowStep,
    execution: WorkflowExecution,
    startTime: number
  ): Promise<StepResult> {
    const browserTabId = this.tabIdMap.get(step.tabId);

    // Simple duration wait
    if (step.config.waitDuration && !step.config.waitCondition) {
      await this.delay(step.config.waitDuration);
      return {
        stepId: step.id,
        status: 'success',
        output: { waited: step.config.waitDuration },
        duration: Date.now() - startTime,
        retries: 0,
      };
    }

    // Smart response detection
    if (browserTabId && step.tabId) {
      const tab = automationEngine.getTab(step.tabId);
      if (tab) {
        try {
          const result = await this.bridge.waitForResponse(
            browserTabId,
            tab.type,
            {
              method: 'content-stable',
              timeout: step.config.waitCondition?.timeout || 60000,
              stableFor: 2000,
              pollInterval: 500,
            }
          );

          // Validate content if validation config exists
          if (step.config.waitCondition?.validation && result.content) {
            const validation = responseDetection.validateContent(
              result.content,
              step.config.waitCondition.validation as ValidationConfig
            );

            if (!validation.valid) {
              return {
                stepId: step.id,
                status: 'failed',
                error: `Validation failed: ${validation.errors.join(', ')}`,
                output: { content: result.content, validationErrors: validation.errors },
                duration: Date.now() - startTime,
                retries: 0,
              };
            }
          }

          execution.variables[`${step.id}.output`] = result.content;

          return {
            stepId: step.id,
            status: result.detected ? 'success' : 'failed',
            output: result,
            duration: Date.now() - startTime,
            retries: 0,
          };
        } catch (error) {
          return {
            stepId: step.id,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Wait failed',
            duration: Date.now() - startTime,
            retries: 0,
          };
        }
      }
    }

    // Fallback to simple wait
    await this.delay(step.config.waitDuration || 5000);
    return {
      stepId: step.id,
      status: 'success',
      output: { waited: true },
      duration: Date.now() - startTime,
      retries: 0,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  private applyTransform(value: any, transform: any): any {
    if (value === null || value === undefined) return value;

    switch (transform.type) {
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'template':
        if (transform.template && typeof value === 'object') {
          return transform.template.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => value[key] || '');
        }
        return transform.template?.replace('{{value}}', value) || value;
      default:
        return value;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // DELEGATION TO BASE ENGINE
  // ============================================================================

  subscribe(listener: (event: any) => void): () => void {
    return automationEngine.subscribe(listener);
  }

  pauseExecution(executionId: string): boolean {
    return automationEngine.pauseExecution(executionId);
  }

  resumeExecution(executionId: string, userInput?: any): boolean {
    return automationEngine.resumeExecution(executionId, userInput);
  }

  cancelExecution(executionId: string): boolean {
    return automationEngine.cancelExecution(executionId);
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return automationEngine.getExecution(executionId);
  }
}

// Singleton instance
export const enhancedEngine = new EnhancedAutomationEngine();
