// Multi-Tab AI Automation Engine
// Core orchestration logic for executing workflows across tabs

import {
  Workflow,
  WorkflowStep,
  WorkflowExecution,
  WorkflowOptions,
  StepResult,
  StepConfig,
  StepCondition,
  DataMapping,
  DataTransform,
  ExecutionStatus,
  LogEntry,
  ExecutionError,
  TabConfig,
  WaitCondition,
  ErrorHandler,
  RetryConfig,
} from '@/types/automation';

type ExecutionEventType =
  | 'start'
  | 'step-start'
  | 'step-complete'
  | 'step-error'
  | 'pause'
  | 'resume'
  | 'complete'
  | 'error'
  | 'log';

interface ExecutionEvent {
  type: ExecutionEventType;
  execution: WorkflowExecution;
  step?: WorkflowStep;
  result?: StepResult;
  error?: ExecutionError;
  log?: LogEntry;
}

type EventListener = (event: ExecutionEvent) => void;

export class AutomationEngine {
  private executions: Map<string, WorkflowExecution> = new Map();
  private listeners: Set<EventListener> = new Set();
  private tabs: Map<string, TabConfig> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ExecutionEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  // ============================================================================
  // TAB MANAGEMENT
  // ============================================================================

  registerTab(tab: TabConfig): void {
    this.tabs.set(tab.id, tab);
  }

  unregisterTab(tabId: string): void {
    this.tabs.delete(tabId);
  }

  getTab(tabId: string): TabConfig | undefined {
    return this.tabs.get(tabId);
  }

  // ============================================================================
  // WORKFLOW EXECUTION
  // ============================================================================

