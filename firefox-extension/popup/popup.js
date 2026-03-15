/**
 * Teach & Repeat - Popup Script
 */

// State
let state = {
  isRecording: false,
  isPlaying: false,
  currentMacroId: null,
  macros: {},
  recordingStartTime: null
};

let recordingTimer = null;

// DOM Elements
const elements = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initElements();
  initEventListeners();
  await loadState();
  await loadMacros();
  updateUI();
});

// Initialize DOM element references
function initElements() {
  // Status bar
  elements.statusBar = document.getElementById('statusBar');
  elements.statusText = elements.statusBar.querySelector('.status-text');

  // Tabs
  elements.tabs = document.querySelectorAll('.tab');
  elements.tabContents = document.querySelectorAll('.tab-content');

  // Record tab
  elements.recordingName = document.getElementById('recordingName');
  elements.startRecordBtn = document.getElementById('startRecordBtn');
  elements.stopRecordBtn = document.getElementById('stopRecordBtn');
  elements.recordingStats = document.getElementById('recordingStats');
  elements.eventCount = document.getElementById('eventCount');
  elements.duration = document.getElementById('duration');

  // Macros tab
  elements.macrosList = document.getElementById('macrosList');
  elements.refreshMacrosBtn = document.getElementById('refreshMacrosBtn');

  // AI Chat tab
  elements.targetClaude = document.getElementById('targetClaude');
  elements.targetChatGPT = document.getElementById('targetChatGPT');
  elements.targetCopilot = document.getElementById('targetCopilot');
  elements.promptInput = document.getElementById('promptInput');
  elements.sendToAiBtn = document.getElementById('sendToAiBtn');
  elements.aiResponses = document.getElementById('aiResponses');
  elements.responsesList = document.getElementById('responsesList');

  // Settings
  elements.settingsBtn = document.getElementById('settingsBtn');
}

// Initialize event listeners
function initEventListeners() {
  // Tab navigation
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Record controls
  elements.startRecordBtn.addEventListener('click', startRecording);
  elements.stopRecordBtn.addEventListener('click', stopRecording);

  // Macros
  elements.refreshMacrosBtn.addEventListener('click', loadMacros);

  // AI Chat
  elements.sendToAiBtn.addEventListener('click', sendToAiChats);

  // Settings
  elements.settingsBtn.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });

  // Listen for background messages
  browser.runtime.onMessage.addListener(handleBackgroundMessage);
}

// Handle messages from background script
function handleBackgroundMessage(message) {
  switch (message.type) {
    case 'RECORDING_STARTED':
      state.isRecording = true;
      state.recordingStartTime = Date.now();
      updateUI();
      break;

    case 'RECORDING_STOPPED':
      state.isRecording = false;
      stopRecordingTimer();
      loadMacros();
      updateUI();
      break;

    case 'PLAYBACK_COMPLETE':
      state.isPlaying = false;
      updateUI();
      break;

    case 'ALL_AI_RESPONSES_READY':
      displayAiResponses(message.responses);
      break;
  }
}

// Load current state from background
async function loadState() {
  try {
    const response = await browser.runtime.sendMessage({ type: 'GET_STATE' });
    state.isRecording = response.isRecording;
    state.isPlaying = response.isPlaying;
    state.currentMacroId = response.currentMacroId;

    if (state.isRecording) {
      state.recordingStartTime = Date.now();
      startRecordingTimer();
    }
  } catch (err) {
    console.error('Failed to load state:', err);
  }
}

// Load macros from storage
async function loadMacros() {
  try {
    const response = await browser.runtime.sendMessage({ type: 'GET_MACROS' });
    state.macros = response.macros || {};
    renderMacrosList();
  } catch (err) {
    console.error('Failed to load macros:', err);
  }
}

