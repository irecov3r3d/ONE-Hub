// Background service worker for ONE-Hub Chrome Extension

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('ONE-Hub extension installed');

    // Set default configuration
    chrome.storage.sync.set({
      apiBaseUrl: 'http://localhost:3000'
    });

    // Open options page on first install
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    console.log('ONE-Hub extension updated');
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // The popup will open automatically due to default_popup in manifest
  console.log('Extension icon clicked');
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateMusic') {
    handleMusicGeneration(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === 'getHistory') {
    chrome.storage.local.get(['musicHistory'], (result) => {
      sendResponse({ history: result.musicHistory || [] });
    });
    return true;
  }

  if (request.action === 'clearHistory') {
    chrome.storage.local.remove(['musicHistory'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle music generation
async function handleMusicGeneration(data) {
  try {
    // Get API base URL from storage
    const config = await chrome.storage.sync.get(['apiBaseUrl']);
    const apiBaseUrl = config.apiBaseUrl || 'http://localhost:3000';

    // Make API request
    const response = await fetch(`${apiBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Music generation error:', error);
    throw error;
  }
}

// Context menu integration (optional feature)
chrome.contextMenus.create({
  id: 'generateFromSelection',
  title: 'Generate Music from "%s"',
  contexts: ['selection']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'generateFromSelection') {
    // Store selected text and open popup
    chrome.storage.local.set({
      pendingPrompt: info.selectionText
    }, () => {
      chrome.action.openPopup();
    });
  }
});

// Badge management for notifications
function updateBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Clear badge after some time
function clearBadge() {
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 5000);
}

// Listen for download completions
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    console.log('Download complete:', delta.id);
  }
});

// Keep service worker alive (optional, for long-running tasks)
let keepAliveInterval;

function startKeepAlive() {
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // This just keeps the service worker alive
    });
  }, 20000); // Every 20 seconds
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
}

// Start keep-alive when extension loads
startKeepAlive();

// Network state monitoring
let isOnline = true;

self.addEventListener('online', () => {
  isOnline = true;
  console.log('Network connection restored');
});

self.addEventListener('offline', () => {
  isOnline = false;
  console.log('Network connection lost');
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleMusicGeneration,
    updateBadge,
    clearBadge
  };
}
