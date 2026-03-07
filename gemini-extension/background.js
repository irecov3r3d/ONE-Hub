// Background script for Gemini Assistant

// Context menu IDs
const MENU_SUMMARIZE = 'summarize';
const MENU_REWRITE = 'rewrite';
const MENU_SNAPSHOT = 'snapshot';

// Initialize context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_SUMMARIZE,
    title: 'Summarize Selection',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: MENU_REWRITE,
    title: 'Rewrite Selection',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: MENU_SNAPSHOT,
    title: 'Snapshot this Image',
    contexts: ['image']
  });

  // Default configuration
  chrome.storage.sync.get(['geminiModel', 'customInstructions'], (items) => {
    chrome.storage.sync.set({
      geminiModel: items.geminiModel || 'gemini-1.5-flash',
      customInstructions: items.customInstructions || ''
    });
  });
});

// Handle side panel behavior
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Helper function to fetch image and convert to base64
async function getBase64Image(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({
        data: reader.result.split(',')[1],
        mimeType: blob.type
      });
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

// Function to send message to sidepanel with retry
async function sendMessageToSidepanel(message) {
  let retries = 5;
  while (retries > 0) {
    try {
      await chrome.runtime.sendMessage(message);
      return true;
    } catch (err) {
      retries--;
      if (retries > 0) await new Promise(r => setTimeout(r, 200));
    }
  }
  return false;
}

// Context menu click listener
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_SUMMARIZE || info.menuItemId === MENU_REWRITE) {
    chrome.sidePanel.open({ windowId: tab.windowId });

    const messagePayload = {
      type: 'CONTEXT_ACTION',
      action: info.menuItemId,
      text: info.selectionText
    };

    // Store in storage immediately as primary source
    chrome.storage.local.set({
      pendingAction: {
        ...messagePayload,
        timestamp: Date.now()
      }
    });

    // Try to send message as well
    sendMessageToSidepanel(messagePayload);

  } else if (info.menuItemId === MENU_SNAPSHOT) {
    chrome.sidePanel.open({ windowId: tab.windowId });

    // Fetch and convert image to base64
    const imageData = await getBase64Image(info.srcUrl);

    const messagePayload = {
      type: 'CONTEXT_ACTION',
      action: MENU_SNAPSHOT,
      imageUrl: info.srcUrl,
      base64Data: imageData?.data,
      mimeType: imageData?.mimeType
    };

    chrome.storage.local.set({
      pendingAction: {
        ...messagePayload,
        timestamp: Date.now()
      }
    });

    sendMessageToSidepanel(messagePayload);
  }
});

// Handle communication with Gemini API
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CALL_GEMINI') {
    handleGeminiCall(message.payload)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // async
  }
});

async function handleGeminiCall({ prompt, history, imageContent, tabContents, mimeType }) {
  const { geminiApiKey, geminiModel, customInstructions } = await chrome.storage.sync.get([
    'geminiApiKey',
    'geminiModel',
    'customInstructions'
  ]);

  if (!geminiApiKey) {
    throw new Error('Gemini API Key is missing. Please set it in the extension options.');
  }

  const model = geminiModel || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

  // Format history for Gemini API
  const contents = history ? [...history] : [];

  // Create current message part
  const parts = [];

  // Add tab context if available
  if (tabContents && tabContents.length > 0) {
    let contextText = "Context from tabs:\n";
    tabContents.forEach(tab => {
      contextText += `--- Tab: ${tab.title} ---\n${tab.content}\n\n`;
    });
    parts.push({ text: contextText });
  }

  // Add image if snapshot
  if (imageContent) {
    parts.push({
      inline_data: {
        mime_type: mimeType || "image/jpeg",
        data: imageContent.split(',')[1] || imageContent
      }
    });
  }

  parts.push({ text: prompt });

  contents.push({
    role: "user",
    parts: parts
  });

  const body = {
    contents: contents
  };

  // Add system instruction if available
  if (customInstructions) {
    body.system_instruction = {
      parts: [{ text: customInstructions }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to call Gemini API');
  }

  const data = await response.json();
  return data;
}
