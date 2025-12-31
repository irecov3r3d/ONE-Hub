'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { storageService } from '@/lib/services/storageService';
import { enhancedEngine } from '@/lib/services/enhancedAutomationEngine';
import {
  Workflow,
  WorkflowExecution,
  TabConfig,
  WorkflowTemplate,
} from '@/types/automation';
import { WorkflowService, ALL_TEMPLATES } from '@/lib/services/workflowService';
import { TabConfigService, ALL_PRESETS } from '@/lib/services/tabConfigService';

// ============================================================================
// TYPES
// ============================================================================

interface AutomationState {
  workflows: Workflow[];
  tabs: TabConfig[];
  executions: WorkflowExecution[];
  templates: WorkflowTemplate[];
  isLoading: boolean;
  isInitialized: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

interface UseAutomationStorageReturn extends AutomationState {
  // Workflow actions
  saveWorkflow: (workflow: Workflow) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  duplicateWorkflow: (id: string) => Promise<Workflow>;
  importWorkflow: (json: string) => Promise<Workflow>;
  exportWorkflow: (id: string) => Promise<string>;

  // Tab actions
  saveTab: (tab: TabConfig) => Promise<void>;
  deleteTab: (id: string) => Promise<void>;
  createTabFromPreset: (presetId: string) => Promise<TabConfig>;

  // Execution actions
  runWorkflow: (workflowId: string, customOrder?: string[], variables?: Record<string, any>) => Promise<WorkflowExecution>;
  clearExecutions: (workflowId?: string) => Promise<void>;

  // Utility actions
  refresh: () => Promise<void>;
  exportAll: () => Promise<string>;
  importAll: (json: string, merge?: boolean) => Promise<void>;

