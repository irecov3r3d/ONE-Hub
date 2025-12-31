// ONE-Hub AI Automation Bridge - Background Service Worker
// Handles communication between ONE-Hub app and browser tabs

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  connectedPorts: new Map(), // tabId -> port
  appPort: null, // Connection to ONE-Hub app
  registeredTabs: new Map(), // tabId -> { url, provider, status }
  pendingRequests: new Map(), // requestId -> { resolve, reject, timeout }
  wsConnection: null,
  wsReconnectAttempts: 0,
  maxReconnectAttempts: 5,
};

// ============================================================================
// MESSAGE TYPES
// ============================================================================

const MessageTypes = {
  // From App
  REGISTER_TAB: 'register-tab',
  EXTRACT_DATA: 'extract-data',
  INJECT_DATA: 'inject-data',
  EXECUTE_ACTION: 'execute-action',
  CHECK_STATUS: 'check-status',
  WAIT_FOR_RESPONSE: 'wait-for-response',

  // To App
  TAB_REGISTERED: 'tab-registered',
  EXTRACTION_RESULT: 'extraction-result',
  INJECTION_RESULT: 'injection-result',
  ACTION_RESULT: 'action-result',
  STATUS_UPDATE: 'status-update',
  RESPONSE_DETECTED: 'response-detected',
  ERROR: 'error',

  // Internal
  CONTENT_READY: 'content-ready',
  PING: 'ping',
  PONG: 'pong',
};

// ============================================================================
// WEBSOCKET CONNECTION TO ONE-HUB
// ============================================================================

function connectToApp(url = 'ws://localhost:3001/automation') {
  if (state.wsConnection && state.wsConnection.readyState === WebSocket.OPEN) {
    return;
  }

  try {
    state.wsConnection = new WebSocket(url);

    state.wsConnection.onopen = () => {
      console.log('[ONE-Hub Bridge] Connected to app');
      state.wsReconnectAttempts = 0;

      // Send all registered tabs
      state.registeredTabs.forEach((info, tabId) => {
        sendToApp({
          type: MessageTypes.TAB_REGISTERED,
          tabId,
          ...info,
        });
      });
    };

    state.wsConnection.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        await handleAppMessage(message);
      } catch (error) {
        console.error('[ONE-Hub Bridge] Error handling message:', error);
      }
    };

    state.wsConnection.onclose = () => {
      console.log('[ONE-Hub Bridge] Disconnected from app');
      state.wsConnection = null;

      // Attempt reconnection
      if (state.wsReconnectAttempts < state.maxReconnectAttempts) {
        state.wsReconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, state.wsReconnectAttempts), 30000);
        setTimeout(() => connectToApp(url), delay);
      }
    };

    state.wsConnection.onerror = (error) => {
      console.error('[ONE-Hub Bridge] WebSocket error:', error);
    };
  } catch (error) {
    console.error('[ONE-Hub Bridge] Failed to connect:', error);
  }
}

function sendToApp(message) {
  if (state.wsConnection && state.wsConnection.readyState === WebSocket.OPEN) {
    state.wsConnection.send(JSON.stringify(message));
  }
}

// ============================================================================
// EXTERNAL MESSAGE HANDLING (from web page)
// ============================================================================

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  handleExternalMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true; // Keep channel open for async response
});

async function handleExternalMessage(message, sender) {
  console.log('[ONE-Hub Bridge] External message:', message.type);

  switch (message.type) {
    case 'connect':
      connectToApp(message.wsUrl);
      return { success: true };

    case 'disconnect':
      if (state.wsConnection) {
        state.wsConnection.close();
      }
      return { success: true };

    case 'get-tabs':
      return {
        success: true,
        tabs: Array.from(state.registeredTabs.entries()).map(([id, info]) => ({
          id,
          ...info,
        })),
      };

    default:
      return handleAppMessage(message);
  }
}

// ============================================================================
// APP MESSAGE HANDLING
// ============================================================================

