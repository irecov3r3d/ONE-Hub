// ONE-Hub AI Automation Bridge - Generic Content Script
// Base functionality for all pages

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__oneHubBridgeLoaded) return;
  window.__oneHubBridgeLoaded = true;

  console.log('[ONE-Hub Bridge] Generic content script loaded');

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  });

  async function handleMessage(message) {
    switch (message.type) {
      case 'extract':
        return await handleExtract(message.config);

      case 'inject':
        return await handleInject(message.config, message.data);

      case 'action':
        return await handleAction(message.action);

      case 'wait-for-response':
        return await handleWaitForResponse(message.config);

      case 'ping':
        return { success: true, pong: true };

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  // ============================================================================
  // EXTRACTION
  // ============================================================================

  async function handleExtract(config) {
    const results = {};

    for (const rule of config.rules || []) {
      try {
        let value = null;

        switch (rule.method) {
          case 'selector':
            value = extractBySelector(rule.selector, rule.multiple);
            break;

          case 'xpath':
            value = extractByXPath(rule.xpath);
            break;

          case 'regex':
            value = extractByRegex(rule.pattern, rule.source);
            break;

          case 'attribute':
            value = extractAttribute(rule.selector, rule.attribute);
            break;

          case 'clipboard':
            value = await extractFromClipboard();
            break;

          default:
            console.warn(`Unknown extraction method: ${rule.method}`);
        }

        // Apply transforms
        if (value && rule.transforms) {
          value = applyTransforms(value, rule.transforms);
        }

        results[rule.id || rule.name] = value;
      } catch (error) {
        console.error(`Extraction error for ${rule.id}:`, error);
        results[rule.id || rule.name] = null;
      }
    }

    return { success: true, data: results };
  }

  function extractBySelector(selector, multiple = false) {
    if (multiple) {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).map((el) => getElementContent(el));
    } else {
      const element = document.querySelector(selector);
      return element ? getElementContent(element) : null;
    }
  }

  function extractByXPath(xpath) {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const element = result.singleNodeValue;
    return element ? getElementContent(element) : null;
  }

  function extractByRegex(pattern, source = 'body') {
    const sourceElement =
      source === 'body' ? document.body : document.querySelector(source);
    if (!sourceElement) return null;

    const text = sourceElement.textContent || '';
    const regex = new RegExp(pattern);
    const match = text.match(regex);
    return match ? match[1] || match[0] : null;
  }

  function extractAttribute(selector, attribute) {
    const element = document.querySelector(selector);
    return element ? element.getAttribute(attribute) : null;
  }

  async function extractFromClipboard() {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  }

  function getElementContent(element) {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      return element.value;
    }
    if (element.tagName === 'IMG') {
      return element.src;
    }
    if (element.tagName === 'A') {
      return { text: element.textContent?.trim(), href: element.href };
    }
    return element.textContent?.trim() || element.innerHTML;
  }

  // ============================================================================
  // INJECTION
  // ============================================================================

  async function handleInject(config, data) {
    for (const target of config.targets || []) {
      try {
        const value = data[target.id] || data[target.name];
        if (value === undefined) continue;

        await injectValue(target, value);
      } catch (error) {
        console.error(`Injection error for ${target.id}:`, error);
      }
    }

    // Execute submit action if specified
    if (config.submitAction) {
      await delay(100);
      await executeAction(config.submitAction);
    }

    return { success: true };
  }

  async function injectValue(target, value) {
    const element = target.selector
      ? document.querySelector(target.selector)
      : target.xpath
      ? document.evaluate(target.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
      : null;

    if (!element) {
      throw new Error(`Element not found: ${target.selector || target.xpath}`);
    }

    // Clear first if specified
    if (target.clearFirst) {
      await clearElement(element);
    }

    switch (target.method) {
      case 'type':
        await typeIntoElement(element, value, target.delay || 30);
        break;

      case 'paste':
        await pasteIntoElement(element, value);
        break;

      case 'set-value':
        setElementValue(element, value);
        break;

      case 'click':
        element.click();
        break;

      case 'select':
        selectOption(element, value);
        break;

      default:
        setElementValue(element, value);
    }

    // Press enter if specified
    if (target.pressEnter) {
      await delay(50);
      simulateKeyPress(element, 'Enter');
    }
  }

  async function typeIntoElement(element, text, delay) {
    element.focus();

    for (const char of text) {
      // Simulate keydown, input, keyup
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));

      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value += char;
      } else if (element.isContentEditable) {
        document.execCommand('insertText', false, char);
      }

      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  async function pasteIntoElement(element, text) {
    element.focus();

    // Try to use clipboard API
    try {
      await navigator.clipboard.writeText(text);
      document.execCommand('paste');
    } catch {
      // Fallback to direct insertion
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = text;
      } else if (element.isContentEditable) {
        element.textContent = text;
      }
    }

    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }

  function setElementValue(element, value) {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.value = value;
      element.dispatchEvent(new InputEvent('input', { bubbles: true }));
    } else if (element.isContentEditable) {
      element.textContent = value;
      element.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
  }

  async function clearElement(element) {
    element.focus();

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.value = '';
    } else if (element.isContentEditable) {
      element.textContent = '';
    }

    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }

  function selectOption(element, value) {
    if (element.tagName === 'SELECT') {
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function simulateKeyPress(element, key) {
    const keyEvent = new KeyboardEvent('keydown', {
      key,
      code: key === 'Enter' ? 'Enter' : `Key${key.toUpperCase()}`,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(keyEvent);

    const keyUpEvent = new KeyboardEvent('keyup', {
      key,
      code: key === 'Enter' ? 'Enter' : `Key${key.toUpperCase()}`,
      bubbles: true,
    });
    element.dispatchEvent(keyUpEvent);
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  async function handleAction(action) {
    return await executeAction(action);
  }

  async function executeAction(action) {
    switch (action.type) {
      case 'click': {
        const element = document.querySelector(action.selector);
        if (!element) throw new Error(`Element not found: ${action.selector}`);
        element.click();
        return { success: true };
      }

      case 'focus': {
        const element = document.querySelector(action.selector);
        if (!element) throw new Error(`Element not found: ${action.selector}`);
        element.focus();
        return { success: true };
      }

      case 'scroll': {
        if (action.selector) {
          const element = document.querySelector(action.selector);
          element?.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({
            top: action.y || 0,
            left: action.x || 0,
            behavior: 'smooth',
          });
        }
        return { success: true };
      }

      case 'wait': {
        await delay(action.duration || 1000);
        return { success: true };
      }

      case 'screenshot': {
        // Cannot take screenshot from content script
        return { success: false, error: 'Screenshot not supported from content script' };
      }

      case 'evaluate': {
        try {
          const result = eval(action.script);
          return { success: true, data: result };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }

      case 'copy': {
        const element = document.querySelector(action.selector);
        const text = element ? getElementContent(element) : action.value;
        await navigator.clipboard.writeText(text);
        return { success: true };
      }

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // ============================================================================
  // RESPONSE WAITING
  // ============================================================================

  async function handleWaitForResponse(config) {
    const startTime = Date.now();
    const timeout = config.timeout || 60000;
    const pollInterval = config.pollInterval || 500;
    const stableFor = config.stableFor || 2000;

    let lastContent = '';
    let stableTime = 0;

    while (Date.now() - startTime < timeout) {
      // Check for streaming indicators
      if (config.streamingSelector) {
        const streaming = document.querySelector(config.streamingSelector);
        if (streaming) {
          // Still streaming, reset stable time
          stableTime = 0;
          await delay(pollInterval);
          continue;
        }
      }

      // Check for loading indicators
      if (config.loadingSelector) {
        const loading = document.querySelector(config.loadingSelector);
        if (loading) {
          stableTime = 0;
          await delay(pollInterval);
          continue;
        }
      }

      // Get current content
      const contentElement = document.querySelector(config.contentSelector);
      const currentContent = contentElement ? getElementContent(contentElement) : '';

      if (currentContent === lastContent && currentContent.length > 0) {
        stableTime += pollInterval;
        if (stableTime >= stableFor) {
          return { success: true, detected: true, content: currentContent };
        }
      } else {
        lastContent = currentContent;
        stableTime = 0;
      }

      await delay(pollInterval);
    }

    // Timeout - return whatever we have
    const finalElement = document.querySelector(config.contentSelector);
    const finalContent = finalElement ? getElementContent(finalElement) : '';

    return {
      success: true,
      detected: false,
      content: finalContent,
      timedOut: true,
    };
  }

  // ============================================================================
  // TRANSFORMS
  // ============================================================================

  function applyTransforms(value, transforms) {
    let result = value;

    for (const transform of transforms) {
      switch (transform.type) {
        case 'trim':
          result = typeof result === 'string' ? result.trim() : result;
          break;

        case 'lowercase':
          result = typeof result === 'string' ? result.toLowerCase() : result;
          break;

        case 'uppercase':
          result = typeof result === 'string' ? result.toUpperCase() : result;
          break;

        case 'replace':
          if (typeof result === 'string') {
            result = result.replace(new RegExp(transform.pattern, 'g'), transform.replacement || '');
          }
          break;

        case 'split':
          if (typeof result === 'string') {
            result = result.split(transform.separator || ',');
          }
          break;

        case 'slice':
          if (typeof result === 'string' || Array.isArray(result)) {
            result = result.slice(transform.start, transform.end);
          }
          break;

        case 'json-parse':
          try {
            result = JSON.parse(result);
          } catch {
            // Keep original if parse fails
          }
          break;

        case 'regex-extract':
          if (typeof result === 'string' && transform.pattern) {
            const match = result.match(new RegExp(transform.pattern));
            result = match ? match[1] || match[0] : null;
          }
          break;
      }
    }

    return result;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Notify background script that we're ready
  chrome.runtime.sendMessage({ type: 'content-ready' });
})();