  // Extension
  isExtensionConnected: boolean;
  connectExtension: () => Promise<boolean>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useAutomationStorage(): UseAutomationStorageReturn {
  const [state, setState] = useState<AutomationState>({
    workflows: [],
    tabs: [],
    executions: [],
    templates: ALL_TEMPLATES,
    isLoading: true,
    isInitialized: false,
    isSaving: false,
    lastSaved: null,
    error: null,
  });

  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        await storageService.init();
        await enhancedEngine.initialize().then(setIsExtensionConnected);

        if (!mounted) return;

        const [workflows, tabs, executions] = await Promise.all([
          storageService.getAllWorkflows(),
          storageService.getAllTabs(),
          storageService.getAllExecutions(),
        ]);

        setState((prev) => ({
          ...prev,
          workflows,
          tabs,
          executions,
          isLoading: false,
          isInitialized: true,
          error: null,
        }));
      } catch (error) {
        if (!mounted) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize',
        }));
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================================
  // AUTO-SAVE
  // ============================================================================

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      setState((prev) => ({ ...prev, isSaving: true }));

      // Auto-save is handled by individual save operations
      setState((prev) => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
      }));
    }, 2000);
  }, []);

  // ============================================================================
  // WORKFLOW ACTIONS
  // ============================================================================

  const saveWorkflow = useCallback(async (workflow: Workflow) => {
    setState((prev) => ({ ...prev, isSaving: true }));

    try {
      await storageService.saveWorkflow(workflow);

      setState((prev) => {
        const existing = prev.workflows.findIndex((w) => w.id === workflow.id);
        const workflows =
          existing >= 0
            ? prev.workflows.map((w) => (w.id === workflow.id ? workflow : w))
            : [...prev.workflows, workflow];

        return {
          ...prev,
          workflows,
          isSaving: false,
          lastSaved: new Date(),
          error: null,
        };
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to save workflow',
      }));
      throw error;
    }
  }, []);

  const deleteWorkflow = useCallback(async (id: string) => {
    try {
      await storageService.deleteWorkflow(id);

      setState((prev) => ({
        ...prev,
        workflows: prev.workflows.filter((w) => w.id !== id),
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete workflow',
      }));
      throw error;
    }
  }, []);

  const duplicateWorkflow = useCallback(async (id: string): Promise<Workflow> => {
    const original = state.workflows.find((w) => w.id === id);
    if (!original) {
      throw new Error('Workflow not found');
    }

    const now = new Date();
    const duplicate: Workflow = {
      ...JSON.parse(JSON.stringify(original)),
      id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    // Regenerate step IDs
    duplicate.steps = duplicate.steps.map((step, index) => ({
      ...step,
      id: `step_${index + 1}_${Date.now()}`,
    }));
    duplicate.defaultOrder = duplicate.steps.map((s) => s.id);

    await saveWorkflow(duplicate);
    return duplicate;
  }, [state.workflows, saveWorkflow]);

  const importWorkflow = useCallback(async (json: string): Promise<Workflow> => {
    const result = await storageService.importWorkflow(json);

    setState((prev) => ({
      ...prev,
      workflows: [...prev.workflows, result.workflow],
      tabs: [...prev.tabs, ...result.tabs.filter((t) => !prev.tabs.find((pt) => pt.id === t.id))],
    }));

    return result.workflow;
  }, []);

  const exportWorkflow = useCallback(async (id: string): Promise<string> => {
    return storageService.exportWorkflow(id);
  }, []);

  // ============================================================================
  // TAB ACTIONS
  // ============================================================================

  const saveTab = useCallback(async (tab: TabConfig) => {
    setState((prev) => ({ ...prev, isSaving: true }));

    try {
      await storageService.saveTab(tab);

      setState((prev) => {
        const existing = prev.tabs.findIndex((t) => t.id === tab.id);
        const tabs =
          existing >= 0
            ? prev.tabs.map((t) => (t.id === tab.id ? tab : t))
            : [...prev.tabs, tab];

        return {
          ...prev,
          tabs,
          isSaving: false,
          lastSaved: new Date(),
          error: null,
        };
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to save tab',
      }));
      throw error;
    }
  }, []);

  const deleteTab = useCallback(async (id: string) => {
    try {
      await storageService.deleteTab(id);

      setState((prev) => ({
        ...prev,
        tabs: prev.tabs.filter((t) => t.id !== id),
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete tab',
      }));
      throw error;
    }
  }, []);

  const createTabFromPreset = useCallback(async (presetId: string): Promise<TabConfig> => {
    const tab = TabConfigService.createFromPreset(presetId);
    await saveTab(tab);
    return tab;
  }, [saveTab]);

  // ============================================================================
  // EXECUTION ACTIONS
  // ============================================================================

  const runWorkflow = useCallback(
    async (
      workflowId: string,
      customOrder?: string[],
      variables?: Record<string, any>
    ): Promise<WorkflowExecution> => {
      const workflow = state.workflows.find((w) => w.id === workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const execution = await enhancedEngine.executeWorkflow(workflow, customOrder, variables);

      setState((prev) => ({
        ...prev,
        executions: [execution, ...prev.executions],
        workflows: prev.workflows.map((w) =>
          w.id === workflowId ? { ...w, lastRunAt: execution.startedAt } : w
        ),
      }));

      return execution;
    },
    [state.workflows]
  );

  const clearExecutions = useCallback(async (workflowId?: string) => {
    await storageService.clearExecutions(workflowId);

    setState((prev) => ({
      ...prev,
      executions: workflowId
        ? prev.executions.filter((e) => e.workflowId !== workflowId)
        : [],
    }));
  }, []);

  // ============================================================================
  // UTILITY ACTIONS
  // ============================================================================

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const [workflows, tabs, executions] = await Promise.all([
        storageService.getAllWorkflows(),
        storageService.getAllTabs(),
        storageService.getAllExecutions(),
      ]);

      setState((prev) => ({
        ...prev,
        workflows,
        tabs,
        executions,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh',
      }));
    }
  }, []);

  const exportAll = useCallback(async (): Promise<string> => {
    return storageService.exportAll();
  }, []);

  const importAll = useCallback(async (json: string, merge = false) => {
    const result = await storageService.importAll(json, merge);
    await refresh();
  }, [refresh]);

  const connectExtension = useCallback(async (): Promise<boolean> => {
    const connected = await enhancedEngine.initialize();
    setIsExtensionConnected(connected);
    return connected;
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    ...state,
    saveWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    importWorkflow,
    exportWorkflow,
    saveTab,
    deleteTab,
    createTabFromPreset,
    runWorkflow,
    clearExecutions,
    refresh,
    exportAll,
    importAll,
    isExtensionConnected,
    connectExtension,
  };
}

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

export function useWorkflow(id: string | null) {
  const { workflows, saveWorkflow, deleteWorkflow } = useAutomationStorage();
  const workflow = id ? workflows.find((w) => w.id === id) : null;

  return {
    workflow,
    save: saveWorkflow,
    delete: () => id && deleteWorkflow(id),
  };
}

export function useExecutionStatus(executionId: string | null) {
  const [status, setStatus] = useState<WorkflowExecution | null>(null);

  useEffect(() => {
    if (!executionId) {
      setStatus(null);
      return;
    }

    const unsubscribe = enhancedEngine.subscribe((event) => {
      if (event.execution.id === executionId) {
        setStatus({ ...event.execution });
      }
    });

    return unsubscribe;
  }, [executionId]);

  return status;
}
