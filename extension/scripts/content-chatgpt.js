// ONE-Hub AI Automation Bridge - ChatGPT Content Script
// Specific handlers for ChatGPT (chat.openai.com / chatgpt.com)

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__oneHubChatGPTLoaded) return;
  window.__oneHubChatGPTLoaded = true;

  console.log('[ONE-Hub Bridge] ChatGPT content script loaded');

  // ============================================================================
  // CHATGPT-SPECIFIC SELECTORS
  // ============================================================================

  const SELECTORS = {
    // Input
    promptInput: '#prompt-textarea',
    promptInputAlt: 'textarea[data-id="root"]',
    sendButton: '[data-testid="send-button"]',
    sendButtonAlt: 'button[data-testid="fruitjuice-send-button"]',

    // Output
    responseContainer: '[data-message-author-role="assistant"]',
    lastResponse: '[data-message-author-role="assistant"]:last-child',
    markdownContent: '.markdown',
    codeBlocks: 'pre code',
    copyCodeButton: '[data-testid="copy-code-button"]',

    // Status
    streamingIndicator: '.result-streaming',
    loadingSpinner: '.text-token-text-secondary .animate-spin',
    stopButton: '[data-testid="stop-button"]',
    regenerateButton: '[data-testid="regenerate-button"]',

    // Navigation
    newChatButton: '[data-testid="create-new-chat-button"]',
    chatList: 'nav[aria-label="Chat history"]',
    modelSelector: '[data-testid="model-switcher"]',
  };

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleChatGPTMessage(message)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  });

  async function handleChatGPTMessage(message) {
    switch (message.type) {
      case 'extract':
        return await handleExtract(message.config);

      case 'inject':
        return await handleInject(message.config, message.data);

      case 'action':
        return await handleAction(message.action);

      case 'wait-for-response':
        return await waitForChatGPTResponse(message.config);

      case 'send-prompt':
        return await sendPrompt(message.prompt, message.waitForResponse);

      case 'get-conversation':
        return getConversation();

      default:
        // Fall through to generic handler
        return null;
    }
  }

  // ============================================================================
  // EXTRACTION
  // ============================================================================

  async function handleExtract(config) {
    const results = {};

    for (const rule of config.rules || []) {
      switch (rule.id) {
        case 'last-response':
        case 'response-text':
          results[rule.id] = getLastResponse();
          break;

        case 'all-responses':
          results[rule.id] = getAllResponses();
          break;

        case 'code-blocks':
          results[rule.id] = getCodeBlocks();
          break;

        case 'conversation':
          results[rule.id] = getConversation();
          break;

        default:
          // Use generic selector extraction
          if (rule.selector) {
            const element = document.querySelector(rule.selector);
            results[rule.id] = element ? element.textContent?.trim() : null;
          }
      }
    }

    return { success: true, data: results };
  }

  function getLastResponse() {
    const responses = document.querySelectorAll(SELECTORS.responseContainer);
    if (responses.length === 0) return null;

    const lastResponse = responses[responses.length - 1];
    const markdown = lastResponse.querySelector(SELECTORS.markdownContent);
    return markdown ? markdown.textContent?.trim() : lastResponse.textContent?.trim();
  }

  function getAllResponses() {
    const responses = document.querySelectorAll(SELECTORS.responseContainer);
    return Array.from(responses).map((el) => {
      const markdown = el.querySelector(SELECTORS.markdownContent);
      return markdown ? markdown.textContent?.trim() : el.textContent?.trim();
    });
  }

  function getCodeBlocks() {
    const codeElements = document.querySelectorAll(
      `${SELECTORS.lastResponse} ${SELECTORS.codeBlocks}`
    );
    return Array.from(codeElements).map((el) => ({
      language: el.className.replace('language-', ''),
      code: el.textContent?.trim(),
    }));
  }

  function getConversation() {
    const messages = [];

    // Get user messages
    const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
    const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');

    userMessages.forEach((el, i) => {
      messages.push({
        role: 'user',
        content: el.textContent?.trim(),
        index: i * 2,
      });
    });

    assistantMessages.forEach((el, i) => {
      const markdown = el.querySelector(SELECTORS.markdownContent);
      messages.push({
        role: 'assistant',
        content: markdown ? markdown.textContent?.trim() : el.textContent?.trim(),
        index: i * 2 + 1,
      });
    });

    return messages.sort((a, b) => a.index - b.index);
  }

  // ============================================================================
  // INJECTION
  // ============================================================================

  async function handleInject(config, data) {
    for (const target of config.targets || []) {
      const value = data[target.id] || data[target.name];
      if (value === undefined) continue;

      switch (target.id) {
        case 'prompt-input':
          await injectPrompt(value, target);
          break;

        default:
          // Use generic injection
          const element = document.querySelector(target.selector || SELECTORS.promptInput);
          if (element) {
            await typeIntoElement(element, value, target.delay || 30);
          }
      }
    }

    return { success: true };
  }

  async function injectPrompt(text, options = {}) {
    const input = document.querySelector(SELECTORS.promptInput) ||
                  document.querySelector(SELECTORS.promptInputAlt);

    if (!input) {
      throw new Error('Prompt input not found');
    }

    // Focus and clear
    input.focus();
    if (options.clearFirst !== false) {
      input.textContent = '';
      // For contenteditable
      if (input.isContentEditable) {
        input.innerHTML = '<p></p>';
      }
    }

    // Type the text
    if (options.delay && options.delay > 0) {
      await typeIntoElement(input, text, options.delay);
    } else {
      // Fast paste-like injection
      if (input.isContentEditable) {
        input.innerHTML = `<p>${escapeHtml(text)}</p>`;
      } else {
        input.value = text;
      }
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }

    return { success: true };
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  async function handleAction(action) {
    switch (action.id || action.type) {
      case 'send':
      case 'submit':
        return await clickSendButton();

      case 'new-chat':
        return await startNewChat();

      case 'stop':
        return await stopGeneration();

      case 'regenerate':
        return await regenerate();

      case 'copy-code':
        return await copyCodeBlock(action.index || 0);

      default:
        // Generic click
        if (action.selector) {
          const element = document.querySelector(action.selector);
          if (element) {
            element.click();
            return { success: true };
          }
        }
        throw new Error(`Unknown action: ${action.id || action.type}`);
    }
  }

  async function clickSendButton() {
    const button = document.querySelector(SELECTORS.sendButton) ||
                   document.querySelector(SELECTORS.sendButtonAlt);

    if (!button) {
      throw new Error('Send button not found');
    }

    // Wait for button to be enabled
    let attempts = 0;
    while (button.disabled && attempts < 50) {
      await delay(100);
      attempts++;
    }

    button.click();
    return { success: true };
  }

  async function startNewChat() {
    const button = document.querySelector(SELECTORS.newChatButton);
    if (!button) {
      throw new Error('New chat button not found');
    }
    button.click();
    await delay(500);
    return { success: true };
  }

  async function stopGeneration() {
    const button = document.querySelector(SELECTORS.stopButton);
    if (button) {
      button.click();
      return { success: true };
    }
    return { success: false, error: 'Stop button not found' };
  }

  async function regenerate() {
    const button = document.querySelector(SELECTORS.regenerateButton);
    if (button) {
      button.click();
      return { success: true };
    }
    return { success: false, error: 'Regenerate button not found' };
  }

  async function copyCodeBlock(index = 0) {
    const buttons = document.querySelectorAll(
      `${SELECTORS.lastResponse} ${SELECTORS.copyCodeButton}`
    );
    if (buttons[index]) {
      buttons[index].click();
      return { success: true };
    }
    return { success: false, error: 'Copy button not found' };
  }

  // ============================================================================
  // SEND PROMPT (convenience method)
  // ============================================================================

  async function sendPrompt(prompt, waitForResponse = true) {
    // Inject prompt
    await injectPrompt(prompt);
    await delay(100);

    // Click send
    await clickSendButton();

    if (!waitForResponse) {
      return { success: true, sent: true };
    }

    // Wait for response
    const response = await waitForChatGPTResponse({
      timeout: 120000,
      stableFor: 2000,
    });

    return {
      success: true,
      sent: true,
      response: response.content,
    };
  }

  // ============================================================================
  // RESPONSE WAITING
  // ============================================================================

  async function waitForChatGPTResponse(config = {}) {
    const timeout = config.timeout || 60000;
    const pollInterval = config.pollInterval || 500;
    const stableFor = config.stableFor || 2000;

    const startTime = Date.now();
    let lastContent = '';
    let stableTime = 0;
    let responseStarted = false;

    // Wait for response to start
    while (Date.now() - startTime < timeout) {
      // Check if streaming/loading
      const streaming = document.querySelector(SELECTORS.streamingIndicator);
      const loading = document.querySelector(SELECTORS.loadingSpinner);
      const stopButton = document.querySelector(SELECTORS.stopButton);

      if (streaming || loading || stopButton) {
        responseStarted = true;
        stableTime = 0;
      } else if (responseStarted) {
        // Response finished streaming
        const content = getLastResponse();

        if (content === lastContent && content && content.length > 0) {
          stableTime += pollInterval;

          if (stableTime >= stableFor) {
            return {
              success: true,
              detected: true,
              content,
              duration: Date.now() - startTime,
            };
          }
        } else {
          lastContent = content || '';
          stableTime = 0;
        }
      }

      await delay(pollInterval);
    }

    // Timeout
    const finalContent = getLastResponse();
    return {
      success: true,
      detected: false,
      content: finalContent,
      timedOut: true,
      duration: Date.now() - startTime,
    };
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  async function typeIntoElement(element, text, charDelay = 30) {
    element.focus();

    for (const char of text) {
      if (element.isContentEditable) {
        document.execCommand('insertText', false, char);
      } else {
        element.value += char;
      }

      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char }));
      await delay(charDelay);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // MUTATION OBSERVER (for real-time updates)
  // ============================================================================

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Check for new response messages
      if (mutation.addedNodes.length > 0) {
        const hasNewResponse = Array.from(mutation.addedNodes).some((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            return node.querySelector?.(SELECTORS.responseContainer) ||
                   node.matches?.(SELECTORS.responseContainer);
          }
          return false;
        });

        if (hasNewResponse) {
          chrome.runtime.sendMessage({
            type: 'status-update',
            status: 'new-response',
            provider: 'chatgpt',
          });
        }
      }
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Notify that we're ready
  chrome.runtime.sendMessage({
    type: 'content-ready',
    provider: 'chatgpt',
    url: window.location.href,
  });
})();
