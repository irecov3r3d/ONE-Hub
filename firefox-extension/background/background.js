/**
 * Teach & Repeat - Background Script
 * Manages macro recordings, storage, and cross-tab coordination
 */

// State management
const state = {
  isRecording: false,
  isPlaying: false,
  currentRecording: null,
  currentMacroId: null,
  recordingTabId: null,
  activePlaybackTabs: new Set(),
  pendingResponses: new Map()
};

// AI Chat configurations
const AI_CHATS = {
  claude: {
    name: 'Claude',
    urlPattern: '*://claude.ai/*',
    inputSelector: 'div[contenteditable="true"], textarea[placeholder*="message"]',
    sendSelector: 'button[aria-label*="Send"], button[type="submit"]',
    responseSelector: '.font-claude-message, [data-message-author-role="assistant"]'
  },
  chatgpt: {
    name: 'ChatGPT',
    urlPattern: '*://chat.openai.com/*',
    inputSelector: 'textarea[data-id], #prompt-textarea',
    sendSelector: 'button[data-testid="send-button"], button[aria-label="Send"]',
    responseSelector: '[data-message-author-role="assistant"]'
  },
  codex: {
    name: 'Codex/GitHub Copilot',
    urlPattern: '*://github.com/*copilot*',
    inputSelector: 'textarea, input[type="text"]',
    sendSelector: 'button[type="submit"]',
    responseSelector: '.copilot-response, .markdown-body'
  }
};

// Initialize extension
browser.runtime.onInstalled.addListener(() => {
  console.log('Teach & Repeat extension installed');
  initializeStorage();
});

// Initialize storage with defaults
async function initializeStorage() {
  const existing = await browser.storage.local.get(['macros', 'settings']);

  if (!existing.macros) {
    await browser.storage.local.set({ macros: {} });
  }

  if (!existing.settings) {
    await browser.storage.local.set({
      settings: {
        playbackSpeed: 1.0,
        captureMouseMove: false,
        captureScroll: true,
        captureClipboard: true,
        highlightElements: true,
        defaultDelay: 100,
        aiChats: ['claude', 'chatgpt']
      }
    });
  }
}

// Message handler from content scripts and popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received:', message.type, message);

  switch (message.type) {
    case 'START_RECORDING':
      return handleStartRecording(message, sender);

    case 'STOP_RECORDING':
      return handleStopRecording(message, sender);

    case 'RECORD_EVENT':
      return handleRecordEvent(message, sender);

    case 'PLAY_MACRO':
      return handlePlayMacro(message, sender);

    case 'STOP_PLAYBACK':
      return handleStopPlayback(message, sender);

    case 'GET_STATE':
      sendResponse({ ...state, macros: undefined });
      return false;

    case 'GET_MACROS':
      return handleGetMacros(sendResponse);

    case 'SAVE_MACRO':
      return handleSaveMacro(message, sendResponse);

    case 'DELETE_MACRO':
      return handleDeleteMacro(message, sendResponse);

    case 'SEND_TO_AI_CHATS':
      return handleSendToAiChats(message, sender);

    case 'AI_RESPONSE_RECEIVED':
      return handleAiResponse(message, sender);

    case 'GET_AI_CONFIGS':
      sendResponse(AI_CHATS);
      return false;

    default:
      console.warn('Unknown message type:', message.type);
      return false;
  }
});

// Start recording
async function handleStartRecording(message, sender) {
  state.isRecording = true;
  state.recordingTabId = sender.tab?.id || message.tabId;
  state.currentRecording = {
    id: generateId(),
    name: message.name || 'Untitled Recording',
    createdAt: Date.now(),
    events: [],
    metadata: {
      url: sender.tab?.url || message.url,
      title: sender.tab?.title || document.title
    }
  };

  // Notify all tabs that recording has started
  broadcastToAllTabs({ type: 'RECORDING_STARTED' });

  // Update badge
  browser.browserAction.setBadgeText({ text: 'REC' });
  browser.browserAction.setBadgeBackgroundColor({ color: '#ff0000' });

  return Promise.resolve({ success: true, recordingId: state.currentRecording.id });
}

