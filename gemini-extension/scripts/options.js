// Options script for Gemini Assistant

const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('modelSelect');
const customInstructionsText = document.getElementById('customInstructions');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');

// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['geminiApiKey', 'geminiModel', 'customInstructions'], (items) => {
    apiKeyInput.value = items.geminiApiKey || '';
    modelSelect.value = items.geminiModel || 'gemini-1.5-flash';
    customInstructionsText.value = items.customInstructions || '';
  });
});

// Save settings
saveBtn.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;
  const instructions = customInstructionsText.value.trim();

  if (!apiKey) {
    statusDiv.innerText = 'Error: API Key is required.';
    return;
  }

  chrome.storage.sync.set({
    geminiApiKey: apiKey,
    geminiModel: model,
    customInstructions: instructions
  }, () => {
    statusDiv.innerText = 'Settings saved!';
    setTimeout(() => {
      statusDiv.innerText = '';
    }, 3000);
  });
});
