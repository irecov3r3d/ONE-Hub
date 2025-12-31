// ONE-Hub AI Bridge - Popup Script

const PROVIDER_ICONS = {
  chatgpt: '💬',
  claude: '🧠',
  gemini: '✨',
  suno: '🎵',
  discord: '🎮',
  midjourney: '🎨',
  default: '🔗',
};

const PROVIDER_NAMES = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  suno: 'Suno AI',
  discord: 'Discord',
  midjourney: 'Midjourney',
};

document.addEventListener('DOMContentLoaded', async () => {
  await refreshStatus();

  document.getElementById('openAppBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });

  document.getElementById('refreshBtn').addEventListener('click', refreshStatus);
});

async function refreshStatus() {
  try {
    // Get registered tabs from background
    const response = await chrome.runtime.sendMessage({ type: 'get-status' });

    updateConnectionStatus(response?.connected);
    updateTabsList(response?.tabs || []);
  } catch (error) {
    console.error('Error refreshing status:', error);
    updateConnectionStatus(false);
    updateTabsList([]);
  }
}

function updateConnectionStatus(connected) {
  const dot = document.getElementById('connectionDot');
  const status = document.getElementById('connectionStatus');

  if (connected) {
    dot.className = 'status-dot connected';
    status.textContent = 'Connected';
  } else {
    dot.className = 'status-dot disconnected';
    status.textContent = 'Disconnected';
  }
}

function updateTabsList(tabs) {
  const container = document.getElementById('tabsList');
  const countEl = document.getElementById('activeTabCount');

  countEl.textContent = tabs.length.toString();

  if (tabs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📑</div>
        <div>No tabs registered</div>
      </div>
    `;
    return;
  }

  container.innerHTML = tabs.map(tab => {
    const icon = PROVIDER_ICONS[tab.provider] || PROVIDER_ICONS.default;
    const name = PROVIDER_NAMES[tab.provider] || tab.provider || 'Unknown';
    const statusClass = tab.status === 'ready' ? 'connected' : 'pending';

    return `
      <div class="tab-item">
        <div class="tab-icon">${icon}</div>
        <div class="tab-info">
          <div class="tab-name">${name}</div>
          <div class="tab-url">${truncateUrl(tab.url)}</div>
        </div>
        <div class="tab-status status-dot ${statusClass}"></div>
      </div>
    `;
  }).join('');
}

function truncateUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname.slice(0, 20) : '');
  } catch {
    return url.slice(0, 30);
  }
}

// Listen for status updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'status-update') {
    refreshStatus();
  }
});
