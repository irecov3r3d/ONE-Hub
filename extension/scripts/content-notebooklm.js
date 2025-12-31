// NotebookLM Content Script
// Handles interaction with Google NotebookLM

(function() {
  'use strict';

  const PLATFORM = 'notebooklm';

  // Register with background script
  chrome.runtime.sendMessage({
    type: 'REGISTER_TAB',
    platform: PLATFORM,
    url: window.location.href
  });

  // Listen for commands from the extension
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== PLATFORM && message.target !== 'all') {
      return;
    }

    switch (message.type) {
      case 'EXTRACT_DATA':
        sendResponse(extractData(message.config));
        break;
      case 'INJECT_INPUT':
        injectInput(message.config, sendResponse);
        break;
      case 'EXECUTE_ACTION':
        executeAction(message.config, sendResponse);
        break;
      case 'CHECK_STATUS':
        sendResponse(checkStatus());
        break;
      case 'GET_SOURCES':
        sendResponse(getSources());
        break;
      case 'ADD_SOURCE':
        addSource(message.config, sendResponse);
        break;
      default:
        sendResponse({ success: false, error: 'Unknown command' });
    }

    return true; // Keep channel open for async responses
  });

  function extractData(config) {
    try {
      const result = {};

      // Extract AI response/summary
      const responseSelectors = [
        '[data-test-id="response-text"]',
        '.response-container',
        '.summary-content',
        '.notebook-response',
        '.ai-response-text',
        '[role="article"] .content'
      ];

      for (const selector of responseSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          result.response = element.innerText.trim();
          break;
        }
      }

      // Extract from content area if no specific response found
      if (!result.response) {
        const contentArea = document.querySelector('.content-panel, .main-content, [role="main"]');
        if (contentArea) {
          result.response = contentArea.innerText.trim();
        }
      }

      // Extract notebook title
      const titleSelectors = [
        '.notebook-title',
        'h1[data-test-id="notebook-title"]',
        '.document-title',
        'h1'
      ];

      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          result.title = element.innerText.trim();
          break;
        }
      }

      // Extract sources list
      result.sources = getSources().sources;

      // Extract audio overview if available
      const audioOverview = document.querySelector('.audio-overview, .podcast-content, [data-test-id="audio-overview"]');
      if (audioOverview) {
        result.audioOverview = audioOverview.innerText.trim();
      }

      // Custom selector extraction
      if (config?.selector) {
        const custom = document.querySelector(config.selector);
        if (custom) {
          result.custom = custom.innerText.trim();
        }
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  function getSources() {
    try {
      const sources = [];
      const sourceSelectors = [
        '.source-item',
        '.source-card',
        '[data-test-id="source-item"]',
        '.sources-list > div'
      ];

      for (const selector of sourceSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((el, index) => {
            const title = el.querySelector('.source-title, h3, .title')?.innerText?.trim();
            const snippet = el.querySelector('.source-snippet, .preview, .snippet')?.innerText?.trim();
            sources.push({
              index,
              title: title || `Source ${index + 1}`,
              snippet: snippet || ''
            });
          });
          break;
        }
      }

      return { success: true, sources };
    } catch (error) {
      return { success: false, error: error.message, sources: [] };
    }
  }

  function injectInput(config, sendResponse) {
    try {
      const inputSelectors = [
        'textarea[data-test-id="query-input"]',
        '.query-input textarea',
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="question"]',
        '.chat-input textarea',
        'textarea'
      ];

      let input = null;

      if (config?.selector) {
        input = document.querySelector(config.selector);
      }

      if (!input) {
        for (const selector of inputSelectors) {
          input = document.querySelector(selector);
          if (input) break;
        }
      }

      if (!input) {
        sendResponse({ success: false, error: 'Input field not found' });
        return;
      }

      // Focus and set value
      input.focus();
      input.value = config.text || '';

      // Trigger input events for React
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Auto-submit if requested
      if (config.autoSubmit) {
        setTimeout(() => {
          const submitSelectors = [
            'button[data-test-id="submit-query"]',
            'button[type="submit"]',
            '.submit-button',
            'button[aria-label*="Send"]',
            'button[aria-label*="Ask"]'
          ];

          for (const selector of submitSelectors) {
            const button = document.querySelector(selector);
            if (button && !button.disabled) {
              button.click();
              break;
            }
          }

          sendResponse({ success: true });
        }, 100);
      } else {
        sendResponse({ success: true });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  function addSource(config, sendResponse) {
    try {
      // Click add source button
      const addSourceSelectors = [
        'button[data-test-id="add-source"]',
        '.add-source-button',
        'button[aria-label*="Add source"]',
        'button[aria-label*="Upload"]'
      ];

      for (const selector of addSourceSelectors) {
        const button = document.querySelector(selector);
        if (button) {
          button.click();
          sendResponse({ success: true, message: 'Add source dialog opened' });
          return;
        }
      }

      sendResponse({ success: false, error: 'Add source button not found' });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  function executeAction(config, sendResponse) {
    try {
      const action = config?.action;

      switch (action) {
        case 'submit':
        case 'send':
          const submitBtn = document.querySelector(
            'button[data-test-id="submit-query"], button[type="submit"], .submit-button'
          );
          if (submitBtn) {
            submitBtn.click();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Submit button not found' });
          }
          break;

        case 'generate-audio':
        case 'create-podcast':
          const audioBtn = document.querySelector(
            'button[data-test-id="generate-audio"], .audio-overview-button, button[aria-label*="Audio"]'
          );
          if (audioBtn) {
            audioBtn.click();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Audio generation button not found' });
          }
          break;

        case 'new-notebook':
          const newBtn = document.querySelector(
            'button[data-test-id="new-notebook"], .new-notebook-button, button[aria-label*="New"]'
          );
          if (newBtn) {
            newBtn.click();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'New notebook button not found' });
          }
          break;

        case 'click':
          if (config.selector) {
            const element = document.querySelector(config.selector);
            if (element) {
              element.click();
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'Element not found' });
            }
          } else {
            sendResponse({ success: false, error: 'No selector provided' });
          }
          break;

        default:
          sendResponse({ success: false, error: `Unknown action: ${action}` });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  function checkStatus() {
    // Check if NotebookLM is processing/generating
    const loadingIndicators = [
      '.loading-indicator',
      '.generating-indicator',
      '[data-test-id="loading"]',
      '.spinner',
      '.processing'
    ];

    for (const selector of loadingIndicators) {
      const indicator = document.querySelector(selector);
      if (indicator && indicator.offsetParent !== null) {
        return { success: true, status: 'processing', ready: false };
      }
    }

    // Check for audio generation in progress
    const audioGenerating = document.querySelector('.audio-generating, [data-state="generating"]');
    if (audioGenerating) {
      return { success: true, status: 'generating-audio', ready: false };
    }

    return { success: true, status: 'ready', ready: true };
  }

  // Notify that content script is loaded
  console.log('[ONE-Hub] NotebookLM content script loaded');
})();
