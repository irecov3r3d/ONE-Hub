// Sidebar script for Gemini Assistant

// State management
let chatHistory = [];
let selectedTabsContext = [];
let pendingImage = null;
let pendingMimeType = null;

// DOM Elements
const chatHistoryDiv = document.getElementById('chatHistory');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const clearChatBtn = document.getElementById('clearChat');
const tabListDiv = document.getElementById('tabList');
const refreshTabsBtn = document.getElementById('refreshTabs');
const feedTabsBtn = document.getElementById('feedSelectedTabs');
const loadingDiv = document.getElementById('loading');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImageBtn = document.getElementById('removeImage');
const autoContextToggle = document.getElementById('autoContext');

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
  loadTabsInGroup();
  checkPendingActions();

  // Load auto-context setting
  chrome.storage.local.get(['autoContext'], (result) => {
    if (result.autoContext !== undefined) {
      autoContextToggle.checked = result.autoContext;
    }
  });
});

autoContextToggle.addEventListener('change', () => {
  chrome.storage.local.set({ autoContext: autoContextToggle.checked });
});

// Handle incoming messages from background context menus
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CONTEXT_ACTION') {
    handleContextAction(message);
  }
});

async function checkPendingActions() {
  const { pendingAction } = await chrome.storage.local.get(['pendingAction']);
  if (pendingAction && (Date.now() - pendingAction.timestamp < 10000)) {
    handleContextAction(pendingAction);
    chrome.storage.local.remove(['pendingAction']);
  }
}

function handleContextAction(actionData) {
  if (actionData.action === 'summarize') {
    userInput.value = `Summarize this text: \n\n${actionData.text}`;
  } else if (actionData.action === 'rewrite') {
    userInput.value = `Rewrite this text for clarity and impact: \n\n${actionData.text}`;
  } else if (actionData.action === 'snapshot') {
    if (actionData.base64Data) {
      pendingImage = actionData.base64Data;
      pendingMimeType = actionData.mimeType;
      previewImg.src = `data:${pendingMimeType};base64,${pendingImage}`;
      imagePreview.classList.remove('hidden');
      userInput.value = "Describe this image.";
    }
  }
}

// Tab Management
async function loadTabsInGroup() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab && activeTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
    const tabsInGroup = await chrome.tabs.query({ groupId: activeTab.groupId });
    displayTabs(tabsInGroup);
  } else {
    tabListDiv.innerHTML = '<div class="tab-item">No active tab group detected.</div>';
  }
}

function displayTabs(tabs) {
  tabListDiv.innerHTML = '';
  tabs.forEach(tab => {
    const div = document.createElement('div');
    div.className = 'tab-item';
    div.innerHTML = `
      <input type="checkbox" id="tab-${tab.id}" data-id="${tab.id}" data-url="${tab.url}" data-title="${tab.title}">
      <label for="tab-${tab.id}">${tab.title}</label>
    `;
    tabListDiv.appendChild(div);
  });
}

refreshTabsBtn.addEventListener('click', loadTabsInGroup);

async function getTabsContext(specificTabIds = null) {
  let tabsToFetch = [];
  if (specificTabIds) {
    tabsToFetch = await Promise.all(specificTabIds.map(id => chrome.tabs.get(id)));
  } else if (autoContextToggle.checked) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      tabsToFetch = await chrome.tabs.query({ groupId: activeTab.groupId });
    }
  }

  if (tabsToFetch.length === 0) return [];

  const tabContexts = [];
  for (const tab of tabsToFetch) {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText
      });
      tabContexts.push({
        title: tab.title,
        url: tab.url,
        content: result.substring(0, 5000)
      });
    } catch (err) {
      console.error(`Could not read tab ${tab.id}:`, err);
    }
  }
  return tabContexts;
}

feedTabsBtn.addEventListener('click', async () => {
  const checkboxes = tabListDiv.querySelectorAll('input[type="checkbox"]:checked');
  const tabIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));

  if (tabIds.length === 0) {
    addMessage('system', 'Please select some tabs to feed.');
    return;
  }

  selectedTabsContext = await getTabsContext(tabIds);
  addMessage('system', `Loaded context from ${selectedTabsContext.length} tabs.`);
});

// Chat Logic
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text && !pendingImage) return;

  // Visual feedback for user
  const userMsgImg = pendingImage ? `data:${pendingMimeType};base64,${pendingImage}` : null;
  addMessage('user', text, userMsgImg);

  userInput.value = '';
  const imageToUpload = pendingImage;
  const imageMime = pendingMimeType;
  clearImagePreview();

  loadingDiv.classList.remove('hidden');

  // Gather auto-context if enabled
  let finalTabContext = [...selectedTabsContext];
  if (autoContextToggle.checked) {
    const autoContext = await getTabsContext();
    finalTabContext = [...finalTabContext, ...autoContext];
    // Deduplicate by URL
    finalTabContext = Array.from(new Map(finalTabContext.map(item => [item.url, item])).values());
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CALL_GEMINI',
      payload: {
        prompt: text,
        history: chatHistory,
        imageContent: imageToUpload,
        mimeType: imageMime,
        tabContents: finalTabContext
      }
    });

    loadingDiv.classList.add('hidden');

    if (response.success) {
      const aiResponse = response.data.candidates[0].content.parts[0].text;
      addMessage('assistant', aiResponse);

      // Update history
      chatHistory.push({ role: "user", parts: [{ text }] });
      chatHistory.push({ role: "model", parts: [{ text: aiResponse }] });
    } else {
      addMessage('system', `Error: ${response.error}`);
    }
  } catch (err) {
    loadingDiv.classList.add('hidden');
    addMessage('system', `Error: ${err.message}`);
  }
}

function addMessage(role, text, image = null) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;

  if (image) {
    const img = document.createElement('img');
    img.src = image;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    img.style.marginBottom = '5px';
    msgDiv.appendChild(img);
  }

  const textNode = document.createElement('div');
  textNode.innerText = text;
  msgDiv.appendChild(textNode);

  chatHistoryDiv.appendChild(msgDiv);
  chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

function clearImagePreview() {
  pendingImage = null;
  pendingMimeType = null;
  imagePreview.classList.add('hidden');
  previewImg.src = '';
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

clearChatBtn.addEventListener('click', () => {
  chatHistory = [];
  chatHistoryDiv.innerHTML = '<div class="message system">Chat cleared.</div>';
});

removeImageBtn.addEventListener('click', clearImagePreview);
