// ONE-Hub AI Automation Bridge - Gemini Content Script
// Specific handlers for Google Gemini (gemini.google.com)

(function () {
  'use strict';

  if (window.__oneHubGeminiLoaded) return;
  window.__oneHubGeminiLoaded = true;

  console.log('[ONE-Hub Bridge] Gemini content script loaded');

  const SELECTORS = {
    promptInput: 'rich-textarea',
    promptInputAlt: '[aria-label="Enter a prompt here"]',
    sendButton: 'button.send-button',
    sendButtonAlt: '[aria-label="Send message"]',
    responseContainer: 'model-response',
    lastResponse: 'model-response:last-child .response-content',
    streamingIndicator: '.loading-indicator',
    newChatButton: 'button[aria-label="New chat"]',
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  });

  async function handleMessage(message) {
    switch (message.type) {
      case 'extract':
        return extractData(message.config);
      case 'inject':
        return injectData(message.config, message.data);
      case 'action':
        return executeAction(message.action);
      case 'wait-for-response':
        return waitForResponse(message.config);
      default:
        return null;
    }
  }

  function extractData(config) {
    const results = {};
    for (const rule of config.rules || []) {
      if (rule.id === 'last-response') {
        const response = document.querySelector(SELECTORS.lastResponse);
        results[rule.id] = response?.textContent?.trim() || null;
      }
    }
    return { success: true, data: results };
  }

  async function injectData(config, data) {
    for (const target of config.targets || []) {
      const value = data[target.id];
      if (!value) continue;

      const input = document.querySelector(SELECTORS.promptInput) ||
                    document.querySelector(SELECTORS.promptInputAlt);
      if (input) {
        input.focus();
        input.textContent = value;
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }
    }
    return { success: true };
  }

  async function executeAction(action) {
    switch (action.id) {
      case 'send':
        const button = document.querySelector(SELECTORS.sendButton) ||
                       document.querySelector(SELECTORS.sendButtonAlt);
        button?.click();
        return { success: true };
      case 'new-chat':
        document.querySelector(SELECTORS.newChatButton)?.click();
        return { success: true };
      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  async function waitForResponse(config) {
    const timeout = config.timeout || 60000;
    const startTime = Date.now();
    let lastContent = '';
    let stableTime = 0;

    while (Date.now() - startTime < timeout) {
      const loading = document.querySelector(SELECTORS.streamingIndicator);
      if (!loading) {
        const response = document.querySelector(SELECTORS.lastResponse);
        const content = response?.textContent?.trim() || '';

        if (content === lastContent && content.length > 0) {
          stableTime += 500;
          if (stableTime >= 2000) {
            return { success: true, detected: true, content };
          }
        } else {
          lastContent = content;
          stableTime = 0;
        }
      }
      await new Promise(r => setTimeout(r, 500));
    }

    return { success: true, detected: false, timedOut: true };
  }

  chrome.runtime.sendMessage({ type: 'content-ready', provider: 'gemini' });
})();
