/**
 * Teach & Repeat - Macro Player
 * Replays recorded user interactions
 */

(function() {
  'use strict';

  // Avoid double initialization
  if (window.__teachRepeatPlayer) return;
  window.__teachRepeatPlayer = true;

  // Player state
  const playerState = {
    isPlaying: false,
    isPaused: false,
    currentMacro: null,
    currentEventIndex: 0,
    playbackSpeed: 1.0,
    abortController: null
  };

  // Find element using multiple strategies
  async function findElement(elementInfo, timeout = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Try primary selector
      if (elementInfo.selector) {
        try {
          const el = document.querySelector(elementInfo.selector);
          if (el && isElementVisible(el)) return el;
        } catch (e) {}
      }

      // Try by ID
      if (elementInfo.id) {
        const el = document.getElementById(elementInfo.id);
        if (el && isElementVisible(el)) return el;
      }

      // Try by data attributes
      for (const attr of ['data-testid', 'data-id', 'data-name']) {
        const value = elementInfo[attr] || (elementInfo.element && elementInfo.element[attr]);
        if (value) {
          const el = document.querySelector(`[${attr}="${value}"]`);
          if (el && isElementVisible(el)) return el;
        }
      }

      // Try by aria-label
      if (elementInfo.ariaLabel) {
        const el = document.querySelector(`[aria-label="${elementInfo.ariaLabel}"]`);
        if (el && isElementVisible(el)) return el;
      }

      // Try by placeholder
      if (elementInfo.placeholder) {
        const el = document.querySelector(`[placeholder="${elementInfo.placeholder}"]`);
        if (el && isElementVisible(el)) return el;
      }

      // Try by text content (for buttons, links)
      if (elementInfo.text && ['button', 'a', 'span'].includes(elementInfo.tagName)) {
        const elements = document.querySelectorAll(elementInfo.tagName);
        for (const el of elements) {
          if (el.textContent.trim().includes(elementInfo.text) && isElementVisible(el)) {
            return el;
          }
        }
      }

      // Try by tag + class combination
      if (elementInfo.tagName && elementInfo.className) {
        const classes = typeof elementInfo.className === 'string'
          ? elementInfo.className.split(' ')[0]
          : '';
        if (classes) {
          const el = document.querySelector(`${elementInfo.tagName}.${CSS.escape(classes)}`);
          if (el && isElementVisible(el)) return el;
        }
      }

      // Wait before retry
      await sleep(100);
    }

    return null;
  }

  // Check if element is visible and interactable
  function isElementVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    return true;
  }

  // Scroll element into view
  function scrollIntoViewIfNeeded(element) {
    const rect = element.getBoundingClientRect();
    const isInViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth);

    if (!isInViewport) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }
    return false;
  }

  // Simulate mouse event
  function simulateMouseEvent(element, type, options = {}) {
    const rect = element.getBoundingClientRect();
    const x = options.x ?? (rect.left + rect.width / 2);
    const y = options.y ?? (rect.top + rect.height / 2);

    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: x + window.screenX,
      screenY: y + window.screenY,
      ctrlKey: options.ctrlKey || false,
      shiftKey: options.shiftKey || false,
      altKey: options.altKey || false,
      metaKey: options.metaKey || false,
      button: options.button || 0
    });

    element.dispatchEvent(event);
  }

  // Simulate keyboard event
  function simulateKeyEvent(element, type, options = {}) {
    const event = new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      key: options.key,
      code: options.code,
      keyCode: options.keyCode,
      ctrlKey: options.ctrlKey || false,
      shiftKey: options.shiftKey || false,
      altKey: options.altKey || false,
      metaKey: options.metaKey || false
    });

    element.dispatchEvent(event);
  }

  // Type text into an input element
  async function typeText(element, text, options = {}) {
    const speed = options.typingSpeed || 50;

    // Focus the element first
    element.focus();
    await sleep(50);

    // Clear existing content if requested
    if (options.clearFirst) {
      if (element.isContentEditable) {
        element.innerHTML = '';
      } else {
        element.value = '';
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(50);
    }

    // Type each character
    for (const char of text) {
      if (!playerState.isPlaying) break;
      if (playerState.isPaused) {
        await waitForResume();
      }

      // Simulate keydown
      simulateKeyEvent(element, 'keydown', { key: char, code: `Key${char.toUpperCase()}` });

      // Insert the character
      if (element.isContentEditable) {
        document.execCommand('insertText', false, char);
      } else {
        element.value += char;
      }

      // Dispatch input event
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: char
      }));

      // Simulate keyup
      simulateKeyEvent(element, 'keyup', { key: char, code: `Key${char.toUpperCase()}` });

      await sleep(speed / playerState.playbackSpeed);
    }
  }

  // Execute a single event
  async function executeEvent(event) {
    const elementInfo = event.element;
    let element = null;

    // Find target element if needed
    if (elementInfo) {
      element = await findElement(elementInfo);

      if (!element) {
        console.warn('Teach & Repeat: Could not find element', elementInfo);
        showNotification(`Could not find element: ${elementInfo.selector || elementInfo.text}`, 'warning');
        return false;
      }

      // Scroll into view if needed
      if (scrollIntoViewIfNeeded(element)) {
        await sleep(300);
      }

      // Highlight the element
      highlightElement(element);
    }

    // Execute based on event type
    switch (event.type) {
      case 'click':
        if (element) {
          simulateMouseEvent(element, 'mousedown', event);
          await sleep(50);
          simulateMouseEvent(element, 'mouseup', event);
          simulateMouseEvent(element, 'click', event);

          // Also try native click for stubborn elements
          element.click();
        }
        break;

      case 'dblclick':
        if (element) {
          simulateMouseEvent(element, 'dblclick', event);
          element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        }
        break;

      case 'contextmenu':
        if (element) {
          simulateMouseEvent(element, 'contextmenu', event);
        }
        break;

      case 'keydown':
        const target = element || document.activeElement || document.body;
        simulateKeyEvent(target, 'keydown', {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey
        });

        // Handle special keys
        if (event.key === 'Enter' && target.tagName === 'TEXTAREA') {
          target.value += '\n';
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;

      case 'input':
        if (element && event.value !== undefined) {
          await typeText(element, event.value, { clearFirst: true });
        }
        break;

      case 'change':
        if (element) {
          if (element.type === 'checkbox' || element.type === 'radio') {
            element.checked = event.value;
          } else if (element.tagName === 'SELECT') {
            element.value = event.value;
          } else {
            element.value = event.value;
          }
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;

      case 'focus':
        if (element) {
          element.focus();
        }
        break;

      case 'blur':
        if (element) {
          // Set final value before blur
          if (event.value !== undefined) {
            if (element.isContentEditable) {
              element.innerHTML = event.value;
            } else {
              element.value = event.value;
            }
          }
          element.blur();
        }
        break;

      case 'scroll':
        const scrollTarget = element || window;
        scrollTarget.scrollTo({
          left: event.scrollX,
          top: event.scrollY,
          behavior: 'smooth'
        });
        break;

      case 'mousemove':
        // Mouse move is mostly decorative during playback
        break;

      case 'copy':
        if (event.text) {
          try {
            await navigator.clipboard.writeText(event.text);
          } catch (e) {
            console.warn('Could not copy to clipboard:', e);
          }
        }
        break;

      case 'paste':
        if (element && event.text) {
          await typeText(element, event.text, { clearFirst: false });
        }
        break;

      case 'select':
        // Text selection - informational only
        break;

      case 'dragstart':
      case 'drop':
        // Drag and drop simulation is complex, log for now
        console.log('Drag/drop event:', event);
        break;

      default:
        console.log('Unknown event type:', event.type);
    }

    return true;
  }

  // Play a macro
  async function playMacro(macro, options = {}) {
    if (playerState.isPlaying) {
      console.warn('Teach & Repeat: Already playing');
      return;
    }

    playerState.isPlaying = true;
    playerState.isPaused = false;
    playerState.currentMacro = macro;
    playerState.currentEventIndex = 0;
    playerState.playbackSpeed = options.speed || 1.0;
    playerState.abortController = new AbortController();

    showPlaybackIndicator();
    console.log('Teach & Repeat: Starting playback', macro.name);

    const events = macro.events || [];
    let lastTimestamp = 0;

    try {
      for (let i = 0; i < events.length; i++) {
        if (!playerState.isPlaying) break;

        while (playerState.isPaused) {
          await sleep(100);
          if (!playerState.isPlaying) break;
        }

        const event = events[i];
        playerState.currentEventIndex = i;

        // Wait for timing (if not first event)
        if (i > 0 && event.timestamp) {
          const delay = (event.timestamp - lastTimestamp) / playerState.playbackSpeed;
          if (delay > 0 && delay < 10000) {
            await sleep(Math.min(delay, 2000)); // Cap at 2 seconds
          }
        }
        lastTimestamp = event.timestamp || 0;

        // Execute the event
        await executeEvent(event);

        // Small delay between events
        await sleep(options.minDelay || 50);
      }
    } catch (err) {
      console.error('Teach & Repeat: Playback error', err);
      showNotification('Playback error: ' + err.message, 'error');
    }

    stopPlayback();
    console.log('Teach & Repeat: Playback completed');
  }

  // Stop playback
  function stopPlayback() {
    playerState.isPlaying = false;
    playerState.isPaused = false;
    playerState.currentMacro = null;
    playerState.currentEventIndex = 0;

    if (playerState.abortController) {
      playerState.abortController.abort();
      playerState.abortController = null;
    }

    hidePlaybackIndicator();

    // Notify background script
    browser.runtime.sendMessage({ type: 'PLAYBACK_COMPLETE' }).catch(() => {});
  }

  // Pause/resume playback
  function togglePause() {
    if (!playerState.isPlaying) return;
    playerState.isPaused = !playerState.isPaused;
    updatePlaybackIndicator();
  }

  // Wait for resume after pause
  function waitForResume() {
    return new Promise(resolve => {
      const check = () => {
        if (!playerState.isPaused || !playerState.isPlaying) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  // Visual feedback - highlight target elements
  function highlightElement(element) {
    const highlight = document.createElement('div');
    highlight.className = 'teach-repeat-play-highlight';
    highlight.style.cssText = `
      position: fixed;
      pointer-events: none;
      border: 2px solid #4ecdc4;
      background: rgba(78, 205, 196, 0.2);
      border-radius: 4px;
      z-index: 999999;
      transition: opacity 0.3s ease;
    `;

    const rect = element.getBoundingClientRect();
    highlight.style.left = rect.left + 'px';
    highlight.style.top = rect.top + 'px';
    highlight.style.width = rect.width + 'px';
    highlight.style.height = rect.height + 'px';

    document.body.appendChild(highlight);

    setTimeout(() => {
      highlight.style.opacity = '0';
      setTimeout(() => highlight.remove(), 300);
    }, 300);
  }

  // Playback indicator UI
  let playbackIndicator = null;

  function showPlaybackIndicator() {
    if (playbackIndicator) return;

    playbackIndicator = document.createElement('div');
    playbackIndicator.id = 'teach-repeat-playback-indicator';
    playbackIndicator.innerHTML = `
      <div class="tr-play-content">
        <span class="tr-play-icon">▶</span>
        <span class="tr-play-text">Playing...</span>
        <button class="tr-play-pause">⏸</button>
        <button class="tr-play-stop">⏹</button>
      </div>
    `;
    playbackIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 2147483647;
      background: linear-gradient(135deg, #4ecdc4, #44a08d);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(78, 205, 196, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
    `;

    const style = document.createElement('style');
    style.id = 'teach-repeat-play-styles';
    style.textContent = `
      #teach-repeat-playback-indicator .tr-play-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #teach-repeat-playback-indicator .tr-play-icon {
        font-size: 12px;
      }
      #teach-repeat-playback-indicator button {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 4px 8px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s;
      }
      #teach-repeat-playback-indicator button:hover {
        background: rgba(255,255,255,0.3);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(playbackIndicator);

    // Add button handlers
    playbackIndicator.querySelector('.tr-play-pause').addEventListener('click', togglePause);
    playbackIndicator.querySelector('.tr-play-stop').addEventListener('click', stopPlayback);
  }

  function hidePlaybackIndicator() {
    if (playbackIndicator) {
      playbackIndicator.remove();
      playbackIndicator = null;
    }
    const style = document.getElementById('teach-repeat-play-styles');
    if (style) style.remove();
  }

  function updatePlaybackIndicator() {
    if (!playbackIndicator) return;

    const icon = playbackIndicator.querySelector('.tr-play-icon');
    const text = playbackIndicator.querySelector('.tr-play-text');
    const pauseBtn = playbackIndicator.querySelector('.tr-play-pause');

    if (playerState.isPaused) {
      icon.textContent = '⏸';
      text.textContent = 'Paused';
      pauseBtn.textContent = '▶';
    } else {
      icon.textContent = '▶';
      text.textContent = 'Playing...';
      pauseBtn.textContent = '⏸';
    }
  }

  // Show notification
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'teach-repeat-notification';

    const colors = {
      info: '#4ecdc4',
      warning: '#f39c12',
      error: '#e74c3c',
      success: '#2ecc71'
    };

    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      background: ${colors[type] || colors.info};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: tr-slide-in 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'tr-slide-out 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Helper: Sleep function
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Listen for messages from background script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'EXECUTE_MACRO':
        playMacro(message.macro, message.options);
        sendResponse({ success: true });
        break;

      case 'PLAYBACK_STOPPED':
        stopPlayback();
        sendResponse({ success: true });
        break;

      case 'TOGGLE_PAUSE':
        togglePause();
        sendResponse({ isPaused: playerState.isPaused });
        break;

      case 'GET_PLAYBACK_STATE':
        sendResponse({
          isPlaying: playerState.isPlaying,
          isPaused: playerState.isPaused,
          currentEventIndex: playerState.currentEventIndex,
          totalEvents: playerState.currentMacro?.events?.length || 0
        });
        break;
    }
    return true;
  });

  // Add notification animation styles
  const animStyles = document.createElement('style');
  animStyles.textContent = `
    @keyframes tr-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes tr-slide-out {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(animStyles);

  console.log('Teach & Repeat: Player content script loaded');
})();