  async executeWorkflow(
    workflow: Workflow,
    customOrder?: string[],
    initialVariables?: Record<string, any>
  ): Promise<WorkflowExecution> {
    const executionId = this.generateId();
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

    this.executions.set(executionId, execution);

    const abortController = new AbortController();
    this.abortControllers.set(executionId, abortController);

    try {
      execution.status = 'running';
      this.emit({ type: 'start', execution });
      this.log(execution, 'info', `Starting workflow: ${workflow.name}`);

      // Execute steps in order
      for (const stepId of stepOrder) {
        if (abortController.signal.aborted) {
          execution.status = 'cancelled';
          break;
        }

        const step = workflow.steps.find((s) => s.id === stepId);
        if (!step) {
          this.log(execution, 'warn', `Step not found: ${stepId}`);
          continue;
        }

        // Check conditions
        const shouldExecute = await this.evaluateConditions(
          step.conditions || [],
          execution.variables
        );

        if (!shouldExecute) {
          execution.skippedSteps.push(stepId);
          this.log(execution, 'info', `Skipping step (condition not met): ${step.name}`);
          continue;
        }

        execution.currentStepId = stepId;
        this.emit({ type: 'step-start', execution, step });

        try {
          const result = await this.executeStep(
            step,
            execution,
            workflow.options,
            abortController.signal
          );

          execution.stepResults[stepId] = result;

          if (result.status === 'success') {
            execution.completedSteps.push(stepId);
            this.emit({ type: 'step-complete', execution, step, result });
          } else {
            execution.failedSteps.push(stepId);
            const error: ExecutionError = {
              stepId,
              message: result.error || 'Step failed',
              timestamp: new Date(),
            };
            execution.errors.push(error);
            this.emit({ type: 'step-error', execution, step, error });

            if (workflow.options.stopOnError) {
              execution.status = 'failed';
              break;
            }
          }
        } catch (error) {
          const execError: ExecutionError = {
            stepId,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date(),
          };
          execution.errors.push(execError);
          execution.failedSteps.push(stepId);
          this.emit({ type: 'step-error', execution, step, error: execError });

          if (workflow.options.stopOnError) {
            execution.status = 'failed';
            break;
          }
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
      }

      execution.completedAt = new Date();
      this.emit({ type: 'complete', execution });
      this.log(
        execution,
        'info',
        `Workflow ${execution.status}: ${execution.completedSteps.length} completed, ${execution.failedSteps.length} failed, ${execution.skippedSteps.length} skipped`
      );
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      const execError: ExecutionError = {
        stepId: execution.currentStepId || 'unknown',
        message: error instanceof Error ? error.message : 'Workflow execution failed',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
      };
      execution.errors.push(execError);
      this.emit({ type: 'error', execution, error: execError });
    } finally {
      this.abortControllers.delete(executionId);
    }

    return execution;
  }

  // ============================================================================
  // STEP EXECUTION
  // ============================================================================

  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    options: WorkflowOptions,
    signal: AbortSignal
  ): Promise<StepResult> {
    const startTime = Date.now();
    let retries = 0;
    const maxRetries = step.retryConfig?.maxRetries || 0;

    this.log(execution, 'info', `Executing step: ${step.name}`, { type: step.type });

    // Apply input mappings
    const stepInput = this.applyInputMappings(step.inputMapping || [], execution);

    while (retries <= maxRetries) {
      try {
        if (signal.aborted) {
          throw new Error('Execution cancelled');
        }

        let output: any;

        switch (step.type) {
          case 'extract':
            output = await this.executeExtractStep(step, execution);
            break;

          case 'input':
            output = await this.executeInputStep(step, stepInput, execution);
            break;

          case 'action':
            output = await this.executeActionStep(step, execution);
            break;

          case 'transform':
            output = await this.executeTransformStep(step, stepInput, execution);
            break;

          case 'condition':
            output = await this.executeConditionStep(step, execution);
            break;

          case 'loop':
            output = await this.executeLoopStep(step, execution, options, signal);
            break;

          case 'wait':
            output = await this.executeWaitStep(step, execution);
            break;

          case 'human':
            output = await this.executeHumanStep(step, execution);
            break;

          case 'ai-decide':
            output = await this.executeAIDecideStep(step, execution);
            break;

          case 'parallel':
            output = await this.executeParallelStep(step, execution, options, signal);
            break;

          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }

        // Apply output mappings
        if (step.outputMapping) {
          this.applyOutputMappings(step.outputMapping, output, execution);
        }

        // Store step output in variables
        execution.variables[`${step.id}.output`] = output;

        return {
          stepId: step.id,
          status: 'success',
          output,
          duration: Date.now() - startTime,
          retries,
        };
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          const delay = this.calculateRetryDelay(step.retryConfig!, retries);
          this.log(
            execution,
            'warn',
            `Step failed, retrying (${retries}/${maxRetries}) in ${delay}ms`,
            { error: error instanceof Error ? error.message : 'Unknown error' }
          );
          await this.delay(delay);
        } else {
          const errorHandler = step.onError || { action: 'stop' };
          return this.handleStepError(step, error, errorHandler, startTime, retries);
        }
      }
    }