// Stop recording
async function handleStopRecording(message, sender) {
  if (!state.isRecording || !state.currentRecording) {
    return Promise.resolve({ success: false, error: 'No active recording' });
  }

  state.isRecording = false;
  const recording = { ...state.currentRecording };
  recording.duration = Date.now() - recording.createdAt;

  // Save to storage
  const { macros } = await browser.storage.local.get('macros');
  macros[recording.id] = recording;
  await browser.storage.local.set({ macros });

  state.currentRecording = null;
  state.recordingTabId = null;

  // Notify all tabs
  broadcastToAllTabs({ type: 'RECORDING_STOPPED' });

  // Clear badge
  browser.browserAction.setBadgeText({ text: '' });

  return Promise.resolve({ success: true, macro: recording });
}

// Record an event
function handleRecordEvent(message, sender) {
  if (!state.isRecording || !state.currentRecording) {
    return Promise.resolve({ success: false });
  }

  const event = {
    ...message.event,
    timestamp: Date.now() - state.currentRecording.createdAt,
    tabId: sender.tab?.id,
    frameId: sender.frameId
  };

  state.currentRecording.events.push(event);

  return Promise.resolve({ success: true, eventCount: state.currentRecording.events.length });
}

// Play a macro
async function handlePlayMacro(message, sender) {
  const { macros } = await browser.storage.local.get('macros');
  const macro = macros[message.macroId];

  if (!macro) {
    return Promise.resolve({ success: false, error: 'Macro not found' });
  }

  state.isPlaying = true;
  state.currentMacroId = message.macroId;

  // Update badge
  browser.browserAction.setBadgeText({ text: 'PLAY' });
  browser.browserAction.setBadgeBackgroundColor({ color: '#00ff00' });

  // Get target tabs
  const targetTabIds = message.tabIds || [sender.tab?.id];
  state.activePlaybackTabs = new Set(targetTabIds);

  // Send macro to each tab for playback
  for (const tabId of targetTabIds) {
    try {
      await browser.tabs.sendMessage(tabId, {
        type: 'EXECUTE_MACRO',
        macro: macro,
        options: message.options || {}
      });
    } catch (err) {
      console.error(`Failed to send macro to tab ${tabId}:`, err);
    }
  }

  return Promise.resolve({ success: true });
}

// Stop playback
function handleStopPlayback(message, sender) {
  state.isPlaying = false;
  state.currentMacroId = null;
  state.activePlaybackTabs.clear();

  // Clear badge
  browser.browserAction.setBadgeText({ text: '' });

  // Notify all tabs
  broadcastToAllTabs({ type: 'PLAYBACK_STOPPED' });

  return Promise.resolve({ success: true });
}

// Get all macros
async function handleGetMacros(sendResponse) {
  const { macros } = await browser.storage.local.get('macros');
  sendResponse({ success: true, macros: macros || {} });
  return true;
}

// Save/update a macro
async function handleSaveMacro(message, sendResponse) {
  const { macros } = await browser.storage.local.get('macros');
  macros[message.macro.id] = message.macro;
  await browser.storage.local.set({ macros });
  sendResponse({ success: true });
  return true;
}

// Delete a macro
async function handleDeleteMacro(message, sendResponse) {
  const { macros } = await browser.storage.local.get('macros');
  delete macros[message.macroId];
  await browser.storage.local.set({ macros });
  sendResponse({ success: true });
  return true;
}

