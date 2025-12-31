// Persistent Storage Service using IndexedDB
// Provides local persistence for workflows, tabs, executions, and settings

import {
  Workflow,
  WorkflowExecution,
  TabConfig,
  WorkflowTemplate,
} from '@/types/automation';

const DB_NAME = 'one-hub-automation';
const DB_VERSION = 1;

// Store names
const STORES = {
  WORKFLOWS: 'workflows',
  TABS: 'tabs',
  EXECUTIONS: 'executions',
  SETTINGS: 'settings',
  HISTORY: 'history',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

// History entry for version tracking
interface HistoryEntry {
  id: string;
  entityType: 'workflow' | 'tab';
  entityId: string;
  version: number;
  data: any;
  timestamp: Date;
  action: 'create' | 'update' | 'delete';
}

// Settings interface
interface AppSettings {
  id: string;
  autoSave: boolean;
  autoSaveInterval: number;
  maxHistoryVersions: number;
  syncEnabled: boolean;
  syncUrl?: string;
  syncToken?: string;
  theme: 'dark' | 'light' | 'system';
  notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  id: 'app-settings',
  autoSave: true,
  autoSaveInterval: 5000,
  maxHistoryVersions: 50,
  syncEnabled: false,
  theme: 'dark',
  notificationsEnabled: true,
};

class StorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        console.warn('IndexedDB not available, storage will be in-memory only');
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Workflows store
        if (!db.objectStoreNames.contains(STORES.WORKFLOWS)) {
          const workflowStore = db.createObjectStore(STORES.WORKFLOWS, { keyPath: 'id' });
          workflowStore.createIndex('name', 'name', { unique: false });
          workflowStore.createIndex('createdAt', 'createdAt', { unique: false });
          workflowStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Tabs store
        if (!db.objectStoreNames.contains(STORES.TABS)) {
          const tabStore = db.createObjectStore(STORES.TABS, { keyPath: 'id' });
          tabStore.createIndex('name', 'name', { unique: false });
          tabStore.createIndex('type', 'type', { unique: false });
        }

        // Executions store
        if (!db.objectStoreNames.contains(STORES.EXECUTIONS)) {
          const execStore = db.createObjectStore(STORES.EXECUTIONS, { keyPath: 'id' });
          execStore.createIndex('workflowId', 'workflowId', { unique: false });
          execStore.createIndex('status', 'status', { unique: false });
          execStore.createIndex('startedAt', 'startedAt', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
        }

        // History store for version tracking
        if (!db.objectStoreNames.contains(STORES.HISTORY)) {
          const historyStore = db.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
          historyStore.createIndex('entityId', 'entityId', { unique: false });
          historyStore.createIndex('entityType', 'entityType', { unique: false });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDb(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // ============================================================================
  // GENERIC CRUD OPERATIONS
  // ============================================================================

  private async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async get<T>(storeName: StoreName, id: string): Promise<T | undefined> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async put<T>(storeName: StoreName, item: T): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async delete(storeName: StoreName, id: string): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clear(storeName: StoreName): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================================================
  // WORKFLOW OPERATIONS
  // ============================================================================

  async getAllWorkflows(): Promise<Workflow[]> {
    try {
      return await this.getAll<Workflow>(STORES.WORKFLOWS);
    } catch {
      return [];
    }
  }

  async getWorkflow(id: string): Promise<Workflow | undefined> {
    return this.get<Workflow>(STORES.WORKFLOWS, id);
  }

  async saveWorkflow(workflow: Workflow, trackHistory = true): Promise<void> {
    if (trackHistory) {
      await this.addHistoryEntry('workflow', workflow.id, workflow, 'update');
    }
    await this.put(STORES.WORKFLOWS, {
      ...workflow,
      updatedAt: new Date(),
    });
  }

  async deleteWorkflow(id: string): Promise<void> {
    const workflow = await this.getWorkflow(id);
    if (workflow) {
      await this.addHistoryEntry('workflow', id, workflow, 'delete');
    }
    await this.delete(STORES.WORKFLOWS, id);
  }

  // ============================================================================
  // TAB OPERATIONS
  // ============================================================================

  async getAllTabs(): Promise<TabConfig[]> {
    try {
      return await this.getAll<TabConfig>(STORES.TABS);
    } catch {
      return [];
    }
  }

  async getTab(id: string): Promise<TabConfig | undefined> {
    return this.get<TabConfig>(STORES.TABS, id);
  }

  async saveTab(tab: TabConfig, trackHistory = true): Promise<void> {
    if (trackHistory) {
      await this.addHistoryEntry('tab', tab.id, tab, 'update');
    }
    await this.put(STORES.TABS, {
      ...tab,
      updatedAt: new Date(),
    });
  }

  async deleteTab(id: string): Promise<void> {
    const tab = await this.getTab(id);
    if (tab) {
      await this.addHistoryEntry('tab', id, tab, 'delete');
    }
    await this.delete(STORES.TABS, id);
  }

  // ============================================================================
  // EXECUTION OPERATIONS
  // ============================================================================

  async getAllExecutions(): Promise<WorkflowExecution[]> {
    try {
      return await this.getAll<WorkflowExecution>(STORES.EXECUTIONS);
    } catch {
      return [];
    }
  }

  async getExecution(id: string): Promise<WorkflowExecution | undefined> {
    return this.get<WorkflowExecution>(STORES.EXECUTIONS, id);
  }

  async saveExecution(execution: WorkflowExecution): Promise<void> {
    await this.put(STORES.EXECUTIONS, execution);
  }

  async deleteExecution(id: string): Promise<void> {
    await this.delete(STORES.EXECUTIONS, id);
  }

  async getExecutionsByWorkflow(workflowId: string): Promise<WorkflowExecution[]> {
    const all = await this.getAllExecutions();
    return all.filter((e) => e.workflowId === workflowId);
  }

  async clearExecutions(workflowId?: string): Promise<void> {
    if (workflowId) {
      const executions = await this.getExecutionsByWorkflow(workflowId);
      for (const exec of executions) {
        await this.deleteExecution(exec.id);
      }
    } else {
      await this.clear(STORES.EXECUTIONS);
    }
  }

  // ============================================================================
  // SETTINGS OPERATIONS
  // ============================================================================

  async getSettings(): Promise<AppSettings> {
    const settings = await this.get<AppSettings>(STORES.SETTINGS, 'app-settings');
    return settings || DEFAULT_SETTINGS;
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    await this.put(STORES.SETTINGS, {
      ...current,
      ...settings,
      id: 'app-settings',
    });
  }

  // ============================================================================
  // HISTORY / VERSION TRACKING
  // ============================================================================

  private async addHistoryEntry(
    entityType: 'workflow' | 'tab',
    entityId: string,
    data: any,
    action: 'create' | 'update' | 'delete'
  ): Promise<void> {
    const settings = await this.getSettings();
    const history = await this.getEntityHistory(entityType, entityId);

    const entry: HistoryEntry = {
      id: `${entityId}_${Date.now()}`,
      entityType,
      entityId,
      version: history.length + 1,
      data: JSON.parse(JSON.stringify(data)),
      timestamp: new Date(),
      action,
    };

    await this.put(STORES.HISTORY, entry);

    // Prune old history entries
    if (history.length >= settings.maxHistoryVersions) {
      const toDelete = history.slice(0, history.length - settings.maxHistoryVersions + 1);
      for (const oldEntry of toDelete) {
        await this.delete(STORES.HISTORY, oldEntry.id);
      }
    }
  }

  async getEntityHistory(
    entityType: 'workflow' | 'tab',
    entityId: string
  ): Promise<HistoryEntry[]> {
    const all = await this.getAll<HistoryEntry>(STORES.HISTORY);
    return all
      .filter((h) => h.entityType === entityType && h.entityId === entityId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async restoreFromHistory(historyId: string): Promise<any> {
    const entry = await this.get<HistoryEntry>(STORES.HISTORY, historyId);
    if (!entry) {
      throw new Error('History entry not found');
    }

    const restored = {
      ...entry.data,
      updatedAt: new Date(),
    };

    if (entry.entityType === 'workflow') {
      await this.saveWorkflow(restored, false);
    } else {
      await this.saveTab(restored, false);
    }

    return restored;
  }

  // ============================================================================
  // EXPORT / IMPORT
  // ============================================================================

  async exportAll(): Promise<string> {
    const data = {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      workflows: await this.getAllWorkflows(),
      tabs: await this.getAllTabs(),
      executions: await this.getAllExecutions(),
      settings: await this.getSettings(),
    };

    return JSON.stringify(data, null, 2);
  }

  async importAll(jsonString: string, merge = false): Promise<{
    workflows: number;
    tabs: number;
    executions: number;
  }> {
    const data = JSON.parse(jsonString);

    if (!merge) {
      await this.clear(STORES.WORKFLOWS);
      await this.clear(STORES.TABS);
      await this.clear(STORES.EXECUTIONS);
    }

    let workflowCount = 0;
    let tabCount = 0;
    let executionCount = 0;

    if (data.workflows) {
      for (const workflow of data.workflows) {
        await this.saveWorkflow(workflow, false);
        workflowCount++;
      }
    }

    if (data.tabs) {
      for (const tab of data.tabs) {
        await this.saveTab(tab, false);
        tabCount++;
      }
    }

    if (data.executions) {
      for (const execution of data.executions) {
        await this.saveExecution(execution);
        executionCount++;
      }
    }

    if (data.settings) {
      await this.saveSettings(data.settings);
    }

    return {
      workflows: workflowCount,
      tabs: tabCount,
      executions: executionCount,
    };
  }

  async exportWorkflow(workflowId: string): Promise<string> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const tabIds = workflow.tabs;
    const tabs: TabConfig[] = [];

    for (const tabId of tabIds) {
      const tab = await this.getTab(tabId);
      if (tab) {
        tabs.push(tab);
      }
    }

    return JSON.stringify({
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      workflow,
      tabs,
    }, null, 2);
  }

  async importWorkflow(jsonString: string): Promise<{ workflow: Workflow; tabs: TabConfig[] }> {
    const data = JSON.parse(jsonString);

    // Generate new IDs to avoid conflicts
    const now = Date.now();
    const tabIdMap = new Map<string, string>();

    const tabs: TabConfig[] = [];
    if (data.tabs) {
      for (const tab of data.tabs) {
        const newId = `tab_${now}_${Math.random().toString(36).slice(2, 9)}`;
        tabIdMap.set(tab.id, newId);
        const newTab = {
          ...tab,
          id: newId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await this.saveTab(newTab, false);
        tabs.push(newTab);
      }
    }

    // Update workflow with new tab IDs
    const workflow: Workflow = {
      ...data.workflow,
      id: `wf_${now}_${Math.random().toString(36).slice(2, 9)}`,
      tabs: data.workflow.tabs.map((id: string) => tabIdMap.get(id) || id),
      steps: data.workflow.steps.map((step: any) => ({
        ...step,
        id: `step_${now}_${Math.random().toString(36).slice(2, 9)}`,
        tabId: tabIdMap.get(step.tabId) || step.tabId,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    workflow.defaultOrder = workflow.steps.map((s: any) => s.id);
    await this.saveWorkflow(workflow, false);

    return { workflow, tabs };
  }
}

// Singleton instance
export const storageService = new StorageService();

// Initialize on load
if (typeof window !== 'undefined') {
  storageService.init().catch(console.error);
}
