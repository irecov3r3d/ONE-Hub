// ONE-Hub AI Automation Bridge - Discord Content Script
// For Midjourney bot interaction via Discord

(function () {
  'use strict';

  if (window.__oneHubDiscordLoaded) return;
  window.__oneHubDiscordLoaded = true;

  console.log('[ONE-Hub Bridge] Discord content script loaded');

  const SELECTORS = {
    messageInput: '[data-slate-editor="true"]',
    messageInputAlt: '[role="textbox"]',
    sendButton: 'button[aria-label="Send Message"]',
    messages: '[class*="messageContent"]',
    images: '[class*="imageWrapper"] img',
    attachments: '[class*="attachment"]',
    channelName: '[class*="title-"]',
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
        return waitForMidjourneyResponse(message.config);
      default:
        return null;
    }
  }

  function extractData(config) {
    const results = {};

    for (const rule of config.rules || []) {
      switch (rule.id) {
        case 'generated-images':
          results[rule.id] = getRecentImages();
          break;
        case 'latest-image':
          const images = getRecentImages();
          results[rule.id] = images[0] || null;
          break;
        case 'messages':
          results[rule.id] = getRecentMessages();
          break;
        default:
          if (rule.selector) {
            const el = document.querySelector(rule.selector);
            results[rule.id] = el?.textContent?.trim() || null;
          }
      }
    }

    return { success: true, data: results };
  }

  function getRecentImages() {
    const images = document.querySelectorAll(SELECTORS.images);
    return Array.from(images).slice(-10).map(img => ({
      src: img.src,
      alt: img.alt,
      width: img.naturalWidth,
      height: img.naturalHeight,
    }));
  }

  function getRecentMessages() {
    const messages = document.querySelectorAll(SELECTORS.messages);
    return Array.from(messages).slice(-20).map(msg => ({
      content: msg.textContent?.trim(),
      hasImage: !!msg.closest('[class*="messageListItem"]')?.querySelector(SELECTORS.images),
    }));
  }

  async function injectData(config, data) {
    for (const target of config.targets || []) {
      const value = data[target.id] || data[target.name];
      if (!value) continue;

      const input = document.querySelector(SELECTORS.messageInput) ||
                    document.querySelector(SELECTORS.messageInputAlt);

      if (input) {
        input.focus();

        // Clear existing content
        document.execCommand('selectAll', false);
        document.execCommand('delete', false);

        // Type the message
        for (const char of value) {
          document.execCommand('insertText', false, char);
          await new Promise(r => setTimeout(r, target.delay || 20));
        }

        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }
    }

    return { success: true };
  }

  async function executeAction(action) {
    switch (action.id) {
      case 'send':
        // Press Enter to send
        const input = document.querySelector(SELECTORS.messageInput);
        if (input) {
          input.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
          }));
        }
        return { success: true };

      case 'upscale-1':
      case 'upscale-2':
      case 'upscale-3':
      case 'upscale-4':
        return clickMidjourneyButton(`U${action.id.slice(-1)}`);

      case 'vary-subtle':
        return clickMidjourneyButton('Vary (Subtle)');

      case 'vary-strong':
        return clickMidjourneyButton('Vary (Strong)');

      default:
        if (action.selector) {
          document.querySelector(action.selector)?.click();
          return { success: true };
        }
        return { success: false, error: 'Unknown action' };
    }
  }

  function clickMidjourneyButton(buttonText) {
    // Find the most recent message with Midjourney buttons
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.includes(buttonText)) {
        btn.click();
        return { success: true };
      }
    }
    return { success: false, error: `Button "${buttonText}" not found` };
  }

  async function waitForMidjourneyResponse(config) {
    const timeout = config.timeout || 300000; // 5 minutes for image gen
    const startTime = Date.now();
    const initialImageCount = document.querySelectorAll(SELECTORS.images).length;

    while (Date.now() - startTime < timeout) {
      const currentImages = document.querySelectorAll(SELECTORS.images);

      if (currentImages.length > initialImageCount) {
        // New image appeared
        const images = getRecentImages();
        return {
          success: true,
          detected: true,
          images,
          newImage: images[0],
        };
      }

      // Check for progress percentage in messages
      const messages = document.querySelectorAll(SELECTORS.messages);
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.textContent?.includes('%')) {
        // Still generating
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    return {
      success: true,
      detected: false,
      timedOut: true,
    };
  }

  chrome.runtime.sendMessage({ type: 'content-ready', provider: 'discord' });
})();
