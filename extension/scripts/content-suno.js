// ONE-Hub AI Automation Bridge - Suno Content Script
// Specific handlers for Suno AI (suno.com / app.suno.ai)

(function () {
  'use strict';

  if (window.__oneHubSunoLoaded) return;
  window.__oneHubSunoLoaded = true;

  console.log('[ONE-Hub Bridge] Suno content script loaded');

  const SELECTORS = {
    descriptionInput: 'textarea[placeholder*="description"]',
    lyricsInput: 'textarea[placeholder*="lyrics"]',
    styleInput: 'input[placeholder*="style"]',
    createButton: 'button:has-text("Create")',
    createButtonAlt: '[data-testid="create-button"]',
    generatedTracks: '[data-track-id]',
    audioPlayer: 'audio',
    downloadButton: 'button[aria-label="Download"]',
    extendButton: 'button:has-text("Extend")',
    loadingIndicator: '[class*="loading"]',
    progressBar: '.progress-bar',
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
        return waitForGeneration(message.config);
      default:
        return null;
    }
  }

  function extractData(config) {
    const results = {};

    for (const rule of config.rules || []) {
      switch (rule.id) {
        case 'generated-tracks':
          results[rule.id] = getGeneratedTracks();
          break;
        case 'audio-url':
          const audio = document.querySelector(SELECTORS.audioPlayer);
          const source = audio?.querySelector('source');
          results[rule.id] = source?.src || audio?.src || null;
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

  function getGeneratedTracks() {
    const tracks = document.querySelectorAll(SELECTORS.generatedTracks);
    return Array.from(tracks).map(track => ({
      id: track.getAttribute('data-track-id'),
      title: track.querySelector('.track-title')?.textContent?.trim(),
      audioUrl: track.querySelector('audio source')?.src,
    }));
  }

  async function injectData(config, data) {
    for (const target of config.targets || []) {
      const value = data[target.id] || data[target.name];
      if (!value) continue;

      let input;
      switch (target.id) {
        case 'song-description':
          input = document.querySelector(SELECTORS.descriptionInput);
          break;
        case 'lyrics-input':
          input = document.querySelector(SELECTORS.lyricsInput);
          break;
        case 'style-input':
          input = document.querySelector(SELECTORS.styleInput);
          break;
        default:
          input = document.querySelector(target.selector);
      }

      if (input) {
        input.focus();
        input.value = value;
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }
    }

    return { success: true };
  }

  async function executeAction(action) {
    switch (action.id) {
      case 'create':
        const createBtn = findButton(['Create', 'Generate']);
        createBtn?.click();
        return { success: !!createBtn };

      case 'download-audio':
        document.querySelector(SELECTORS.downloadButton)?.click();
        return { success: true };

      case 'extend-song':
        const extendBtn = findButton(['Extend', 'Continue']);
        extendBtn?.click();
        return { success: !!extendBtn };

      default:
        if (action.selector) {
          document.querySelector(action.selector)?.click();
          return { success: true };
        }
        return { success: false, error: 'Unknown action' };
    }
  }

  function findButton(texts) {
    for (const text of texts) {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes(text)) {
          return btn;
        }
      }
    }
    return null;
  }

  async function waitForGeneration(config) {
    const timeout = config.timeout || 180000; // 3 minutes for audio gen
    const startTime = Date.now();
    let lastTrackCount = document.querySelectorAll(SELECTORS.generatedTracks).length;

    while (Date.now() - startTime < timeout) {
      // Check for loading/progress
      const loading = document.querySelector(SELECTORS.loadingIndicator);
      const progress = document.querySelector(SELECTORS.progressBar);

      if (!loading && !progress) {
        const currentTracks = document.querySelectorAll(SELECTORS.generatedTracks);
        if (currentTracks.length > lastTrackCount) {
          // New track generated
          const tracks = getGeneratedTracks();
          return {
            success: true,
            detected: true,
            tracks,
            newTrack: tracks[tracks.length - 1],
          };
        }
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    return {
      success: true,
      detected: false,
      timedOut: true,
      tracks: getGeneratedTracks(),
    };
  }

  chrome.runtime.sendMessage({ type: 'content-ready', provider: 'suno' });
})();