// Send message to multiple AI chats simultaneously
async function handleSendToAiChats(message, sender) {
  const { settings } = await browser.storage.local.get('settings');
  const targetChats = message.targets || settings.aiChats;
  const prompt = message.prompt;

  if (!prompt) {
    return Promise.resolve({ success: false, error: 'No prompt provided' });
  }

  // Create a session ID for tracking responses
  const sessionId = generateId();
  state.pendingResponses.set(sessionId, {
    prompt,
    targets: targetChats,
    responses: {},
    startTime: Date.now()
  });

  // Find or create tabs for each AI chat
  const tabs = await browser.tabs.query({});
  const results = {};

  for (const chatKey of targetChats) {
    const chatConfig = AI_CHATS[chatKey];
    if (!chatConfig) continue;

    // Find existing tab or create new one
    let targetTab = tabs.find(tab => {
      const pattern = chatConfig.urlPattern.replace(/\*/g, '.*');
      return new RegExp(pattern).test(tab.url);
    });

    if (!targetTab) {
      // Create new tab for this AI chat
      const url = getAiChatUrl(chatKey);
      targetTab = await browser.tabs.create({ url, active: false });
      // Wait for tab to load
      await waitForTabLoad(targetTab.id);
    }

    // Send the prompt to this tab
    try {
      await browser.tabs.sendMessage(targetTab.id, {
        type: 'SEND_AI_PROMPT',
        sessionId,
        chatKey,
        prompt,
        config: chatConfig
      });
      results[chatKey] = { status: 'sent', tabId: targetTab.id };
    } catch (err) {
      results[chatKey] = { status: 'error', error: err.message };
    }
  }

  return Promise.resolve({ success: true, sessionId, results });
}

// Handle AI response
function handleAiResponse(message, sender) {
  const session = state.pendingResponses.get(message.sessionId);
  if (!session) {
    return Promise.resolve({ success: false, error: 'Session not found' });
  }

  session.responses[message.chatKey] = {
    response: message.response,
    receivedAt: Date.now()
  };

  // Check if all responses received
  const allReceived = session.targets.every(key => session.responses[key]);

  if (allReceived) {
    // Notify popup that all responses are ready
    browser.runtime.sendMessage({
      type: 'ALL_AI_RESPONSES_READY',
      sessionId: message.sessionId,
      responses: session.responses
    }).catch(() => {});
  }

  return Promise.resolve({ success: true, allReceived });
}

// Helper: Get AI chat URL
function getAiChatUrl(chatKey) {
  const urls = {
    claude: 'https://claude.ai/new',
    chatgpt: 'https://chat.openai.com/',
    codex: 'https://github.com/features/copilot'
  };
  return urls[chatKey] || '';
}

// Helper: Wait for tab to fully load
function waitForTabLoad(tabId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkTab = async () => {
      try {
        const tab = await browser.tabs.get(tabId);
        if (tab.status === 'complete') {
          // Additional delay for JS to initialize
          setTimeout(resolve, 1000);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Tab load timeout'));
        } else {
          setTimeout(checkTab, 100);
        }
      } catch (err) {
        reject(err);
      }
    };

    checkTab();
  });
}

// Helper: Broadcast message to all tabs
async function broadcastToAllTabs(message) {
  const tabs = await browser.tabs.query({});
  for (const tab of tabs) {
    try {
      await browser.tabs.sendMessage(tab.id, message);
    } catch (err) {
      // Tab might not have content script loaded
    }
  }
}

// Helper: Generate unique ID
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Handle tab removal - clean up state
browser.tabs.onRemoved.addListener((tabId) => {
  if (state.recordingTabId === tabId) {
    handleStopRecording({}, {});
  }
  state.activePlaybackTabs.delete(tabId);
});

// Keyboard shortcut commands
browser.commands?.onCommand?.addListener((command) => {
  switch (command) {
    case 'toggle-recording':
      if (state.isRecording) {
        handleStopRecording({}, {});
      } else {
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
          if (tabs[0]) {
            handleStartRecording({ tabId: tabs[0].id, url: tabs[0].url }, { tab: tabs[0] });
          }
        });
      }
      break;

    case 'stop-playback':
      if (state.isPlaying) {
        handleStopPlayback({}, {});
      }
      break;
  }
});

console.log('Teach & Repeat background script loaded');
