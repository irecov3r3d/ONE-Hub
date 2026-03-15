// Options page JavaScript

// DOM Elements
const apiBaseUrlInput = document.getElementById('apiBaseUrl');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const statusMessage = document.getElementById('statusMessage');

// Default configuration
const DEFAULT_CONFIG = {
  apiBaseUrl: 'http://localhost:3000'
};

// Load saved configuration
function loadConfig() {
  chrome.storage.sync.get(['apiBaseUrl'], (result) => {
    apiBaseUrlInput.value = result.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl;
  });
}

// Save configuration
function saveConfig() {
  const apiBaseUrl = apiBaseUrlInput.value.trim();

  // Validate URL
  if (!apiBaseUrl) {
    showStatus('Please enter a valid API URL', 'error');
    return;
  }

  try {
    new URL(apiBaseUrl); // Validate URL format
  } catch (e) {
    showStatus('Invalid URL format', 'error');
    return;
  }

  // Save to storage
  chrome.storage.sync.set({
    apiBaseUrl: apiBaseUrl
  }, () => {
    showStatus('Settings saved successfully!', 'success');
  });
}

// Reset to defaults
function resetConfig() {
  apiBaseUrlInput.value = DEFAULT_CONFIG.apiBaseUrl;

  chrome.storage.sync.set(DEFAULT_CONFIG, () => {
    showStatus('Settings reset to defaults', 'success');
  });
}

// Clear history
function clearHistory() {
  if (!confirm('Are you sure you want to clear all music generation history?')) {
    return;
  }

  chrome.storage.local.remove(['musicHistory', 'lastSettings'], () => {
    showStatus('History cleared successfully', 'success');
  });
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type} show`;

  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}

// Event listeners
saveBtn.addEventListener('click', saveConfig);
resetBtn.addEventListener('click', resetConfig);
clearHistoryBtn.addEventListener('click', clearHistory);

// Save on Enter key
apiBaseUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveConfig();
  }
});

// Load configuration on page load
loadConfig();
