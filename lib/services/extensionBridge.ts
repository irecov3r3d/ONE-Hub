// Extension Bridge Service
// Handles communication between ONE-Hub app and browser extension

/// <reference types="chrome" />

import { TabConfig, ExtractionConfig, InputConfig, TabAction } from '@/types/automation';
import { PROVIDER_CONFIGS, DetectionConfig } from './responseDetection';

// Declare chrome as optional for environments where it's not available
declare const chrome: typeof globalThis.chrome | undefined;

// ============================================================================
// TYPES
// ============================================================================

interface ExtensionMessage {
  requestId?: string;
  type: string;
  [key: string]: any;
}

interface TabInfo {
  id: number;
  url: string;
  provider: string;
  status: 'loading' | 'ready' | 'closed';
}

interface BridgeEventHandler {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onTabRegistered?: (tab: TabInfo) => void;
  onTabClosed?: (tabId: number) => void;
  onStatusUpdate?: (tabId: number, status: string) => void;
  onError?: (error: Error) => void;
}

// Extension ID for Chrome runtime messaging (set this when extension is installed)
const EXTENSION_ID = '';

// ============================================================================
// EXTENSION BRIDGE SERVICE
// ============================================================================

export class ExtensionBridge {
  private connected = false;
  private registeredTabs: Map<number, TabInfo> = new Map();
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
  private eventHandlers: BridgeEventHandler = {};
  private messageQueue: ExtensionMessage[] = [];
  private extensionPort: any = null;

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async connect(): Promise<boolean> {
    // Try Chrome extension runtime messaging first
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        return await this.connectViaRuntime();
      } catch (error) {
        console.log('Chrome runtime not available, trying external messaging');
      }
    }

    // Try external messaging (for web app)
    if (EXTENSION_ID) {
      try {
        return await this.connectViaExternalMessaging();
      } catch (error) {
        console.log('External messaging failed');
      }
    }

    console.warn('Extension bridge: No connection method available');
    return false;
  }

  private async connectViaRuntime(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!chrome?.runtime?.sendMessage) {
          resolve(false);
          return;
        }

        chrome.runtime.sendMessage({ type: 'ping' }, (response: any) => {
          if (chrome?.runtime?.lastError) {
            console.log('Extension not responding:', chrome.runtime.lastError);
            resolve(false);
            return;
          }

          if (response?.pong) {
            this.connected = true;
            this.eventHandlers.onConnect?.();
            this.processMessageQueue();
            resolve(true);
          } else {
            resolve(false);
          }
        });
      } catch {
        resolve(false);
      }
    });
  }

  private async connectViaExternalMessaging(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!chrome?.runtime?.sendMessage) {
          resolve(false);
          return;
        }

        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'connect' }, (response: any) => {
          if (chrome?.runtime?.lastError || !response?.success) {
            resolve(false);
            return;
          }

          this.connected = true;
          this.eventHandlers.onConnect?.();
          this.processMessageQueue();
          resolve(true);
        });
      } catch {
        resolve(false);
      }
    });
  }

  disconnect(): void {
    this.connected = false;
    this.registeredTabs.clear();
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Disconnected'));
    });
    this.pendingRequests.clear();
    this.eventHandlers.onDisconnect?.();
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  on(handlers: BridgeEventHandler): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  private handleMessage(message: ExtensionMessage): void {
    // Handle response to pending request
    if (message.requestId && this.pendingRequests.has(message.requestId)) {
      const { resolve, reject, timeout } = this.pendingRequests.get(message.requestId)!;
      clearTimeout(timeout);
      this.pendingRequests.delete(message.requestId);

      if (message.success) {
        resolve(message);
      } else {
        reject(new Error(message.error || 'Request failed'));
      }
      return;
    }

    // Handle events
    switch (message.type) {
      case 'tab-registered':
        const tabInfo: TabInfo = {
          id: message.tabId,
          url: message.url,
          provider: message.provider,
          status: 'ready',
        };
        this.registeredTabs.set(message.tabId, tabInfo);
        this.eventHandlers.onTabRegistered?.(tabInfo);
        break;

      case 'status-update':
        if (message.status === 'closed') {
          this.registeredTabs.delete(message.tabId);
          this.eventHandlers.onTabClosed?.(message.tabId);
        } else {
          const tab = this.registeredTabs.get(message.tabId);
          if (tab) {
            tab.status = message.status;
          }
          this.eventHandlers.onStatusUpdate?.(message.tabId, message.status);
        }
        break;

      case 'error':
        this.eventHandlers.onError?.(new Error(message.error));
        break;
    }
  }

  // ============================================================================
  // MESSAGING
  // ============================================================================

  private async sendMessage(message: ExtensionMessage, timeout = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const fullMessage = { ...message, requestId };

      if (!this.connected) {
        this.messageQueue.push(fullMessage);
        reject(new Error('Not connected to extension'));
        return;
      }

      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, timeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout: timeoutId });

      try {
        if (EXTENSION_ID && chrome?.runtime?.sendMessage) {
          chrome.runtime.sendMessage(EXTENSION_ID, fullMessage, (response: any) => {
            if (chrome?.runtime?.lastError) {
              this.pendingRequests.delete(requestId);
              clearTimeout(timeoutId);
              reject(new Error(chrome.runtime.lastError.message || 'Unknown error'));
              return;
            }
            this.handleMessage({ ...response, requestId });
          });
        } else if (chrome?.runtime?.sendMessage) {
          chrome.runtime.sendMessage(fullMessage, (response: any) => {
            if (chrome?.runtime?.lastError) {
              this.pendingRequests.delete(requestId);
              clearTimeout(timeoutId);
              reject(new Error(chrome.runtime.lastError.message || 'Unknown error'));
              return;
            }
            this.handleMessage({ ...response, requestId });
          });
        } else {
          reject(new Error('Chrome runtime not available'));
        }
      } catch (error) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message).catch(console.error);
      }
    }
  }

  // ============================================================================
  // TAB MANAGEMENT
  // ============================================================================

  async registerTab(url: string, provider: string): Promise<number> {
    const response = await this.sendMessage({
      type: 'register-tab',
      url,
      provider,
    });

    return response.tabId;
  }

  async getTabStatus(tabId: number): Promise<TabInfo | null> {
    const response = await this.sendMessage({
      type: 'check-status',
      tabId,
    });

    return response.ready ? {
      id: tabId,
      url: response.url,
      provider: response.provider,
      status: response.status,
    } : null;
  }

  getRegisteredTabs(): TabInfo[] {
    return Array.from(this.registeredTabs.values());
  }

  // ============================================================================
  // DATA EXTRACTION
  // ============================================================================

  async extractData(
    tabId: number,
    config: ExtractionConfig
  ): Promise<Record<string, any>> {
    const response = await this.sendMessage({
      type: 'extract-data',
      tabId,
      config: {
        rules: config.rules.map(rule => ({
          id: rule.id,
          name: rule.name,
          method: rule.method,
          selector: rule.selector,
          xpath: rule.xpath,
          pattern: rule.pattern,
          multiple: false,
          transforms: rule.transform,
        })),
      },
    });

    return response.data;
  }

  // ============================================================================
  // DATA INJECTION
  // ============================================================================

  async injectData(
    tabId: number,
    config: InputConfig,
    data: Record<string, any>
  ): Promise<boolean> {
    const response = await this.sendMessage({
      type: 'inject-data',
      tabId,
      config: {
        targets: config.targets.map(target => ({
          id: target.id,
          name: target.name,
          method: target.method,
          selector: target.selector,
          delay: target.delay,
          clearFirst: target.clearFirst,
          pressEnter: target.pressEnter,
        })),
        submitAction: config.submitAction ? {
          id: config.submitAction.id,
          type: config.submitAction.type,
          selector: config.submitAction.selector,
        } : undefined,
      },
      data,
    });

    return response.success;
  }

  // ============================================================================
  // ACTION EXECUTION
  // ============================================================================

  async executeAction(tabId: number, action: TabAction): Promise<any> {
    const response = await this.sendMessage({
      type: 'execute-action',
      tabId,
      action: {
        id: action.id,
        type: action.type,
        selector: action.selector,
        value: action.value,
        script: action.script,
        duration: action.duration,
      },
    });

    return response.result;
  }

  // ============================================================================
  // RESPONSE WAITING
  // ============================================================================

  async waitForResponse(
    tabId: number,
    provider: string,
    config: DetectionConfig
  ): Promise<{ content: string | null; detected: boolean; duration: number }> {
    const providerConfig = PROVIDER_CONFIGS[provider];

    const response = await this.sendMessage(
      {
        type: 'wait-for-response',
        tabId,
        config: {
          streamingSelector: providerConfig?.streamingIndicator,
          loadingSelector: providerConfig?.loadingIndicator,
          contentSelector: providerConfig?.responseContainer,
          timeout: config.timeout || 60000,
          pollInterval: config.pollInterval || 500,
          stableFor: config.stableFor || 2000,
        },
      },
      config.timeout || 60000
    );

    return {
      content: response.content || null,
      detected: response.detected,
      duration: response.duration || 0,
    };
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  async sendPrompt(
    tabId: number,
    provider: string,
    prompt: string,
    waitForResponse = true
  ): Promise<{ sent: boolean; response?: string }> {
    // Inject the prompt
    const providerConfig = PROVIDER_CONFIGS[provider];

    await this.sendMessage({
      type: 'inject-data',
      tabId,
      config: {
        targets: [{
          id: 'prompt-input',
          method: 'type',
          selector: this.getPromptSelector(provider),
          delay: 30,
          clearFirst: true,
        }],
        submitAction: {
          id: 'send',
          type: 'click',
          selector: this.getSendButtonSelector(provider),
        },
      },
      data: { 'prompt-input': prompt },
    });

    if (!waitForResponse) {
      return { sent: true };
    }

    // Wait for response
    const result = await this.waitForResponse(tabId, provider, {
      method: 'content-stable',
      timeout: 120000,
      stableFor: 2000,
    });

    return {
      sent: true,
      response: result.content || undefined,
    };
  }

  private getPromptSelector(provider: string): string {
    switch (provider) {
      case 'chatgpt':
        return '#prompt-textarea';
      case 'claude':
        return '[contenteditable="true"]';
      case 'gemini':
        return 'rich-textarea';
      default:
        return 'textarea, [contenteditable="true"]';
    }
  }

  private getSendButtonSelector(provider: string): string {
    switch (provider) {
      case 'chatgpt':
        return '[data-testid="send-button"]';
      case 'claude':
        return 'button[aria-label="Send Message"]';
      case 'gemini':
        return 'button.send-button';
      default:
        return 'button[type="submit"]';
    }
  }
}