    return {
      stepId: step.id,
      status: 'failed',
      error: 'Max retries exceeded',
      duration: Date.now() - startTime,
      retries,
    };
  }

  // ============================================================================
  // STEP TYPE IMPLEMENTATIONS
  // ============================================================================

  private async executeExtractStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<any> {
    const tab = this.tabs.get(step.tabId);
    if (!tab) {
      throw new Error(`Tab not found: ${step.tabId}`);
    }

    const extractionRuleIds = step.config.extractionRules || [];
    const results: Record<string, any> = {};

    for (const ruleId of extractionRuleIds) {
      const rule = tab.extraction.rules.find((r) => r.id === ruleId);
      if (!rule) {
        this.log(execution, 'warn', `Extraction rule not found: ${ruleId}`);
        continue;
      }

      // Simulate extraction based on method
      // In real implementation, this would interact with browser API
      let extracted: any;

      switch (rule.method) {
        case 'selector':
          extracted = await this.extractBySelector(rule.selector!, tab);
          break;
        case 'regex':
          extracted = await this.extractByRegex(rule.pattern!, execution.variables);
          break;
        case 'json-path':
          extracted = this.extractByJsonPath(rule.jsonPath!, execution.variables);
          break;
        case 'manual':
          // Will be filled in by human step or pre-set
          extracted = execution.variables[`manual.${ruleId}`];
          break;
        default:
          extracted = null;
      }

      // Apply transforms
      if (rule.transform) {
        extracted = this.applyTransforms(extracted, rule.transform);
      }

      // Validate
      if (rule.required && (extracted === null || extracted === undefined)) {
        if (rule.fallback) {
          extracted = typeof rule.fallback === 'string' ? rule.fallback : null;
        } else {
          throw new Error(`Required extraction failed: ${rule.name}`);
        }
      }

      results[rule.id] = extracted;
    }

    // Post-process
    if (tab.extraction.postProcess) {
      return this.applyTransforms(results, tab.extraction.postProcess);
    }

    return results;
  }

  private async executeInputStep(
    step: WorkflowStep,
    inputData: Record<string, any>,
    execution: WorkflowExecution
  ): Promise<any> {
    const tab = this.tabs.get(step.tabId);
    if (!tab) {
      throw new Error(`Tab not found: ${step.tabId}`);
    }

    const inputTargetIds = step.config.inputTargets || [];
    const staticData = step.config.inputData || {};
    const mergedData = { ...staticData, ...inputData };

    const results: Record<string, boolean> = {};

    for (const targetId of inputTargetIds) {
      const target = tab.input.targets.find((t) => t.id === targetId);
      if (!target) {
        this.log(execution, 'warn', `Input target not found: ${targetId}`);
        continue;
      }

      const value = mergedData[targetId] || mergedData[target.name];

      // Simulate input based on method
      // In real implementation, this would interact with browser API
      switch (target.method) {
        case 'type':
          await this.simulateTyping(target.selector!, value, target.delay || 50);
          break;
        case 'paste':
          await this.simulatePaste(target.selector!, value);
          break;
        case 'click':
          await this.simulateClick(target.selector!);
          break;
        case 'select':
          await this.simulateSelect(target.selector!, value);
          break;
        default:
          this.log(execution, 'warn', `Unsupported input method: ${target.method}`);
      }

      results[targetId] = true;

      if (target.pressEnter) {
        await this.simulateKeyPress('Enter');
      }
    }

    // Execute submit action if defined
    if (tab.input.submitAction) {
      await this.executeTabAction(tab.input.submitAction, execution);
    }

    return results;
  }

  private async executeActionStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<any> {
    const tab = this.tabs.get(step.tabId);
    if (!tab) {
      throw new Error(`Tab not found: ${step.tabId}`);
    }

    const actionIds = step.config.actions || [];
    const results: Record<string, any> = {};

    for (const actionId of actionIds) {
      const action = tab.actions.find((a) => a.id === actionId);
      if (!action) {
        this.log(execution, 'warn', `Action not found: ${actionId}`);
        continue;
      }

      results[actionId] = await this.executeTabAction(action, execution);
    }

    return results;
  }

  private async executeTransformStep(
    step: WorkflowStep,
    inputData: Record<string, any>,
    _execution: WorkflowExecution
  ): Promise<any> {
    const transforms = step.config.transforms || [];
    return this.applyTransforms(inputData, transforms);
  }

  private async executeConditionStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<{ branch: 'then' | 'else'; steps: string[] }> {
    const condition = step.config.condition;
    if (!condition) {
      return { branch: 'then', steps: step.config.thenSteps || [] };
    }

    const result = this.evaluateCondition(condition, execution.variables);
    const branch = result ? 'then' : 'else';
    const steps = result ? step.config.thenSteps || [] : step.config.elseSteps || [];

    this.log(execution, 'info', `Condition evaluated to ${branch}`, { condition, result });

    return { branch, steps };
  }

  private async executeLoopStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    options: WorkflowOptions,
    signal: AbortSignal
  ): Promise<any[]> {
    const loopVariable = step.config.loopOver;
    if (!loopVariable) {
      throw new Error('Loop step missing loopOver configuration');
    }

    const items = this.getVariable(loopVariable, execution.variables);
    if (!Array.isArray(items)) {
      throw new Error(`Loop variable is not an array: ${loopVariable}`);
    }

    const maxIterations = step.config.maxIterations || items.length;
    const loopSteps = step.config.loopSteps || [];
    const results: any[] = [];

    for (let i = 0; i < Math.min(items.length, maxIterations); i++) {
      if (signal.aborted) break;

      execution.variables['loop.index'] = i;
      execution.variables['loop.item'] = items[i];
      execution.variables['loop.isFirst'] = i === 0;
      execution.variables['loop.isLast'] = i === items.length - 1;

      this.log(execution, 'debug', `Loop iteration ${i + 1}/${items.length}`);

      const iterationResults: Record<string, any> = {};

      for (const loopStepId of loopSteps) {
        // Find the step in parent workflow (would need access to workflow)
        // For now, store results
        iterationResults[loopStepId] = { executed: true };
      }

      results.push(iterationResults);
    }

    // Cleanup loop variables
    delete execution.variables['loop.index'];
    delete execution.variables['loop.item'];
    delete execution.variables['loop.isFirst'];
    delete execution.variables['loop.isLast'];

    return results;
  }

  private async executeWaitStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<{ waited: boolean; duration: number }> {
    const waitCondition = step.config.waitCondition;
    const waitDuration = step.config.waitDuration;

    if (waitDuration) {
      this.log(execution, 'info', `Waiting for ${waitDuration}ms`);
      await this.delay(waitDuration);
      return { waited: true, duration: waitDuration };
    }

    if (waitCondition) {
      const startTime = Date.now();
      const timeout = waitCondition.timeout || 30000;
      const pollInterval = waitCondition.pollInterval || 500;

      while (Date.now() - startTime < timeout) {
        const conditionMet = await this.checkWaitCondition(waitCondition, execution);
        if (conditionMet) {
          return { waited: true, duration: Date.now() - startTime };
        }
        await this.delay(pollInterval);
      }

      throw new Error('Wait condition timeout');
    }

    return { waited: false, duration: 0 };
  }

  private async executeHumanStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<{ paused: boolean; userInput?: any }> {
    execution.status = 'paused';
    this.emit({ type: 'pause', execution, step });
    this.log(execution, 'info', `Paused for human intervention: ${step.config.message || 'Action required'}`);

    // In real implementation, this would wait for user input
    // For now, return placeholder
    return { paused: true };
  }

  private async executeAIDecideStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<{ decision: string; reasoning: string }> {
    const prompt = step.config.aiPrompt || 'What should be the next action?';
    const options = step.config.aiOptions || [];

    this.log(execution, 'info', `AI decision requested: ${prompt}`, { options });

    // In real implementation, this would call an AI service
    // For now, return first option or placeholder
    const decision = options.length > 0 ? options[0] : 'continue';

    return {
      decision,
      reasoning: 'Default decision - AI integration pending',
    };
  }

  private async executeParallelStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    options: WorkflowOptions,
    signal: AbortSignal
  ): Promise<Record<string, any>> {
    const parallelStepIds = step.config.parallelSteps || [];

    this.log(execution, 'info', `Executing ${parallelStepIds.length} steps in parallel`);

    // In real implementation, would execute steps in parallel
    // For now, return placeholder
    const results: Record<string, any> = {};
    for (const stepId of parallelStepIds) {
      results[stepId] = { executed: true, parallel: true };
    }

    return results;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async executeTabAction(
    action: { id: string; type: string; selector?: string; value?: string; script?: string; duration?: number },
    execution: WorkflowExecution
  ): Promise<any> {
    this.log(execution, 'debug', `Executing action: ${action.id}`, { type: action.type });

    switch (action.type) {
      case 'click':
        await this.simulateClick(action.selector!);
        return { clicked: true };

      case 'type':
        await this.simulateTyping(action.selector!, action.value!, 50);
        return { typed: true };

      case 'wait':
        await this.delay(action.duration || 1000);
        return { waited: true };

      case 'scroll':
        return { scrolled: true };

      case 'screenshot':
        return { screenshot: 'data:image/png;base64,...' };

      case 'evaluate':
        // In real implementation, would run JavaScript
        return { evaluated: true, result: null };

      case 'navigate':
        return { navigated: true };

      case 'refresh':
        return { refreshed: true };

      default:
        return { executed: true };
    }
  }

  private applyInputMappings(
    mappings: DataMapping[],
    execution: WorkflowExecution
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const mapping of mappings) {
      let value = this.getVariable(mapping.source, execution.variables);

      if (value === undefined && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      if (mapping.transform) {
        value = this.applyTransforms(value, mapping.transform);
      }

      this.setVariable(mapping.target, value, result);
    }

    return result;
  }

  private applyOutputMappings(
    mappings: DataMapping[],
    output: any,
    execution: WorkflowExecution
  ): void {
    for (const mapping of mappings) {
      let value = this.getVariable(mapping.source, { output });

      if (mapping.transform) {
        value = this.applyTransforms(value, mapping.transform);
      }

      this.setVariable(mapping.target, value, execution.variables);
    }
  }

  private getVariable(path: string, context: Record<string, any>): any {
    const parts = path.split('.');
    let current: any = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  private setVariable(path: string, value: any, context: Record<string, any>): void {
    const parts = path.split('.');
    let current = context;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  private applyTransforms(value: any, transforms: DataTransform[]): any {
    let result = value;

    for (const transform of transforms) {
      result = this.applyTransform(result, transform);
    }

    return result;
  }

  private applyTransform(value: any, transform: DataTransform): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (transform.type) {
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;

      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;

      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;

      case 'replace':
        if (typeof value === 'string' && transform.pattern && transform.replacement !== undefined) {
          return value.replace(new RegExp(transform.pattern, 'g'), transform.replacement);
        }
        return value;

      case 'split':
        if (typeof value === 'string') {
          return value.split(transform.separator || ',');
        }
        return value;

      case 'join':
        if (Array.isArray(value)) {
          return value.join(transform.separator || ',');
        }
        return value;

      case 'slice':
        if (typeof value === 'string' || Array.isArray(value)) {
          return value.slice(transform.start, transform.end);
        }
        return value;

      case 'template':
        if (transform.template) {
          return transform.template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            return typeof value === 'object' ? value[key] : value;
          });
        }
        return value;

      case 'json-parse':
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          return value;
        }

      case 'json-stringify':
        return JSON.stringify(value);

      case 'regex-extract':
        if (typeof value === 'string' && transform.pattern) {
          const match = value.match(new RegExp(transform.pattern));
          return match ? match[1] || match[0] : null;
        }
        return value;

      default:
        return value;
    }
  }

  private async evaluateConditions(
    conditions: StepCondition[],
    variables: Record<string, any>
  ): Promise<boolean> {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, variables)) {
        return false;
      }
    }

    return true;
  }

  private evaluateCondition(condition: StepCondition, variables: Record<string, any>): boolean {
    const leftValue = this.resolveValue(condition.left, variables);
    const rightValue = condition.right ? this.resolveValue(condition.right, variables) : undefined;

    let result: boolean;

    switch (condition.type) {
      case 'equals':
        result = leftValue === rightValue;
        break;

      case 'contains':
        result = typeof leftValue === 'string' && typeof rightValue === 'string'
          ? leftValue.includes(rightValue)
          : false;
        break;

      case 'exists':
        result = leftValue !== undefined && leftValue !== null;
        break;

      case 'empty':
        result = leftValue === '' || leftValue === null || leftValue === undefined ||
          (Array.isArray(leftValue) && leftValue.length === 0);
        break;

      case 'greater':
        result = Number(leftValue) > Number(rightValue);
        break;

      case 'less':
        result = Number(leftValue) < Number(rightValue);
        break;

      case 'regex':
        result = typeof leftValue === 'string' && typeof rightValue === 'string'
          ? new RegExp(rightValue).test(leftValue)
          : false;
        break;

      default:
        result = false;
    }

    return condition.negate ? !result : result;
  }

  private resolveValue(value: string, variables: Record<string, any>): any {
    // Check if it's a variable reference
    if (value.startsWith('$')) {
      return this.getVariable(value.slice(1), variables);
    }

    // Check if it looks like a variable path
    if (value.includes('.')) {
      const resolved = this.getVariable(value, variables);
      if (resolved !== undefined) {
        return resolved;
      }
    }

    // Return as literal value
    return value;
  }

  private async checkWaitCondition(
    condition: WaitCondition,
    execution: WorkflowExecution
  ): Promise<boolean> {
    switch (condition.type) {
      case 'element':
        // In real implementation, would check if element exists
        return true;

      case 'text':
        // In real implementation, would check if text is present
        return true;

      case 'variable':
        return condition.variable
          ? this.getVariable(condition.variable, execution.variables) !== undefined
          : false;

      case 'timeout':
        return true;

      default:
        return true;
    }
  }

  private handleStepError(
    step: WorkflowStep,
    error: unknown,
    handler: ErrorHandler,
    startTime: number,
    retries: number
  ): StepResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    switch (handler.action) {
      case 'continue':
        return {
          stepId: step.id,
          status: 'success',
          output: handler.fallbackValue,
          duration: Date.now() - startTime,
          retries,
        };

      case 'skip':
        return {
          stepId: step.id,
          status: 'skipped',
          error: errorMessage,
          duration: Date.now() - startTime,
          retries,
        };

      default:
        return {
          stepId: step.id,
          status: 'failed',
          error: errorMessage,
          duration: Date.now() - startTime,
          retries,
        };
    }
  }

  private calculateRetryDelay(config: RetryConfig, attempt: number): number {
    let delay = config.delay;

    if (config.backoff === 'exponential') {
      delay = config.delay * Math.pow(2, attempt - 1);
    } else if (config.backoff === 'linear') {
      delay = config.delay * attempt;
    }

    if (config.maxDelay) {
      delay = Math.min(delay, config.maxDelay);
    }

    return delay;
  }

  private log(
    execution: WorkflowExecution,
    level: LogEntry['level'],
    message: string,
    data?: any
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      stepId: execution.currentStepId,
      message,
      data,
    };

    execution.log.push(entry);
    this.emit({ type: 'log', execution, log: entry });
  }

  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // SIMULATION METHODS (to be replaced with real browser API integration)
  // ============================================================================

  private async extractBySelector(_selector: string, _tab: TabConfig): Promise<string> {
    // Placeholder - would use document.querySelector in real implementation
    return 'extracted-content';
  }

  private async extractByRegex(pattern: string, context: Record<string, any>): Promise<string | null> {
    const source = context['_pageContent'] || '';
    const match = source.match(new RegExp(pattern));
    return match ? match[1] || match[0] : null;
  }

  private extractByJsonPath(path: string, context: Record<string, any>): any {
    return this.getVariable(path, context);
  }

  private async simulateTyping(_selector: string, text: string, delay: number): Promise<void> {
    // Placeholder - would simulate typing in real implementation
    await this.delay(text.length * delay);
  }

  private async simulatePaste(_selector: string, _text: string): Promise<void> {
    await this.delay(100);
  }

  private async simulateClick(_selector: string): Promise<void> {
    await this.delay(100);
  }

  private async simulateSelect(_selector: string, _value: string): Promise<void> {
    await this.delay(100);
  }

  private async simulateKeyPress(_key: string): Promise<void> {
    await this.delay(50);
  }

  // ============================================================================
  // EXECUTION CONTROL
  // ============================================================================

  pauseExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'paused';
      this.emit({ type: 'pause', execution });
      return true;
    }
    return false;
  }

  resumeExecution(executionId: string, userInput?: any): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'paused') {
      if (userInput) {
        execution.variables['human.input'] = userInput;
      }
      execution.status = 'running';
      this.emit({ type: 'resume', execution });
      return true;
    }
    return false;
  }

  cancelExecution(executionId: string): boolean {
    const controller = this.abortControllers.get(executionId);
    if (controller) {
      controller.abort();
      return true;
    }
    return false;
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }
}

// Singleton instance
export const automationEngine = new AutomationEngine();
