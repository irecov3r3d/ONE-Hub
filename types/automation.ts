// Multi-Tab AI Automation Types
// Orchestration system for coordinating work across multiple AI tabs

// ============================================================================
// TAB CONFIGURATION
// ============================================================================

export type TabType =
  | 'ai-chat'        // ChatGPT, Claude, Gemini, etc.
  | 'ai-image'       // DALL-E, Midjourney, Stable Diffusion
  | 'ai-audio'       // Suno, Udio, ElevenLabs
  | 'ai-video'       // Runway, Pika, Sora
  | 'ai-code'        // GitHub Copilot, Cursor, Replit
  | 'data-source'    // APIs, databases, spreadsheets
  | 'custom';        // User-defined

export interface TabConfig {
  id: string;
  name: string;
  type: TabType;
  url?: string;
  description?: string;

  // Data extraction configuration
  extraction: ExtractionConfig;

  // Data input configuration
  input: InputConfig;

  // Custom actions available for this tab
  actions: TabAction[];

  // Tab-specific options
  options: Record<string, any>;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DATA EXTRACTION
// ============================================================================

export type ExtractionMethod =
  | 'selector'       // CSS selector
  | 'xpath'          // XPath query
  | 'regex'          // Regular expression
  | 'json-path'      // JSON path for API responses
  | 'text-pattern'   // Pattern matching in text
  | 'clipboard'      // From clipboard
  | 'manual'         // User provides input
  | 'ai-parse';      // AI-powered extraction

export interface ExtractionRule {
  id: string;
  name: string;
  method: ExtractionMethod;

  // Method-specific configuration
  selector?: string;          // CSS selector
  xpath?: string;             // XPath expression
  pattern?: string;           // Regex or text pattern
  jsonPath?: string;          // JSON path

  // Data transformation
  transform?: DataTransform[];

  // Validation
  required?: boolean;
  validation?: ValidationRule;

  // Fallback if extraction fails
  fallback?: string | ExtractionRule;
}

export interface ExtractionConfig {
  rules: ExtractionRule[];

  // Wait conditions before extraction
  waitFor?: WaitCondition;

  // How to combine multiple extractions
  combineMode?: 'object' | 'array' | 'concat' | 'first';

  // Post-extraction processing
  postProcess?: DataTransform[];
}

// ============================================================================
// DATA INPUT / INJECTION
// ============================================================================

export type InputMethod =
  | 'type'           // Simulate typing
  | 'paste'          // Paste from clipboard
  | 'set-value'      // Direct value assignment
  | 'click'          // Click element
  | 'select'         // Select dropdown option
  | 'upload'         // File upload
  | 'api-call';      // Direct API call

export interface InputTarget {
  id: string;
  name: string;
  method: InputMethod;

  // Target element
  selector?: string;
  xpath?: string;

  // Input options
  delay?: number;             // Delay between keystrokes (ms)
  clearFirst?: boolean;       // Clear existing content
  pressEnter?: boolean;       // Press enter after input

  // For file uploads
  fileTypes?: string[];

  // For API calls
  endpoint?: string;
  headers?: Record<string, string>;
}

export interface InputConfig {
  targets: InputTarget[];

  // Wait conditions before input
  waitFor?: WaitCondition;

  // Actions after all inputs
  submitAction?: TabAction;
}

// ============================================================================
// TAB ACTIONS
// ============================================================================

export type ActionType =
  | 'click'
  | 'type'
  | 'wait'
  | 'scroll'
  | 'screenshot'
  | 'extract'
  | 'evaluate'       // Run JavaScript
  | 'navigate'
  | 'refresh'
  | 'custom';

export interface TabAction {
  id: string;
  name: string;
  type: ActionType;

  // Action-specific config
  selector?: string;
  value?: string;
  script?: string;           // For 'evaluate' type
  duration?: number;         // For 'wait' type
  url?: string;              // For 'navigate' type

  // Conditions
  condition?: ActionCondition;

  // Error handling
  onError?: 'continue' | 'stop' | 'retry';
  retryCount?: number;
  retryDelay?: number;
}

export interface ActionCondition {
  type: 'element-exists' | 'element-visible' | 'text-contains' | 'custom';
  selector?: string;
  text?: string;
  script?: string;
  negate?: boolean;
}

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

export interface Workflow {
  id: string;
  name: string;
  description?: string;

  // Tabs involved in this workflow
  tabs: string[];            // Tab config IDs

  // Workflow steps
  steps: WorkflowStep[];

  // Execution order (can be customized per run)
  defaultOrder: string[];    // Step IDs in order

  // Global workflow options
  options: WorkflowOptions;

  // Variables that persist across steps
  variables: Record<string, any>;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;

  // Which tab this step operates on
  tabId: string;

  // Step type
  type: StepType;

  // Step-specific configuration
  config: StepConfig;

  // Data mapping from previous steps
  inputMapping?: DataMapping[];

  // What data this step outputs
  outputMapping?: DataMapping[];

  // Conditions for execution
  conditions?: StepCondition[];

  // Error handling
  onError?: ErrorHandler;

  // Timing
  timeout?: number;
  retryConfig?: RetryConfig;
}

export type StepType =
  | 'extract'        // Extract data from tab
  | 'input'          // Input data into tab
  | 'action'         // Perform action on tab
  | 'transform'      // Transform data (no tab interaction)
  | 'condition'      // Conditional branching
  | 'loop'           // Loop over data
  | 'parallel'       // Run multiple steps in parallel
  | 'wait'           // Wait for condition or time
  | 'human'          // Pause for human intervention
  | 'ai-decide';     // Let AI decide next action

export interface StepConfig {
  // For 'extract' type
  extractionRules?: string[];      // ExtractionRule IDs