// Singleton instance
export const extensionBridge = new ExtensionBridge();

// ============================================================================
// MOCK BRIDGE FOR DEVELOPMENT
// ============================================================================

export class MockExtensionBridge extends ExtensionBridge {
  private mockTabs: Map<number, TabInfo> = new Map();
  private nextTabId = 1;

  async connect(): Promise<boolean> {
    console.log('[Mock Bridge] Connected');
    return true;
  }

  isConnected(): boolean {
    return true;
  }

  async registerTab(url: string, provider: string): Promise<number> {
    const tabId = this.nextTabId++;
    this.mockTabs.set(tabId, {
      id: tabId,
      url,
      provider,
      status: 'ready',
    });
    console.log(`[Mock Bridge] Registered tab ${tabId}: ${provider} at ${url}`);
    return tabId;
  }

  async extractData(tabId: number, config: ExtractionConfig): Promise<Record<string, any>> {
    console.log(`[Mock Bridge] Extracting from tab ${tabId}:`, config);

    // Return mock data
    const results: Record<string, any> = {};
    for (const rule of config.rules) {
      results[rule.id] = `Mock extracted content for ${rule.name}`;
    }

    return results;
  }

  async injectData(tabId: number, config: InputConfig, data: Record<string, any>): Promise<boolean> {
    console.log(`[Mock Bridge] Injecting into tab ${tabId}:`, data);
    return true;
  }

  async executeAction(tabId: number, action: TabAction): Promise<any> {
    console.log(`[Mock Bridge] Executing action on tab ${tabId}:`, action);
    return { success: true };
  }

  async waitForResponse(
    tabId: number,
    provider: string,
    config: DetectionConfig
  ): Promise<{ content: string | null; detected: boolean; duration: number }> {
    console.log(`[Mock Bridge] Waiting for response on tab ${tabId}`);

    // Simulate wait
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      content: `Mock response from ${provider} (tab ${tabId})`,
      detected: true,
      duration: 2000,
    };
  }

  getRegisteredTabs(): TabInfo[] {
    return Array.from(this.mockTabs.values());
  }
}

// Use mock bridge in development if extension not available
export function createBridge(): ExtensionBridge {
  if (typeof window !== 'undefined' && typeof chrome !== 'undefined' && chrome.runtime) {
    return extensionBridge;
  }
  console.log('Using mock extension bridge for development');
  return new MockExtensionBridge();
}