async function handleAppMessage(message) {
  const { requestId, type, tabId } = message;

  try {
    let result;

    switch (type) {
      case MessageTypes.REGISTER_TAB:
        result = await registerTab(message.url, message.provider);
        break;

      case MessageTypes.EXTRACT_DATA:
        result = await extractFromTab(tabId, message.config);
        break;

      case MessageTypes.INJECT_DATA:
        result = await injectIntoTab(tabId, message.config, message.data);
        break;

      case MessageTypes.EXECUTE_ACTION:
        result = await executeAction(tabId, message.action);
        break;

      case MessageTypes.CHECK_STATUS:
        result = await checkTabStatus(tabId);
        break;

      case MessageTypes.WAIT_FOR_RESPONSE:
        result = await waitForResponse(tabId, message.config);
        break;

      case MessageTypes.PING:
        result = { type: MessageTypes.PONG };
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    if (requestId) {
      sendToApp({ requestId, success: true, ...result });
    }

    return { success: true, ...result };
  } catch (error) {
    console.error('[ONE-Hub Bridge] Error:', error);

    if (requestId) {
      sendToApp({ requestId, success: false, error: error.message });
    }

    return { success: false, error: error.message };
  }
}

// ============================================================================
// TAB MANAGEMENT
// ============================================================================

async function registerTab(url, provider) {
  // Find or create tab
  let tabs = await chrome.tabs.query({ url: `${url}*` });

  let tab;
  if (tabs.length > 0) {
    tab = tabs[0];
  } else {
    tab = await chrome.tabs.create({ url, active: false });
    // Wait for tab to load
    await waitForTabLoad(tab.id);
  }

  state.registeredTabs.set(tab.id, {
    url,
    provider,
    status: 'ready',
    registeredAt: Date.now(),
  });

  sendToApp({
    type: MessageTypes.TAB_REGISTERED,
    tabId: tab.id,
    url,
    provider,
  });

  return { tabId: tab.id };
}

async function waitForTabLoad(tabId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkTab = async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
          resolve();
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error('Tab load timeout'));
        return;
      }

      setTimeout(checkTab, 500);
    };

    checkTab();
  });
}

async function checkTabStatus(tabId) {
  const info = state.registeredTabs.get(tabId);
  if (!info) {
    throw new Error(`Tab ${tabId} not registered`);
  }

  try {
    const tab = await chrome.tabs.get(tabId);
    return {
      tabId,
      url: tab.url,
      status: tab.status,
      provider: info.provider,
      ready: tab.status === 'complete',
    };
  } catch (error) {
    state.registeredTabs.delete(tabId);
    throw new Error(`Tab ${tabId} no longer exists`);
  }
}

// ============================================================================
// CONTENT SCRIPT COMMUNICATION
// ============================================================================

async function sendToContentScript(tabId, message, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const timeoutId = setTimeout(() => {
      state.pendingRequests.delete(requestId);
      reject(new Error('Content script timeout'));
    }, timeout);

    state.pendingRequests.set(requestId, {
      resolve: (result) => {
        clearTimeout(timeoutId);
        state.pendingRequests.delete(requestId);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        state.pendingRequests.delete(requestId);
        reject(error);
      },
    });

    chrome.tabs.sendMessage(tabId, { ...message, requestId }, (response) => {
      if (chrome.runtime.lastError) {
        const pending = state.pendingRequests.get(requestId);
        if (pending) {
          pending.reject(new Error(chrome.runtime.lastError.message));
        }
        return;
      }

      const pending = state.pendingRequests.get(requestId);
      if (pending) {
        if (response?.success) {
          pending.resolve(response);
        } else {
          pending.reject(new Error(response?.error || 'Unknown error'));
        }
      }
    });
  });
}

// ============================================================================
// EXTRACTION
// ============================================================================

