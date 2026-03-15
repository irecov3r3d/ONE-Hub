/**
 * Teach & Repeat - Options Page Script
 */

// Default settings
const DEFAULT_SETTINGS = {
  playbackSpeed: 1.0,
  captureMouseMove: false,
  captureScroll: true,
  captureClipboard: true,
  highlightElements: true,
  defaultDelay: 100,
  aiChats: ['claude', 'chatgpt']
};

// Load settings when page opens
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  initEventListeners();
});

// Initialize event listeners
function initEventListeners() {
  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', resetSettings);

  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportMacros);

  // Import button
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', importMacros);

  // Clear button
  document.getElementById('clearBtn').addEventListener('click', clearAllMacros);
}

// Load settings from storage
async function loadSettings() {
  try {
    const { settings } = await browser.storage.local.get('settings');
    const currentSettings = { ...DEFAULT_SETTINGS, ...settings };

    // Apply to form
    document.getElementById('captureMouseMove').checked = currentSettings.captureMouseMove;
    document.getElementById('captureScroll').checked = currentSettings.captureScroll;
    document.getElementById('captureClipboard').checked = currentSettings.captureClipboard;
    document.getElementById('highlightElements').checked = currentSettings.highlightElements;
    document.getElementById('playbackSpeed').value = currentSettings.playbackSpeed;
    document.getElementById('defaultDelay').value = currentSettings.defaultDelay;

    // Set AI chats multi-select
    const aiChatsSelect = document.getElementById('aiChats');
    Array.from(aiChatsSelect.options).forEach(option => {
      option.selected = currentSettings.aiChats.includes(option.value);
    });

  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    const settings = {
      captureMouseMove: document.getElementById('captureMouseMove').checked,
      captureScroll: document.getElementById('captureScroll').checked,
      captureClipboard: document.getElementById('captureClipboard').checked,
      highlightElements: document.getElementById('highlightElements').checked,
      playbackSpeed: parseFloat(document.getElementById('playbackSpeed').value),
      defaultDelay: parseInt(document.getElementById('defaultDelay').value),
      aiChats: Array.from(document.getElementById('aiChats').selectedOptions).map(o => o.value)
    };

    await browser.storage.local.set({ settings });
    showToast('Settings saved!');

  } catch (err) {
    console.error('Failed to save settings:', err);
    showToast('Failed to save settings', true);
  }
}

// Reset to default settings
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) return;

  try {
    await browser.storage.local.set({ settings: DEFAULT_SETTINGS });
    await loadSettings();
    showToast('Settings reset to defaults');

  } catch (err) {
    console.error('Failed to reset settings:', err);
    showToast('Failed to reset settings', true);
  }
}

// Export all macros
async function exportMacros() {
  try {
    const { macros } = await browser.storage.local.get('macros');

    if (!macros || Object.keys(macros).length === 0) {
      showToast('No macros to export', true);
      return;
    }

    const data = JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      macros
    }, null, 2);

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `teach-repeat-macros-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Macros exported successfully');

  } catch (err) {
    console.error('Failed to export macros:', err);
    showToast('Failed to export macros', true);
  }
}

// Import macros
async function importMacros(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.macros) {
      throw new Error('Invalid file format');
    }

    const { macros: existingMacros } = await browser.storage.local.get('macros');
    const merged = { ...existingMacros, ...data.macros };

    await browser.storage.local.set({ macros: merged });

    const importedCount = Object.keys(data.macros).length;
    showToast(`Imported ${importedCount} macro(s)`);

  } catch (err) {
    console.error('Failed to import macros:', err);
    showToast('Failed to import macros: ' + err.message, true);
  }

  // Clear file input
  event.target.value = '';
}

// Clear all macros
async function clearAllMacros() {
  if (!confirm('Are you sure you want to delete ALL macros? This cannot be undone.')) return;

  try {
    await browser.storage.local.set({ macros: {} });
    showToast('All macros deleted');

  } catch (err) {
    console.error('Failed to clear macros:', err);
    showToast('Failed to clear macros', true);
  }
}

// Show toast notification
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.background = isError ? '#dc3545' : '#28a745';
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