  // For 'input' type
  inputTargets?: string[];         // InputTarget IDs
  inputData?: Record<string, any>; // Static data to input

  // For 'action' type
  actions?: string[];              // TabAction IDs

  // For 'transform' type
  transforms?: DataTransform[];

  // For 'condition' type
  condition?: StepCondition;
  thenSteps?: string[];           // Step IDs if true
  elseSteps?: string[];           // Step IDs if false

  // For 'loop' type
  loopOver?: string;              // Variable name to loop over
  loopSteps?: string[];           // Steps to execute per iteration
  maxIterations?: number;

  // For 'parallel' type
  parallelSteps?: string[];       // Steps to run in parallel

  // For 'wait' type
  waitCondition?: WaitCondition;
  waitDuration?: number;

  // For 'human' type
  message?: string;               // Message to show user
  inputRequired?: boolean;        // Wait for user input

  // For 'ai-decide' type
  aiPrompt?: string;              // Prompt for AI decision
  aiOptions?: string[];           // Possible next steps
}

// ============================================================================
// DATA MAPPING & TRANSFORMATION
// ============================================================================

export interface DataMapping {
  source: string;              // Source variable path (e.g., "step1.output.title")
  target: string;              // Target variable path
  transform?: DataTransform[]; // Transformations to apply
  defaultValue?: any;          // Default if source is null/undefined
}

export type TransformType =
  | 'trim'
  | 'lowercase'
  | 'uppercase'
  | 'replace'
  | 'split'
  | 'join'
  | 'slice'
  | 'filter'
  | 'map'
  | 'template'       // String template with variables
  | 'json-parse'
  | 'json-stringify'
  | 'regex-extract'
  | 'regex-replace'
  | 'custom';        // Custom JavaScript function

export interface DataTransform {
  type: TransformType;

  // Transform-specific options
  pattern?: string;           // For replace, regex operations
  replacement?: string;       // For replace operations
  template?: string;          // For template type
  separator?: string;         // For split/join
  start?: number;             // For slice
  end?: number;               // For slice
  script?: string;            // For custom type

  // Additional options
  options?: Record<string, any>;
}

// ============================================================================
// CONDITIONS & WAIT
// ============================================================================

export interface StepCondition {
  type: 'equals' | 'contains' | 'exists' | 'empty' | 'greater' | 'less' | 'regex' | 'custom';
  left: string;               // Variable path or value
  right?: string;             // Comparison value
  negate?: boolean;           // Invert condition
}

export interface WaitCondition {
  type: 'element' | 'text' | 'timeout' | 'variable' | 'custom';
  selector?: string;
  text?: string;
  duration?: number;
  variable?: string;
  script?: string;
  timeout?: number;           // Max wait time
  pollInterval?: number;      // Check interval
  validation?: {              // Content validation
    minLength?: number;
    maxLength?: number;
    mustContain?: string[];
    mustNotContain?: string[];
    pattern?: string;
    format?: string;
  };
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message?: string;
}

// ============================================================================
// ERROR HANDLING & RETRY
// ============================================================================

export interface ErrorHandler {
  action: 'stop' | 'continue' | 'retry' | 'skip' | 'goto';
  gotoStep?: string;          // For 'goto' action
  logError?: boolean;
  notifyUser?: boolean;
  fallbackValue?: any;
}

export interface RetryConfig {
  maxRetries: number;
  delay: number;              // Initial delay (ms)
  backoff?: 'linear' | 'exponential';
  maxDelay?: number;
}

// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================

export interface WorkflowOptions {
  // Execution settings
  sequential?: boolean;       // Run steps sequentially (default: true)
  stopOnError?: boolean;      // Stop workflow on any error
  timeout?: number;           // Global timeout

  // Logging
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  saveHistory?: boolean;

  // Notifications
  notifyOnComplete?: boolean;
  notifyOnError?: boolean;

  // Tab management
  autoFocusTab?: boolean;     // Auto-focus tab before action
  keepTabsOpen?: boolean;     // Keep tabs open after workflow
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;

  // Execution state
  status: ExecutionStatus;
  currentStepId?: string;

  // Custom order for this run
  stepOrder: string[];

  // Progress
  completedSteps: string[];
  failedSteps: string[];
  skippedSteps: string[];

  // Data collected during execution
  stepResults: Record<string, StepResult>;
  variables: Record<string, any>;

  // Timing
  startedAt: Date;
  completedAt?: Date;

  // Error info
  errors: ExecutionError[];

  // History log
  log: LogEntry[];
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'          // Waiting for human input
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface StepResult {
  stepId: string;
  status: 'success' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  duration: number;
  retries: number;
}

export interface ExecutionError {
  stepId: string;
  message: string;
  stack?: string;
  timestamp: Date;
}

export interface LogEntry {
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  stepId?: string;
  message: string;
  data?: any;
}

// ============================================================================
// TEMPLATES & PRESETS
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;

  // Template definition
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>;
  requiredTabs: TabType[];

  // Customization options
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  required?: boolean;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  description?: string;
}

export interface TabPreset {
  id: string;
  name: string;
  type: TabType;
  description: string;

  // Pre-configured settings
  config: Omit<TabConfig, 'id' | 'createdAt' | 'updatedAt'>;
}

// ============================================================================
// UI STATE
// ============================================================================

export interface AutomationState {
  // Configured tabs
  tabs: TabConfig[];

  // Saved workflows
  workflows: Workflow[];

  // Current execution
  activeExecution?: WorkflowExecution;

  // Templates
  templates: WorkflowTemplate[];
  tabPresets: TabPreset[];

  // UI state
  selectedTabId?: string;
  selectedWorkflowId?: string;
  isEditing: boolean;
  viewMode: 'tabs' | 'workflows' | 'execution' | 'history';
}
