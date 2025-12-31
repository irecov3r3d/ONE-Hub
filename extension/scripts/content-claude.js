// ONE-Hub AI Automation Bridge - Claude Content Script
// Specific handlers for Claude (claude.ai)

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__oneHubClaudeLoaded) return;
  window.__oneHubClaudeLoaded = true;

  console.log('[ONE-Hub Bridge] Claude content script loaded');

  // ============================================================================
  // CLAUDE-SPECIFIC SELECTORS
  // ============================================================================

  const SELECTORS = {
    // Input
    promptInput: '[contenteditable="true"][data-placeholder]',
    promptInputAlt: '.ProseMirror',
    sendButton: 'button[aria-label="Send Message"]',
    sendButtonAlt: 'button[type="submit"]',

    // Output
    responseContainer: '[data-is-streaming]',
    lastResponse: '[data-is-streaming="false"]:last-of-type',
    proseContent: '.prose',
    codeBlocks: 'pre code',
    artifacts: '[data-artifact-id]',

    // Status
    streamingIndicator: '[data-is-streaming="true"]',
    loadingIndicator: '.animate-pulse',
    thinkingIndicator: '[class*="thinking"]',

    // Navigation
    newChatButton: '[data-testid="new-chat"]',
    sidebarToggle: 'button[aria-label="Toggle sidebar"]',
    modelSelector: '[data-testid="model-selector"]',
  };

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleClaudeMessage(message)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  });

  async function handleClaudeMessage(message) {
    switch (message.type) {
      case 'extract':
        return await handleExtract(message.config);

      case 'inject':
        return await handleInject(message.config, message.data);

      case 'action':
        return await handleAction(message.action);

      case 'wait-for-response':
        return await waitForClaudeResponse(message.config);

      case 'send-prompt':
        return await sendPrompt(message.prompt, message.waitForResponse);

      case 'get-artifacts':
        return getArtifacts();

      default:
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

        case 'artifacts':
          results[rule.id] = getArtifacts();
          break;

        case 'conversation':
          results[rule.id] = getConversation();
          break;

        default:
          if (rule.selector) {
            const element = document.querySelector(rule.selector);
            results[rule.id] = element ? element.textContent?.trim() : null;
          }
      }
    }

    return { success: true, data: results };
  }

  function getLastResponse() {
    // Find the last non-streaming response
    const responses = document.querySelectorAll('[data-is-streaming="false"]');
    if (responses.length === 0) {
      // Try alternative selectors
      const proseElements = document.querySelectorAll(SELECTORS.proseContent);
      if (proseElements.length > 0) {
        return proseElements[proseElements.length - 1].textContent?.trim();
      }
      return null;
    }

    const lastResponse = responses[responses.length - 1];
    const prose = lastResponse.querySelector(SELECTORS.proseContent);
    return prose ? prose.textContent?.trim() : lastResponse.textContent?.trim();
  }

  function getAllResponses() {
    const responses = document.querySelectorAll('[data-is-streaming="false"]');
    return Array.from(responses).map((el) => {
      const prose = el.querySelector(SELECTORS.proseContent);
      return prose ? prose.textContent?.trim() : el.textContent?.trim();
    });
  }

  function getCodeBlocks() {
    const lastResponse = document.querySelector(SELECTORS.lastResponse) ||
                         document.querySelector('[data-is-streaming="false"]:last-of-type');
    if (!lastResponse) return [];

    const codeElements = lastResponse.querySelectorAll(SELECTORS.codeBlocks);
    return Array.from(codeElements).map((el) => ({
      language: el.className.replace('language-', '').split(' ')[0],
      code: el.textContent?.trim(),
    }));
  }

  function getArtifacts() {
    const artifacts = document.querySelectorAll(SELECTORS.artifacts);
    return Array.from(artifacts).map((el) => ({
      id: el.getAttribute('data-artifact-id'),
      type: el.getAttribute('data-artifact-type'),
      content: el.textContent?.trim(),
    }));
  }

  function getConversation() {
    const messages = [];
    const messageElements = document.querySelectorAll('[data-message-role]');

    messageElements.forEach((el, index) => {
      const role = el.getAttribute('data-message-role') || 'unknown';
      const prose = el.querySelector(SELECTORS.proseContent);
      messages.push({
        role: role === 'human' ? 'user' : role,
        content: prose ? prose.textContent?.trim() : el.textContent?.trim(),
        index,
      });
    });

    return messages;
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

    // Focus
    input.focus();

    // Clear if needed
    if (options.clearFirst !== false) {
      // Select all and delete for contenteditable
      document.execCommand('selectAll', false);
      document.execCommand('delete', false);
    }

    // Type or paste
    if (options.delay && options.delay > 0) {
      await typeIntoElement(input, text, options.delay);
    } else {
      // Fast insertion
      document.execCommand('insertText', false, text);
    }

    // Trigger input event
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));

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

      case 'copy-artifact':
        return await copyArtifact(action.index || 0);

      default:
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
    // Try multiple selectors
    const button = document.querySelector(SELECTORS.sendButton) ||
                   document.querySelector(SELECTORS.sendButtonAlt) ||
                   document.querySelector('button[type="submit"]');

    if (!button) {
      // Try pressing Enter in the input
      const input = document.querySelector(SELECTORS.promptInput);
      if (input) {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true,
        });
        input.dispatchEvent(enterEvent);
        return { success: true };
      }
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
      // Try navigating directly
      window.location.href = 'https://claude.ai/new';
      return { success: true };
    }
    button.click();
    await delay(500);
    return { success: true };
  }

  async function copyArtifact(index = 0) {
    const artifacts = document.querySelectorAll(SELECTORS.artifacts);
    if (artifacts[index]) {
      const content = artifacts[index].textContent;
      await navigator.clipboard.writeText(content);
      return { success: true, content };
    }
    return { success: false, error: 'Artifact not found' };
  }

  // ============================================================================
  // SEND PROMPT
  // ============================================================================

  async function sendPrompt(prompt, waitForResponse = true) {
    await injectPrompt(prompt);
    await delay(100);

    await clickSendButton();

    if (!waitForResponse) {
      return { success: true, sent: true };
    }

    const response = await waitForClaudeResponse({
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

  async function waitForClaudeResponse(config = {}) {
    const timeout = config.timeout || 60000;
    const pollInterval = config.pollInterval || 500;
    const stableFor = config.stableFor || 2000;

    const startTime = Date.now();
    let lastContent = '';
    let stableTime = 0;
    let responseStarted = false;

    while (Date.now() - startTime < timeout) {
      // Check if streaming
      const streaming = document.querySelector(SELECTORS.streamingIndicator);
      const thinking = document.querySelector(SELECTORS.thinkingIndicator);
      const loading = document.querySelector(SELECTORS.loadingIndicator);

      if (streaming || thinking || loading) {
        responseStarted = true;
        stableTime = 0;
      } else if (responseStarted) {
        const content = getLastResponse();

        if (content === lastContent && content && content.length > 0) {
          stableTime += pollInterval;

          if (stableTime >= stableFor) {
            return {
              success: true,
              detected: true,
              content,
              artifacts: getArtifacts(),
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

    const finalContent = getLastResponse();
    return {
      success: true,
      detected: false,
      content: finalContent,
      artifacts: getArtifacts(),
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
      document.execCommand('insertText', false, char);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char }));
      await delay(charDelay);
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // MUTATION OBSERVER
  // ============================================================================

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        const hasNewResponse = Array.from(mutation.addedNodes).some((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            return node.querySelector?.('[data-is-streaming]') ||
                   node.hasAttribute?.('data-is-streaming');
          }
          return false;
        });

        if (hasNewResponse) {
          chrome.runtime.sendMessage({
            type: 'status-update',
            status: 'new-response',
            provider: 'claude',
          });
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Notify ready
  chrome.runtime.sendMessage({
    type: 'content-ready',
    provider: 'claude',
    url: window.location.href,
  });
})();
