'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  Copy,
  Settings,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  Save,
  Download,
  Upload,
  Zap,
  Layers,
  GitBranch,
  Target,
  Edit3,
  Eye,
  MoreVertical,
  RefreshCw,
  Bot,
  Workflow as WorkflowIcon,
  GripVertical,
} from 'lucide-react';
import {
  Workflow,
  WorkflowStep,
  WorkflowExecution,
  WorkflowTemplate,
  TabConfig,
  TabPreset,
  ExecutionStatus,
  StepResult,
  AutomationState,
} from '@/types/automation';
import { WorkflowService, ALL_TEMPLATES } from '@/lib/services/workflowService';
import { TabConfigService, ALL_PRESETS } from '@/lib/services/tabConfigService';
import { automationEngine } from '@/lib/services/automationEngine';

type ViewMode = 'templates' | 'workflows' | 'tabs' | 'execution' | 'history';
type EditMode = 'none' | 'workflow' | 'step' | 'tab';

interface WorkflowAutomationProps {
  onClose?: () => void;
}

export default function WorkflowAutomation({ onClose }: WorkflowAutomationProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('templates');
  const [editMode, setEditMode] = useState<EditMode>('none');

  // Data
  const [templates] = useState<WorkflowTemplate[]>(ALL_TEMPLATES);
  const [presets] = useState<TabPreset[]>(ALL_PRESETS);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [tabs, setTabs] = useState<TabConfig[]>([]);

  // Selections
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);

  // Execution
  const [activeExecution, setActiveExecution] = useState<WorkflowExecution | null>(null);
  const [executionHistory, setExecutionHistory] = useState<WorkflowExecution[]>([]);

  // UI State
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['templates']));
  const [customOrder, setCustomOrder] = useState<string[] | null>(null);
  const [variables, setVariables] = useState<Record<string, any>>({});

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    // Load saved workflows and tabs
    setWorkflows(WorkflowService.getAllWorkflows());
    setTabs(TabConfigService.getAllTabs());
    setExecutionHistory(WorkflowService.getExecutionHistory());

    // Subscribe to execution events
    const unsubscribe = automationEngine.subscribe((event) => {
      setActiveExecution({ ...event.execution });

      if (event.type === 'complete' || event.type === 'error') {
        setExecutionHistory(WorkflowService.getExecutionHistory());
      }
    });

    return () => unsubscribe();
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleCreateFromTemplate = useCallback((template: WorkflowTemplate) => {
    // Create tabs from presets if not already configured
    const tabMappings: Record<string, string> = {};

    for (const step of template.workflow.steps) {
      if (step.tabId && !tabMappings[step.tabId]) {
        const preset = presets.find((p) => p.id === step.tabId);
        if (preset) {
          const tab = TabConfigService.createFromPreset(preset.id);
          tabMappings[step.tabId] = tab.id;
          setTabs((prev) => [...prev, tab]);
          automationEngine.registerTab(tab);
        }
      }
    }

    // Set default variable values from template
    const templateVars: Record<string, any> = {};
    for (const v of template.variables) {
      templateVars[v.name] = v.defaultValue;
    }
    setVariables(templateVars);

    const workflow = WorkflowService.createFromTemplate(template.id, tabMappings, templateVars);
    setWorkflows((prev) => [...prev, workflow]);
    setSelectedWorkflowId(workflow.id);
    setViewMode('workflows');
  }, [presets]);

  const handleCreateCustomWorkflow = useCallback(() => {
    const workflow = WorkflowService.createCustomWorkflow(
      'New Workflow',
      'Custom automation workflow',
      tabs.map((t) => t.id)
    );
    setWorkflows((prev) => [...prev, workflow]);
    setSelectedWorkflowId(workflow.id);
    setEditMode('workflow');
  }, [tabs]);

  const handleDeleteWorkflow = useCallback((id: string) => {
    WorkflowService.deleteWorkflow(id);
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    if (selectedWorkflowId === id) {
      setSelectedWorkflowId(null);
    }
  }, [selectedWorkflowId]);

  const handleDuplicateWorkflow = useCallback((id: string) => {
    const duplicate = WorkflowService.duplicateWorkflow(id);
    setWorkflows((prev) => [...prev, duplicate]);
    setSelectedWorkflowId(duplicate.id);
  }, []);

  const handleRunWorkflow = useCallback(async (workflowId: string) => {
    setViewMode('execution');
    try {
      const execution = await WorkflowService.executeWorkflow(
        workflowId,
        customOrder || undefined,
        variables
      );
      setActiveExecution(execution);
    } catch (error) {
      console.error('Workflow execution failed:', error);
    }
  }, [customOrder, variables]);

  const handlePauseExecution = useCallback(() => {
    if (activeExecution) {
      automationEngine.pauseExecution(activeExecution.id);
    }
  }, [activeExecution]);

  const handleResumeExecution = useCallback(() => {
    if (activeExecution) {
      automationEngine.resumeExecution(activeExecution.id);
    }
  }, [activeExecution]);

  const handleCancelExecution = useCallback(() => {
    if (activeExecution) {
      automationEngine.cancelExecution(activeExecution.id);
    }
  }, [activeExecution]);

  const handleCreateTab = useCallback((presetId: string) => {
    const tab = TabConfigService.createFromPreset(presetId);
    setTabs((prev) => [...prev, tab]);
    automationEngine.registerTab(tab);
    setSelectedTabId(tab.id);
  }, []);

  const handleDeleteTab = useCallback((id: string) => {
    TabConfigService.deleteTab(id);
    automationEngine.unregisterTab(id);
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (selectedTabId === id) {
      setSelectedTabId(null);
    }
  }, [selectedTabId]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);
  const selectedTab = tabs.find((t) => t.id === selectedTabId);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'cancelled':
        return <Square className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepStatusIcon = (result?: StepResult) => {
    if (!result) return <Clock className="w-4 h-4 text-gray-500" />;

    switch (result.status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'skipped':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-purple-400" />
          <h1 className="text-xl font-semibold">Multi-Tab AI Automation</h1>
        </div>
        <div className="flex items-center gap-2">
          {activeExecution && activeExecution.status === 'running' && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full text-blue-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-700 bg-gray-800/50">
        {(['templates', 'workflows', 'tabs', 'execution', 'history'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - List */}
        <div className="w-80 border-r border-gray-700 overflow-y-auto">
          {viewMode === 'templates' && (
            <div className="p-4 space-y-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Workflow Templates
              </h2>
              {WorkflowService.getCategories().map((category) => (
                <div key={category} className="space-y-2">
                  <button
                    onClick={() => toggleSection(category)}
                    className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-300"
                  >
                    {expandedSections.has(category) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                  {expandedSections.has(category) && (
                    <div className="ml-6 space-y-2">
                      {templates
                        .filter((t) => t.category === category)
                        .map((template) => (
                          <div
                            key={template.id}
                            className="p-3 bg-gray-800 rounded-lg hover:bg-gray-750 cursor-pointer transition-colors"
                            onClick={() => handleCreateFromTemplate(template)}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Zap className="w-4 h-4 text-yellow-400" />
                              <span className="font-medium text-sm">{template.name}</span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2">
                              {template.description}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.requiredTabs.map((tabType) => (
                                <span
                                  key={tabType}
                                  className="px-2 py-0.5 text-xs bg-gray-700 rounded-full text-gray-300"
                                >
                                  {tabType}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {viewMode === 'workflows' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  My Workflows
                </h2>
                <button
                  onClick={handleCreateCustomWorkflow}
                  className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Create new workflow"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedWorkflowId === workflow.id
                        ? 'bg-purple-500/20 border border-purple-500/50'
                        : 'bg-gray-800 hover:bg-gray-750 border border-transparent'
                    }`}
                    onClick={() => setSelectedWorkflowId(workflow.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <WorkflowIcon className="w-4 h-4 text-purple-400" />
                        <span className="font-medium text-sm">{workflow.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunWorkflow(workflow.id);
                          }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                          title="Run workflow"
                        >
                          <Play className="w-3.5 h-3.5 text-green-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateWorkflow(workflow.id);
                          }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkflow(workflow.id);
                          }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {workflow.description || `${workflow.steps.length} steps`}
                    </p>
                    {workflow.lastRunAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last run: {new Date(workflow.lastRunAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
                {workflows.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No workflows yet. Create one from a template or start from scratch.
                  </p>
                )}
              </div>
            </div>
          )}

          {viewMode === 'tabs' && (
            <div className="p-4 space-y-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Tab Presets
              </h2>
              {['ai-chat', 'ai-image', 'ai-audio', 'ai-code', 'ai-video', 'data-source'].map(
                (type) => (
                  <div key={type} className="space-y-2">
                    <button
                      onClick={() => toggleSection(type)}
                      className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-300"
                    >
                      {expandedSections.has(type) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {type.replace('ai-', 'AI ').replace('data-', 'Data ')}
                    </button>
                    {expandedSections.has(type) && (
                      <div className="ml-6 space-y-2">
                        {presets
                          .filter((p) => p.type === type)
                          .map((preset) => (
                            <div
                              key={preset.id}
                              className="p-3 bg-gray-800 rounded-lg hover:bg-gray-750 cursor-pointer transition-colors"
                              onClick={() => handleCreateTab(preset.id)}
                            >
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-blue-400" />
                                <span className="font-medium text-sm">{preset.name}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{preset.description}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )
              )}

              <div className="pt-4 border-t border-gray-700">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Configured Tabs
                </h2>
                <div className="space-y-2">
                  {tabs.map((tab) => (
                    <div
                      key={tab.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedTabId === tab.id
                          ? 'bg-blue-500/20 border border-blue-500/50'
                          : 'bg-gray-800 hover:bg-gray-750 border border-transparent'
                      }`}
                      onClick={() => setSelectedTabId(tab.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-400" />
                          <span className="font-medium text-sm">{tab.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTab(tab.id);
                          }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{tab.type}</p>
                    </div>
                  ))}
                  {tabs.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No tabs configured. Click a preset to add one.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'execution' && activeExecution && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Execution
                </h2>
                <div className="flex items-center gap-1">
                  {activeExecution.status === 'running' && (
                    <button
                      onClick={handlePauseExecution}
                      className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Pause"
                    >
                      <Pause className="w-4 h-4 text-yellow-400" />
                    </button>
                  )}
                  {activeExecution.status === 'paused' && (
                    <button
                      onClick={handleResumeExecution}
                      className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Resume"
                    >
                      <Play className="w-4 h-4 text-green-400" />
                    </button>
                  )}
                  {(activeExecution.status === 'running' ||
                    activeExecution.status === 'paused') && (
                    <button
                      onClick={handleCancelExecution}
                      className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <Square className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(activeExecution.status)}
                  <span className="font-medium capitalize">{activeExecution.status}</span>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>Started: {new Date(activeExecution.startedAt).toLocaleTimeString()}</div>
                  {activeExecution.completedAt && (
                    <div>
                      Completed: {new Date(activeExecution.completedAt).toLocaleTimeString()}
                    </div>
                  )}
                  <div>
                    Progress: {activeExecution.completedSteps.length} /{' '}
                    {activeExecution.stepOrder.length} steps
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {activeExecution.stepOrder.map((stepId, index) => {
                  const result = activeExecution.stepResults[stepId];
                  const isCurrent = activeExecution.currentStepId === stepId;
                  const workflow = workflows.find((w) => w.id === activeExecution.workflowId);
                  const step = workflow?.steps.find((s) => s.id === stepId);

                  return (
                    <div
                      key={stepId}
                      className={`p-3 rounded-lg ${
                        isCurrent
                          ? 'bg-blue-500/20 border border-blue-500/50'
                          : 'bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-5">{index + 1}</span>
                        {isCurrent && activeExecution.status === 'running' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        ) : (
                          getStepStatusIcon(result)
                        )}
                        <span className="text-sm font-medium">{step?.name || stepId}</span>
                      </div>
                      {result && (
                        <div className="mt-1 ml-7 text-xs text-gray-400">
                          {result.duration}ms
                          {result.retries > 0 && ` (${result.retries} retries)`}
                        </div>
                      )}
                      {result?.error && (
                        <div className="mt-1 ml-7 text-xs text-red-400">{result.error}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'history' && (
            <div className="p-4 space-y-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Execution History
              </h2>
              <div className="space-y-2">
                {executionHistory.map((exec) => {
                  const workflow = workflows.find((w) => w.id === exec.workflowId);
                  return (
                    <div key={exec.id} className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(exec.status)}
                        <span className="font-medium text-sm">
                          {workflow?.name || 'Unknown'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(exec.startedAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {exec.completedSteps.length} completed, {exec.failedSteps.length} failed
                      </div>
                    </div>
                  );
                })}
                {executionHistory.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No execution history yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Details */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'templates' && (
            <div className="p-6">
              <div className="text-center py-12">
                <Bot className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
                <h2 className="text-xl font-semibold mb-2">Welcome to Multi-Tab AI Automation</h2>
                <p className="text-gray-400 max-w-md mx-auto mb-6">
                  Orchestrate multiple AI tools to work together. Select a template to get started
                  or create a custom workflow from scratch.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setViewMode('workflows')}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium transition-colors"
                  >
                    View Workflows
                  </button>
                  <button
                    onClick={() => setViewMode('tabs')}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                  >
                    Configure Tabs
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'workflows' && selectedWorkflow && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">{selectedWorkflow.name}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {selectedWorkflow.description || 'No description'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunWorkflow(selectedWorkflow.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Run Workflow
                  </button>
                  <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Variables Section */}
              {Object.keys(variables).length > 0 && (
                <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Variables</h3>
                  <div className="space-y-3">
                    {Object.entries(variables).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-3">
                        <label className="text-sm text-gray-400 w-32">{key}:</label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            setVariables((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-300">Steps</h3>
                  <button
                    onClick={() => {
                      setCustomOrder(customOrder ? null : selectedWorkflow.defaultOrder);
                    }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    {customOrder ? 'Reset Order' : 'Custom Order'}
                  </button>
                </div>

                {selectedWorkflow.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-4 bg-gray-800 rounded-lg border transition-colors ${
                      selectedStepId === step.id
                        ? 'border-purple-500'
                        : 'border-transparent hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedStepId(step.id)}
                  >
                    <div className="flex items-center gap-3">
                      {customOrder && (
                        <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
                      )}
                      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{step.name}</span>
                          <span className="px-2 py-0.5 text-xs bg-gray-700 rounded-full text-gray-300">
                            {step.type}
                          </span>
                        </div>
                        {step.description && (
                          <p className="text-xs text-gray-400 mt-1">{step.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-1 hover:bg-gray-700 rounded transition-colors">
                          <Edit3 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-1 hover:bg-gray-700 rounded transition-colors">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {/* Step Details */}
                    {selectedStepId === step.id && (
                      <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Tab:</span>
                            <span className="ml-2">
                              {tabs.find((t) => t.id === step.tabId)?.name || step.tabId || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Type:</span>
                            <span className="ml-2">{step.type}</span>
                          </div>
                        </div>

                        {step.inputMapping && step.inputMapping.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500">Input Mappings:</span>
                            <div className="mt-1 space-y-1">
                              {step.inputMapping.map((mapping, i) => (
                                <div
                                  key={i}
                                  className="text-xs px-2 py-1 bg-gray-700 rounded flex items-center gap-2"
                                >
                                  <span className="text-blue-400">{mapping.source}</span>
                                  <ChevronRight className="w-3 h-3 text-gray-500" />
                                  <span className="text-green-400">{mapping.target}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {step.outputMapping && step.outputMapping.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500">Output Mappings:</span>
                            <div className="mt-1 space-y-1">
                              {step.outputMapping.map((mapping, i) => (
                                <div
                                  key={i}
                                  className="text-xs px-2 py-1 bg-gray-700 rounded flex items-center gap-2"
                                >
                                  <span className="text-blue-400">{mapping.source}</span>
                                  <ChevronRight className="w-3 h-3 text-gray-500" />
                                  <span className="text-green-400">{mapping.target}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <button
                  className="w-full p-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-white hover:border-purple-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>
              </div>
            </div>
          )}

          {viewMode === 'tabs' && selectedTab && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">{selectedTab.name}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {selectedTab.description || selectedTab.type}
                  </p>
                </div>
                <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              {/* Extraction Rules */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Extraction Rules</h3>
                <div className="space-y-2">
                  {selectedTab.extraction.rules.map((rule) => (
                    <div key={rule.id} className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{rule.name}</span>
                        <span className="px-2 py-0.5 text-xs bg-gray-700 rounded-full">
                          {rule.method}
                        </span>
                      </div>
                      {rule.selector && (
                        <code className="text-xs text-gray-400 block mt-1 font-mono">
                          {rule.selector}
                        </code>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Input Targets */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Input Targets</h3>
                <div className="space-y-2">
                  {selectedTab.input.targets.map((target) => (
                    <div key={target.id} className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{target.name}</span>
                        <span className="px-2 py-0.5 text-xs bg-gray-700 rounded-full">
                          {target.method}
                        </span>
                      </div>
                      {target.selector && (
                        <code className="text-xs text-gray-400 block mt-1 font-mono">
                          {target.selector}
                        </code>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Available Actions</h3>
                <div className="space-y-2">
                  {selectedTab.actions.map((action) => (
                    <div key={action.id} className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{action.name}</span>
                        <span className="px-2 py-0.5 text-xs bg-gray-700 rounded-full">
                          {action.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'execution' && activeExecution && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Execution Log</h2>
              <div className="space-y-2 font-mono text-sm">
                {activeExecution.log.map((entry, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      entry.level === 'error'
                        ? 'text-red-400'
                        : entry.level === 'warn'
                        ? 'text-yellow-400'
                        : entry.level === 'debug'
                        ? 'text-gray-500'
                        : 'text-gray-300'
                    }`}
                  >
                    <span className="text-gray-500 w-24 flex-shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="w-16 flex-shrink-0 uppercase text-xs">[{entry.level}]</span>
                    <span>{entry.message}</span>
                  </div>
                ))}
                {activeExecution.log.length === 0 && (
                  <p className="text-gray-500">No log entries yet...</p>
                )}
              </div>
            </div>
          )}

          {!selectedWorkflow && !selectedTab && viewMode !== 'templates' && viewMode !== 'execution' && (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select an item from the left panel to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
