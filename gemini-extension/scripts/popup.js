// Popup script for Gemini Assistant

// DOM Elements
const quickChatTab = document.getElementById('quickChatTab');
const optimizerTab = document.getElementById('optimizerTab');
const quickChatView = document.getElementById('quickChatView');
const optimizerView = document.getElementById('optimizerView');

const quickInput = document.getElementById('quickInput');
const quickSend = document.getElementById('quickSend');
const quickResult = document.getElementById('quickResult');

const optInput = document.getElementById('optInput');
const optimizeBtn = document.getElementById('optimizeBtn');
const optResult = document.getElementById('optResult');
const optimizedText = document.getElementById('optimizedText');
const copyBtn = document.getElementById('copyBtn');

const openSidePanel = document.getElementById('openSidePanel');
const statusDiv = document.getElementById('status');

// Tab Switching
quickChatTab.addEventListener('click', () => {
  quickChatTab.classList.add('active');
  optimizerTab.classList.remove('active');
  quickChatView.classList.remove('hidden');
  optimizerView.classList.add('hidden');
});

optimizerTab.addEventListener('click', () => {
  optimizerTab.classList.add('active');
  quickChatTab.classList.remove('active');
  optimizerView.classList.remove('hidden');
  quickChatView.classList.add('hidden');
});

// Quick Chat
quickSend.addEventListener('click', async () => {
  const prompt = quickInput.value.trim();
  if (!prompt) return;

  quickSend.disabled = true;
  quickSend.innerText = 'Sending...';
  quickResult.classList.remove('hidden');
  quickResult.innerText = 'Thinking...';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CALL_GEMINI',
      payload: { prompt }
    });

    if (response.success) {
      quickResult.innerText = response.data.candidates[0].content.parts[0].text;
    } else {
      quickResult.innerText = `Error: ${response.error}`;
    }
  } catch (err) {
    quickResult.innerText = `Error: ${err.message}`;
  } finally {
    quickSend.disabled = false;
    quickSend.innerText = 'Send to Gemini';
  }
});

// Prompt Optimizer
optimizeBtn.addEventListener('click', async () => {
  const prompt = optInput.value.trim();
  if (!prompt) return;

  optimizeBtn.disabled = true;
  optimizeBtn.innerText = 'Optimizing...';
  optResult.classList.add('hidden');

  try {
    const { customInstructions } = await chrome.storage.sync.get(['customInstructions']);
    const optimizationPrompt = `Act as a prompt engineer. Optimize the following request to be more effective for an AI. ${customInstructions ? 'Consider these custom instructions: ' + customInstructions : ''}\n\nUser Request: ${prompt}\n\nOptimized Prompt:`;

    const response = await chrome.runtime.sendMessage({
      type: 'CALL_GEMINI',
      payload: { prompt: optimizationPrompt }
    });

    if (response.success) {
      const optimized = response.data.candidates[0].content.parts[0].text;
      optimizedText.value = optimized;
      optResult.classList.remove('hidden');
    } else {
      statusDiv.innerText = `Error: ${response.error}`;
    }
  } catch (err) {
    statusDiv.innerText = `Error: ${err.message}`;
  } finally {
    optimizeBtn.disabled = false;
    optimizeBtn.innerText = 'Optimize';
  }
});

copyBtn.addEventListener('click', () => {
  optimizedText.select();
  document.execCommand('copy');
  statusDiv.innerText = 'Copied to clipboard!';
  setTimeout(() => statusDiv.innerText = '', 2000);
});

// Side Panel Opening
openSidePanel.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  }
});
