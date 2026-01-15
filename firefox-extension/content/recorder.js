/**
 * Teach & Repeat - Event Recorder
 * Captures user interactions for macro recording
 */

(function() {
  'use strict';

  // Avoid double initialization
  if (window.__teachRepeatRecorder) return;
  window.__teachRepeatRecorder = true;

  // Recorder state
  const recorderState = {
    isRecording: false,
    settings: {
      captureMouseMove: false,
      captureScroll: true,
      captureClipboard: true,
      highlightElements: true
    },
    lastMouseMove: 0,
    mouseMoveThrottle: 50
  };

  // Element selector generator
  function generateSelector(element) {
    if (!element || element === document.body || element === document.documentElement) {
      return 'body';
    }

    // Try ID first
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    // Try unique data attributes
    const dataAttrs = ['data-testid', 'data-id', 'data-name', 'data-action'];
    for (const attr of dataAttrs) {
      const value = element.getAttribute(attr);
      if (value) {
        const selector = `[${attr}="${CSS.escape(value)}"]`;
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }

    // Try aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      const selector = `[aria-label="${CSS.escape(ariaLabel)}"]`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }

    // Build path with classes and nth-child
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(c => c && !c.startsWith('__'));
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).map(c => CSS.escape(c)).join('.');
        }
      }

      // Add nth-child for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          el => el.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = parent;

      // Limit path depth
      if (path.length >= 5) break;
    }

    return path.join(' > ');
  }

  // Get element's visible text
  function getElementText(element) {
    if (!element) return '';
    const text = element.innerText || element.textContent || '';
    return text.trim().substring(0, 100);
  }

  // Get element attributes for identification
  function getElementInfo(element) {
    if (!element) return null;

    const rect = element.getBoundingClientRect();

    return {
      selector: generateSelector(element),
      tagName: element.tagName.toLowerCase(),
      text: getElementText(element),
      className: element.className,
      id: element.id,
      name: element.name,
      type: element.type,
      value: element.value,
      placeholder: element.placeholder,
      href: element.href,
      src: element.src,
      ariaLabel: element.getAttribute('aria-label'),
      role: element.getAttribute('role'),
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left
      },
      isContentEditable: element.isContentEditable,
      isVisible: rect.width > 0 && rect.height > 0
    };
  }

  // Record an event
  function recordEvent(eventType, data) {
    if (!recorderState.isRecording) return;

    browser.runtime.sendMessage({
      type: 'RECORD_EVENT',
      event: {
        type: eventType,
        url: window.location.href,
        ...data
      }
    }).catch(err => console.error('Failed to record event:', err));
  }

  // Event Handlers
  function handleClick(e) {
    if (!recorderState.isRecording) return;

    const element = e.target;
    const info = getElementInfo(element);

    recordEvent('click', {
      element: info,
      x: e.clientX,
      y: e.clientY,
      pageX: e.pageX,
      pageY: e.pageY,
      button: e.button,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey
    });

    // Visual feedback
    if (recorderState.settings.highlightElements) {
      highlightElement(element);
    }
  }

  function handleDblClick(e) {
    if (!recorderState.isRecording) return;

    recordEvent('dblclick', {
      element: getElementInfo(e.target),
      x: e.clientX,
      y: e.clientY
    });
  }

  function handleContextMenu(e) {
    if (!recorderState.isRecording) return;

    recordEvent('contextmenu', {
      element: getElementInfo(e.target),
      x: e.clientX,
      y: e.clientY
    });
  }

  function handleKeyDown(e) {
    if (!recorderState.isRecording) return;

    const element = e.target;
    const info = getElementInfo(element);

    // Capture special keys and shortcuts
    const isSpecialKey = e.ctrlKey || e.altKey || e.metaKey ||
      ['Enter', 'Escape', 'Tab', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown',
       'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'F1',
       'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
      ].includes(e.key);

    if (isSpecialKey) {
      recordEvent('keydown', {
        element: info,
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey
      });
    }
  }

  function handleKeyUp(e) {
    // We mainly use keydown, but track keyup for special cases
  }

  function handleInput(e) {
    if (!recorderState.isRecording) return;

    const element = e.target;
    const info = getElementInfo(element);

    // Debounce rapid input events
    clearTimeout(element.__inputTimeout);
    element.__inputTimeout = setTimeout(() => {
      recordEvent('input', {
        element: info,
        value: element.value || element.innerText,
        inputType: e.inputType
      });
    }, 300);
  }

  function handleChange(e) {
    if (!recorderState.isRecording) return;

    const element = e.target;
    const info = getElementInfo(element);

    recordEvent('change', {
      element: info,
      value: element.type === 'checkbox' || element.type === 'radio'
        ? element.checked
        : (element.value || element.innerText)
    });
  }

  function handleFocus(e) {
    if (!recorderState.isRecording) return;

    recordEvent('focus', {
      element: getElementInfo(e.target)
    });
  }

  function handleBlur(e) {
    if (!recorderState.isRecording) return;

    const element = e.target;
    const info = getElementInfo(element);

    // Capture final value on blur
    if (element.value !== undefined || element.isContentEditable) {
      recordEvent('blur', {
        element: info,
        value: element.value || element.innerText
      });
    }
  }

  function handleScroll(e) {
    if (!recorderState.isRecording || !recorderState.settings.captureScroll) return;

    // Throttle scroll events
    const now = Date.now();
    if (now - recorderState.lastScroll < 100) return;
    recorderState.lastScroll = now;

    const target = e.target === document ? document.documentElement : e.target;

    recordEvent('scroll', {
      element: getElementInfo(target),
      scrollX: target.scrollLeft || window.scrollX,
      scrollY: target.scrollTop || window.scrollY
    });
  }

  function handleMouseMove(e) {
    if (!recorderState.isRecording || !recorderState.settings.captureMouseMove) return;

    const now = Date.now();
    if (now - recorderState.lastMouseMove < recorderState.mouseMoveThrottle) return;
    recorderState.lastMouseMove = now;

    recordEvent('mousemove', {
      x: e.clientX,
      y: e.clientY,
      pageX: e.pageX,
      pageY: e.pageY
    });
  }

  function handleCopy(e) {
    if (!recorderState.isRecording || !recorderState.settings.captureClipboard) return;

    const selection = window.getSelection().toString();
    recordEvent('copy', {
      element: getElementInfo(e.target),
      text: selection.substring(0, 1000)
    });
  }

  function handlePaste(e) {
    if (!recorderState.isRecording || !recorderState.settings.captureClipboard) return;

    const pastedText = e.clipboardData?.getData('text') || '';
    recordEvent('paste', {
      element: getElementInfo(e.target),
      text: pastedText.substring(0, 1000)
    });
  }

  function handleSelect(e) {
    if (!recorderState.isRecording) return;

    const selection = window.getSelection().toString();
    if (selection) {
      recordEvent('select', {
        element: getElementInfo(e.target),
        text: selection.substring(0, 500)
      });
    }
  }

  function handleDragStart(e) {
    if (!recorderState.isRecording) return;

    recordEvent('dragstart', {
      element: getElementInfo(e.target),
      x: e.clientX,
      y: e.clientY
    });
  }

  function handleDrop(e) {
    if (!recorderState.isRecording) return;

    recordEvent('drop', {
      element: getElementInfo(e.target),
      x: e.clientX,
      y: e.clientY
    });
  }

  // Visual feedback - highlight clicked elements
  function highlightElement(element) {
    const highlight = document.createElement('div');
    highlight.className = 'teach-repeat-highlight';
    highlight.style.cssText = `
      position: fixed;
      pointer-events: none;
      border: 2px solid #ff6b6b;
      background: rgba(255, 107, 107, 0.2);
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
    }, 200);
  }

  // Start recording
  function startRecording(settings = {}) {
    recorderState.isRecording = true;
    recorderState.settings = { ...recorderState.settings, ...settings };

    // Add event listeners
    document.addEventListener('click', handleClick, true);
    document.addEventListener('dblclick', handleDblClick, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('change', handleChange, true);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('select', handleSelect, true);
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('drop', handleDrop, true);

    showRecordingIndicator();
    console.log('Teach & Repeat: Recording started');
  }

  // Stop recording
  function stopRecording() {
    recorderState.isRecording = false;

    // Remove event listeners
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('dblclick', handleDblClick, true);
    document.removeEventListener('contextmenu', handleContextMenu, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('keyup', handleKeyUp, true);
    document.removeEventListener('input', handleInput, true);
    document.removeEventListener('change', handleChange, true);
    document.removeEventListener('focus', handleFocus, true);
    document.removeEventListener('blur', handleBlur, true);
    document.removeEventListener('scroll', handleScroll, true);
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('copy', handleCopy, true);
    document.removeEventListener('paste', handlePaste, true);
    document.removeEventListener('select', handleSelect, true);
    document.removeEventListener('dragstart', handleDragStart, true);
    document.removeEventListener('drop', handleDrop, true);

    hideRecordingIndicator();
    console.log('Teach & Repeat: Recording stopped');
  }

  // Recording indicator UI
  let recordingIndicator = null;

  function showRecordingIndicator() {
    if (recordingIndicator) return;

    recordingIndicator = document.createElement('div');
    recordingIndicator.id = 'teach-repeat-recording-indicator';
    recordingIndicator.innerHTML = `
      <div class="tr-indicator-content">
        <span class="tr-recording-dot"></span>
        <span class="tr-recording-text">Recording...</span>
      </div>
    `;
    recordingIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 2147483647;
      background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      animation: tr-pulse 2s ease-in-out infinite;
      cursor: default;
      user-select: none;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes tr-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.85; transform: scale(0.98); }
      }
      @keyframes tr-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      #teach-repeat-recording-indicator .tr-recording-dot {
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        animation: tr-blink 1s ease-in-out infinite;
      }
      #teach-repeat-recording-indicator .tr-indicator-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(recordingIndicator);
  }

  function hideRecordingIndicator() {
    if (recordingIndicator) {
      recordingIndicator.remove();
      recordingIndicator = null;
    }
  }

  // Listen for messages from background script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'RECORDING_STARTED':
        startRecording(message.settings);
        sendResponse({ success: true });
        break;

      case 'RECORDING_STOPPED':
        stopRecording();
        sendResponse({ success: true });
        break;

      case 'GET_ELEMENT_AT_POINT':
        const element = document.elementFromPoint(message.x, message.y);
        sendResponse({ element: getElementInfo(element) });
        break;

      case 'PING':
        sendResponse({ pong: true });
        break;
    }
    return true;
  });

  console.log('Teach & Repeat: Recorder content script loaded');
})();