async function extractFromTab(tabId, config) {
  // Ensure tab is ready
  await ensureTabReady(tabId);

  // Send extraction request to content script
  const result = await sendToContentScript(tabId, {
    type: 'extract',
    config,
  });

  return {
    type: MessageTypes.EXTRACTION_RESULT,
    tabId,
    data: result.data,
    timestamp: Date.now(),
  };
}

// ============================================================================
// INJECTION
// ============================================================================

async function injectIntoTab(tabId, config, data) {
  // Ensure tab is ready
  await ensureTabReady(tabId);

  // Focus tab if needed
  if (config.focusTab) {
    await chrome.tabs.update(tabId, { active: true });
  }

  // Send injection request to content script
  const result = await sendToContentScript(tabId, {
    type: 'inject',
    config,
    data,
  });

  return {
    type: MessageTypes.INJECTION_RESULT,
    tabId,
    success: result.success,
    timestamp: Date.now(),
  };
}

// ============================================================================
// ACTION EXECUTION
// ============================================================================

async function executeAction(tabId, action) {
  await ensureTabReady(tabId);

  if (action.focusTab) {
    await chrome.tabs.update(tabId, { active: true });
  }

  const result = await sendToContentScript(tabId, {
    type: 'action',
    action,
  });

  return {
    type: MessageTypes.ACTION_RESULT,
    tabId,
    result: result.data,
    timestamp: Date.now(),
  };
}

// ============================================================================
// RESPONSE WAITING
// ============================================================================

async function waitForResponse(tabId, config) {
  await ensureTabReady(tabId);

  const result = await sendToContentScript(
    tabId,
    {
      type: 'wait-for-response',
      config,
    },
    config.timeout || 60000
  );

  return {
    type: MessageTypes.RESPONSE_DETECTED,
    tabId,
    content: result.content,
    detected: result.detected,
    timestamp: Date.now(),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

async function ensureTabReady(tabId) {
  const info = state.registeredTabs.get(tabId);
  if (!info) {
    throw new Error(`Tab ${tabId} not registered`);
  }

  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status !== 'complete') {
      await waitForTabLoad(tabId);
    }
  } catch (error) {
    state.registeredTabs.delete(tabId);
    throw new Error(`Tab ${tabId} no longer exists`);
  }
}

// ============================================================================
// MESSAGE LISTENER FROM CONTENT SCRIPTS
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.tab) {
    // Message from content script
    handleContentScriptMessage(message, sender.tab.id)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleContentScriptMessage(message, tabId) {
  switch (message.type) {
    case MessageTypes.CONTENT_READY:
      // Content script is ready
      const info = state.registeredTabs.get(tabId);
      if (info) {
        info.status = 'ready';
        sendToApp({
          type: MessageTypes.STATUS_UPDATE,
          tabId,
          status: 'ready',
        });
      }
      return { success: true };

    case MessageTypes.STATUS_UPDATE:
      sendToApp({
        type: MessageTypes.STATUS_UPDATE,
        tabId,
        ...message,
      });
      return { success: true };

    default:
      return { success: true };
  }
}

// ============================================================================
// TAB EVENTS
// ============================================================================

chrome.tabs.onRemoved.addListener((tabId) => {
  if (state.registeredTabs.has(tabId)) {
    state.registeredTabs.delete(tabId);
    sendToApp({
      type: MessageTypes.STATUS_UPDATE,
      tabId,
      status: 'closed',
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (state.registeredTabs.has(tabId)) {
    if (changeInfo.status === 'loading') {
      sendToApp({
        type: MessageTypes.STATUS_UPDATE,
        tabId,
        status: 'loading',
      });
    } else if (changeInfo.status === 'complete') {
      sendToApp({
        type: MessageTypes.STATUS_UPDATE,
        tabId,
        status: 'ready',
        url: tab.url,
      });
    }
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('[ONE-Hub Bridge] Background service worker started');

// Try to connect on startup
connectToApp();

// Keep service worker alive
setInterval(() => {
  // Periodic ping to keep alive
}, 25000);