// Switch tabs
function switchTab(tabName) {
  elements.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}Tab`);
  });
}

// Start recording
async function startRecording() {
  const name = elements.recordingName.value.trim() || 'New Recording';

  try {
    // Get current tab
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    // Send start recording message
    await browser.runtime.sendMessage({
      type: 'START_RECORDING',
      name,
      tabId: tab.id,
      url: tab.url
    });

    // Notify content script
    await browser.tabs.sendMessage(tab.id, {
      type: 'RECORDING_STARTED'
    });

    state.isRecording = true;
    state.recordingStartTime = Date.now();
    startRecordingTimer();
    updateUI();

  } catch (err) {
    console.error('Failed to start recording:', err);
    showError('Failed to start recording: ' + err.message);
  }
}

// Stop recording
async function stopRecording() {
  try {
    await browser.runtime.sendMessage({ type: 'STOP_RECORDING' });

    state.isRecording = false;
    stopRecordingTimer();
    await loadMacros();
    updateUI();

    // Switch to macros tab
    switchTab('macros');

  } catch (err) {
    console.error('Failed to stop recording:', err);
    showError('Failed to stop recording: ' + err.message);
  }
}

// Start recording timer
function startRecordingTimer() {
  recordingTimer = setInterval(updateRecordingStats, 1000);
  elements.recordingStats.classList.remove('hidden');
}

// Stop recording timer
function stopRecordingTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
  elements.recordingStats.classList.add('hidden');
}

// Update recording stats display
function updateRecordingStats() {
  if (!state.recordingStartTime) return;

  const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  elements.duration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Play a macro
async function playMacro(macroId) {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    await browser.runtime.sendMessage({
      type: 'PLAY_MACRO',
      macroId,
      tabIds: [tab.id],
      options: {
        speed: 1.0
      }
    });

    state.isPlaying = true;
    updateUI();

    // Close popup to see playback
    window.close();

  } catch (err) {
    console.error('Failed to play macro:', err);
    showError('Failed to play macro: ' + err.message);
  }
}

// Delete a macro
async function deleteMacro(macroId) {
  if (!confirm('Are you sure you want to delete this macro?')) return;

  try {
    await browser.runtime.sendMessage({
      type: 'DELETE_MACRO',
      macroId
    });

    await loadMacros();
  } catch (err) {
    console.error('Failed to delete macro:', err);
    showError('Failed to delete macro: ' + err.message);
  }
}

// Render macros list
function renderMacrosList() {
  const macros = Object.values(state.macros);

  if (macros.length === 0) {
    elements.macrosList.innerHTML = `
      <div class="empty-state">
        <p>No macros yet</p>
        <p class="hint">Record your first macro to get started</p>
      </div>
    `;
    return;
  }

  // Sort by creation date (newest first)
  macros.sort((a, b) => b.createdAt - a.createdAt);

  elements.macrosList.innerHTML = macros.map(macro => {
    const date = new Date(macro.createdAt).toLocaleDateString();
    const eventCount = macro.events?.length || 0;
    const duration = macro.duration ? formatDuration(macro.duration) : 'N/A';

    return `
      <div class="macro-item" data-id="${macro.id}">
        <div class="macro-item-header">
          <span class="macro-name">${escapeHtml(macro.name)}</span>
          <div class="macro-actions">
            <button class="icon-btn delete-macro" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="macro-meta">
          <span>${eventCount} events</span>
          <span>${duration}</span>
          <span>${date}</span>
        </div>
        <div class="macro-controls">
          <button class="btn btn-play play-macro">
            <span>Play</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners to macro items
  elements.macrosList.querySelectorAll('.play-macro').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const macroId = e.target.closest('.macro-item').dataset.id;
      playMacro(macroId);
    });
  });

  elements.macrosList.querySelectorAll('.delete-macro').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const macroId = e.target.closest('.macro-item').dataset.id;
      deleteMacro(macroId);
    });
  });
}

// Send prompt to AI chats
async function sendToAiChats() {
  const prompt = elements.promptInput.value.trim();
  if (!prompt) {
    showError('Please enter a prompt');
    return;
  }

  const targets = [];
  if (elements.targetClaude.checked) targets.push('claude');
  if (elements.targetChatGPT.checked) targets.push('chatgpt');
  if (elements.targetCopilot.checked) targets.push('copilot');

  if (targets.length === 0) {
    showError('Please select at least one AI chat');
    return;
  }

  elements.sendToAiBtn.disabled = true;
  elements.sendToAiBtn.textContent = 'Sending...';

  try {
    const response = await browser.runtime.sendMessage({
      type: 'SEND_TO_AI_CHATS',
      prompt,
      targets
    });

    if (response.success) {
      elements.aiResponses.classList.remove('hidden');
      elements.responsesList.innerHTML = `
        <div class="response-item">
          <div class="response-content">Waiting for responses from ${targets.join(', ')}...</div>
        </div>
      `;
    } else {
      showError('Failed to send: ' + response.error);
    }

  } catch (err) {
    console.error('Failed to send to AI chats:', err);
    showError('Failed to send: ' + err.message);
  } finally {
    elements.sendToAiBtn.disabled = false;
    elements.sendToAiBtn.innerHTML = `
      <span>Send to AI Chats</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;
  }
}

// Display AI responses
function displayAiResponses(responses) {
  elements.aiResponses.classList.remove('hidden');

  elements.responsesList.innerHTML = Object.entries(responses).map(([chatKey, data]) => {
    const time = new Date(data.receivedAt).toLocaleTimeString();
    const text = data.response?.text || 'No response';

    return `
      <div class="response-item">
        <div class="response-header">
          <span class="response-source ${chatKey}">${chatKey.charAt(0).toUpperCase() + chatKey.slice(1)}</span>
          <span class="response-time">${time}</span>
        </div>
        <div class="response-content">${escapeHtml(text.substring(0, 500))}${text.length > 500 ? '...' : ''}</div>
        <div class="response-actions">
          <button class="btn copy-response" data-text="${escapeHtml(text)}">Copy</button>
        </div>
      </div>
    `;
  }).join('');

  // Add copy listeners
  elements.responsesList.querySelectorAll('.copy-response').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.text;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    });
  });
}

// Update UI based on state
function updateUI() {
  // Update status bar
  elements.statusBar.classList.remove('recording', 'playing');

  if (state.isRecording) {
    elements.statusBar.classList.add('recording');
    elements.statusText.textContent = 'Recording...';
  } else if (state.isPlaying) {
    elements.statusBar.classList.add('playing');
    elements.statusText.textContent = 'Playing...';
  } else {
    elements.statusText.textContent = 'Ready';
  }

  // Update record buttons
  elements.startRecordBtn.disabled = state.isRecording;
  elements.stopRecordBtn.disabled = !state.isRecording;

  if (state.isRecording) {
    elements.recordingStats.classList.remove('hidden');
  } else {
    elements.recordingStats.classList.add('hidden');
  }
}

// Helper: Format duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Helper: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper: Show error message
function showError(message) {
  alert(message); // Simple error display for now
}
