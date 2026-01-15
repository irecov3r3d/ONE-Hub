/**
 * Teach & Repeat - AI Chat Integration
 * Handles sending prompts to AI chats and collecting responses
 */

(function() {
  'use strict';

  // Avoid double initialization
  if (window.__teachRepeatAiChat) return;
  window.__teachRepeatAiChat = true;

  // AI Chat detection and configuration
  const AI_CHAT_DETECTORS = {
    claude: {
      detect: () => window.location.hostname.includes('claude.ai'),
      selectors: {
        input: [
          'div[contenteditable="true"][data-placeholder]',
          'div.ProseMirror[contenteditable="true"]',
          'div[contenteditable="true"]',
          'textarea'
        ],
        sendButton: [
          'button[aria-label*="Send"]',
          'button[data-testid="send-button"]',
          'button[type="submit"]:not([disabled])'
        ],
        response: [
          '[data-testid="assistant-message"]',
          '.font-claude-message',
          '[data-message-role="assistant"]',
          '.prose'
        ],
        loadingIndicator: [
          '[data-testid="loading"]',
          '.animate-pulse',
          '[class*="loading"]'
        ]
      }
    },
    chatgpt: {
      detect: () => window.location.hostname.includes('chat.openai.com') ||
                   window.location.hostname.includes('chatgpt.com'),
      selectors: {
        input: [
          '#prompt-textarea',
          'textarea[data-id="root"]',
          'textarea[placeholder*="Message"]',
          'div[contenteditable="true"]'
        ],
        sendButton: [
          'button[data-testid="send-button"]',
          'button[aria-label="Send prompt"]',
          'button[aria-label*="Send"]'
        ],
        response: [
          '[data-message-author-role="assistant"]',
          '.markdown.prose',
          '[class*="agent-turn"]'
        ],
        loadingIndicator: [
          '.result-streaming',
          '[class*="typing"]',
          '.animate-pulse'
        ]
      }
    },
    copilot: {
      detect: () => window.location.hostname.includes('github.com') &&
                   window.location.pathname.includes('copilot'),
      selectors: {
        input: [
          'textarea',
          'input[type="text"]',
          'div[contenteditable="true"]'
        ],
        sendButton: [
          'button[type="submit"]',
          'button[aria-label*="Send"]'
        ],
        response: [
          '.copilot-response',
          '.markdown-body'
        ],
        loadingIndicator: [
          '.loading',
          '.spinner'
        ]
      }
    }
  };

  // Detect which AI chat we're on
  function detectAiChat() {
    for (const [key, config] of Object.entries(AI_CHAT_DETECTORS)) {
      if (config.detect()) {
        return { key, config };
      }
    }
    return null;
  }

  // Find element using multiple selectors
  function findElement(selectors, timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const tryFind = () => {
        for (const selector of selectors) {
          try {
            const el = document.querySelector(selector);
            if (el && isVisible(el)) {
              return resolve(el);
            }
          } catch (e) {}
        }

        if (Date.now() - startTime < timeout) {
          setTimeout(tryFind, 100);
        } else {
          resolve(null);
        }
      };

      tryFind();
    });
  }

  // Check element visibility
  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 &&
           style.display !== 'none' &&
           style.visibility !== 'hidden';
  }

  // Wait for element to appear
  function waitForElement(selectors, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const observer = new MutationObserver((mutations, obs) => {
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el && isVisible(el)) {
            obs.disconnect();
            resolve(el);
            return;
          }
        }

        if (Date.now() - startTime > timeout) {
          obs.disconnect();
          reject(new Error('Timeout waiting for element'));
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });

      // Initial check
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && isVisible(el)) {
          observer.disconnect();
          resolve(el);
          return;
        }
      }
    });
  }

  // Set text in input element
  async function setInputText(element, text) {
    element.focus();
    await sleep(100);

    // Handle contenteditable
    if (element.contentEditable === 'true' || element.isContentEditable) {
      // Clear existing content
      element.innerHTML = '';

      // Try using execCommand first
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);

      // Fallback to direct manipulation
      if (!element.textContent.includes(text)) {
        element.textContent = text;
        // Trigger input event
        element.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: text
        }));
      }

      // For React-based inputs
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement?.prototype || {},
        'value'
      )?.set;

      if (element.tagName === 'TEXTAREA' && nativeInputValueSetter) {
        nativeInputValueSetter.call(element, text);
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }

    } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      // Standard input/textarea
      element.value = text;

      // Trigger React synthetic events
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        element.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, text);
      }

      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    await sleep(100);
  }

  // Get all response messages
  function getResponses(selectors) {
    const responses = [];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent || el.innerText;
        if (text && text.trim()) {
          responses.push({
            text: text.trim(),
            html: el.innerHTML,
            timestamp: Date.now()
          });
        }
      });
    }
    return responses;
  }

  // Get the latest response
  function getLatestResponse(selectors) {
    const responses = getResponses(selectors);
    return responses[responses.length - 1] || null;
  }

  // Wait for AI response to complete
  async function waitForResponse(config, previousResponseCount, timeout = 120000) {
    const startTime = Date.now();
    let lastResponseText = '';
    let stableCount = 0;

    while (Date.now() - startTime < timeout) {
      // Check if still loading
      let isLoading = false;
      for (const selector of config.selectors.loadingIndicator) {
        if (document.querySelector(selector)) {
          isLoading = true;
          break;
        }
      }

      // Get current responses
      const responses = getResponses(config.selectors.response);

      // Check if we have a new response
      if (responses.length > previousResponseCount) {
        const latestResponse = responses[responses.length - 1];

        // Check if response is stable (not changing)
        if (latestResponse.text === lastResponseText) {
          stableCount++;
          // Consider stable after 1 second of no changes and not loading
          if (stableCount >= 5 && !isLoading) {
            return latestResponse;
          }
        } else {
          lastResponseText = latestResponse.text;
          stableCount = 0;
        }
      }

      await sleep(200);
    }

    throw new Error('Timeout waiting for AI response');
  }

  // Send prompt to current AI chat
  async function sendPrompt(prompt, sessionId, chatKey) {
    const aiChat = detectAiChat();
    if (!aiChat) {
      throw new Error('Not on a recognized AI chat page');
    }

    const config = aiChat.config;
    console.log(`Teach & Repeat: Sending prompt to ${aiChat.key}`);

    // Count existing responses
    const existingResponses = getResponses(config.selectors.response);
    const previousResponseCount = existingResponses.length;

    // Find input element
    const inputElement = await findElement(config.selectors.input);
    if (!inputElement) {
      throw new Error('Could not find input element');
    }

    // Set the prompt text
    await setInputText(inputElement, prompt);
    await sleep(300);

    // Find and click send button
    const sendButton = await findElement(config.selectors.sendButton);
    if (sendButton) {
      sendButton.click();
    } else {
      // Try pressing Enter
      inputElement.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        bubbles: true
      }));
    }

    // Wait for response
    console.log(`Teach & Repeat: Waiting for response from ${aiChat.key}...`);
    const response = await waitForResponse(config, previousResponseCount);

    // Notify background script of response
    await browser.runtime.sendMessage({
      type: 'AI_RESPONSE_RECEIVED',
      sessionId,
      chatKey: chatKey || aiChat.key,
      response: {
        text: response.text,
        html: response.html,
        timestamp: response.timestamp
      }
    });

    return response;
  }

  // Watch for new responses (for manual collection)
  let responseObserver = null;

  function startWatchingResponses(callback) {
    const aiChat = detectAiChat();
    if (!aiChat) return;

    const config = aiChat.config;

    responseObserver = new MutationObserver((mutations) => {
      const responses = getResponses(config.selectors.response);
      if (responses.length > 0) {
        callback(responses[responses.length - 1], aiChat.key);
      }
    });

    responseObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function stopWatchingResponses() {
    if (responseObserver) {
      responseObserver.disconnect();
      responseObserver = null;
    }
  }

  // Helper: Sleep function
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Show status notification
  function showStatus(message, type = 'info') {
    const existing = document.querySelector('.teach-repeat-ai-status');
    if (existing) existing.remove();

    const colors = {
      info: '#3498db',
      success: '#2ecc71',
      error: '#e74c3c',
      sending: '#9b59b6'
    };

    const status = document.createElement('div');
    status.className = 'teach-repeat-ai-status';
    status.textContent = message;
    status.style.cssText = `
      position: fixed;
      top: 60px;
      right: 10px;
      z-index: 2147483647;
      background: ${colors[type]};
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(status);

    if (type !== 'sending') {
      setTimeout(() => status.remove(), 4000);
    }
  }

  // Listen for messages from background script
  browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    switch (message.type) {
      case 'SEND_AI_PROMPT':
        try {
          showStatus('Sending prompt...', 'sending');
          const response = await sendPrompt(
            message.prompt,
            message.sessionId,
            message.chatKey
          );
          showStatus('Response received!', 'success');
          sendResponse({ success: true, response });
        } catch (err) {
          console.error('Teach & Repeat: Error sending prompt', err);
          showStatus('Error: ' + err.message, 'error');
          sendResponse({ success: false, error: err.message });
        }
        break;

      case 'GET_AI_RESPONSE':
        const aiChat = detectAiChat();
        if (aiChat) {
          const latest = getLatestResponse(aiChat.config.selectors.response);
          sendResponse({ success: true, response: latest, chatKey: aiChat.key });
        } else {
          sendResponse({ success: false, error: 'Not on AI chat page' });
        }
        break;

      case 'DETECT_AI_CHAT':
        const detected = detectAiChat();
        sendResponse({
          success: !!detected,
          chatKey: detected?.key,
          url: window.location.href
        });
        break;

      case 'START_WATCHING_RESPONSES':
        startWatchingResponses((response, chatKey) => {
          browser.runtime.sendMessage({
            type: 'NEW_AI_RESPONSE',
            response,
            chatKey,
            url: window.location.href
          });
        });
        sendResponse({ success: true });
        break;

      case 'STOP_WATCHING_RESPONSES':
        stopWatchingResponses();
        sendResponse({ success: true });
        break;
    }
    return true;
  });

  // Auto-detect and log current AI chat
  const currentChat = detectAiChat();
  if (currentChat) {
    console.log(`Teach & Repeat: Detected AI chat - ${currentChat.key}`);
    // Notify background that we're on an AI chat page
    browser.runtime.sendMessage({
      type: 'AI_CHAT_PAGE_LOADED',
      chatKey: currentChat.key,
      url: window.location.href
    }).catch(() => {});
  }

  console.log('Teach & Repeat: AI Chat content script loaded');
})();
