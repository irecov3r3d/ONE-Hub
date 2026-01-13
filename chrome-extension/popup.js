// DOM Elements
const promptInput = document.getElementById('prompt');
const genreSelect = document.getElementById('genre');
const moodSelect = document.getElementById('mood');
const durationSlider = document.getElementById('duration');
const durationValue = document.getElementById('durationValue');
const strategySelect = document.getElementById('strategy');
const generateBtn = document.getElementById('generateBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const statusDiv = document.getElementById('status');
const progressInfo = document.getElementById('progressInfo');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultDiv = document.getElementById('result');
const audioPlayer = document.getElementById('audioPlayer');
const modelNameSpan = document.getElementById('modelName');
const qualityScoreSpan = document.getElementById('qualityScore');
const genTimeSpan = document.getElementById('genTime');
const genCostSpan = document.getElementById('genCost');
const downloadBtn = document.getElementById('downloadBtn');
const openFullBtn = document.getElementById('openFullBtn');
const libraryBtn = document.getElementById('libraryBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Configuration
let API_BASE_URL = 'http://localhost:3000';

// Load saved configuration
chrome.storage.sync.get(['apiBaseUrl'], (result) => {
  if (result.apiBaseUrl) {
    API_BASE_URL = result.apiBaseUrl;
  }
});

// Update duration value display
durationSlider.addEventListener('input', (e) => {
  durationValue.textContent = `${e.target.value}s`;
});

// Settings button
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Library button
libraryBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${API_BASE_URL}` });
});

// Open full app button
openFullBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${API_BASE_URL}` });
});

// Generate button
generateBtn.addEventListener('click', async () => {
  const prompt = promptInput.value.trim();

  if (!prompt) {
    showStatus('Please describe the song you want to create', 'error');
    return;
  }

  // Disable button and show loading
  generateBtn.disabled = true;
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  resultDiv.classList.add('hidden');
  statusDiv.classList.add('hidden');

  // Show progress
  progressInfo.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressText.textContent = 'Initializing...';

  try {
    // Prepare request data
    const requestData = {
      prompt,
      genre: genreSelect.value,
      mood: moodSelect.value,
      duration: parseInt(durationSlider.value),
      strategy: strategySelect.value
    };

    // Start progress simulation
    simulateProgress();

    // Make API request
    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();

    // Complete progress
    progressFill.style.width = '100%';
    progressText.textContent = 'Complete!';

    // Hide progress after a moment
    setTimeout(() => {
      progressInfo.classList.add('hidden');
    }, 1000);

    // Display result
    displayResult(data);
    showStatus('Music generated successfully!', 'success');

    // Save to history
    saveToHistory(requestData, data);

  } catch (error) {
    console.error('Generation error:', error);
    showStatus(`Error: ${error.message}`, 'error');
    progressInfo.classList.add('hidden');
  } finally {
    // Re-enable button
    generateBtn.disabled = false;
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
  }
});

// Simulate progress for better UX
function simulateProgress() {
  let progress = 0;
  const interval = setInterval(() => {
    if (progress < 90) {
      progress += Math.random() * 10;
      progress = Math.min(progress, 90);
      progressFill.style.width = `${progress}%`;

      // Update progress text based on progress
      if (progress < 30) {
        progressText.textContent = 'Analyzing prompt...';
      } else if (progress < 60) {
        progressText.textContent = 'Generating audio with AI models...';
      } else {
        progressText.textContent = 'Finalizing your track...';
      }
    } else {
      clearInterval(interval);
    }
  }, 500);

  // Store interval to clear it later if needed
  window.progressInterval = interval;
}

// Display result
function displayResult(data) {
  // Clear any existing progress interval
  if (window.progressInterval) {
    clearInterval(window.progressInterval);
  }

  // Get the best result
  const result = data.results && data.results.length > 0 ? data.results[0] : data;

  // Set audio source
  audioPlayer.src = result.audioUrl || result.audio_url || '';

  // Display metadata
  modelNameSpan.textContent = result.modelName || result.model_name || 'Unknown';
  qualityScoreSpan.textContent = result.qualityScore
    ? (result.qualityScore * 100).toFixed(1) + '%'
    : result.quality_score
    ? (result.quality_score * 100).toFixed(1) + '%'
    : 'N/A';
  genTimeSpan.textContent = result.generationTime
    ? formatTime(result.generationTime)
    : result.generation_time
    ? formatTime(result.generation_time)
    : 'N/A';
  genCostSpan.textContent = result.cost
    ? `$${result.cost.toFixed(3)}`
    : 'N/A';

  // Store current result for download
  window.currentResult = result;

  // Show result section
  resultDiv.classList.remove('hidden');
}

// Download button
downloadBtn.addEventListener('click', async () => {
  if (!window.currentResult || !window.currentResult.audioUrl) {
    showStatus('No audio to download', 'error');
    return;
  }

  try {
    const audioUrl = window.currentResult.audioUrl;
    const filename = `onehub-music-${Date.now()}.mp3`;

    // Use Chrome downloads API
    chrome.downloads.download({
      url: audioUrl,
      filename: filename,
      saveAs: true
    });

    showStatus('Download started!', 'success');
  } catch (error) {
    console.error('Download error:', error);
    showStatus('Failed to download audio', 'error');
  }
});

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');

  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 3000);
  }
}

// Format time in seconds to readable format
function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

// Save to history
function saveToHistory(request, response) {
  chrome.storage.local.get(['musicHistory'], (result) => {
    const history = result.musicHistory || [];

    history.unshift({
      timestamp: Date.now(),
      request,
      response,
      audioUrl: response.results && response.results[0]
        ? response.results[0].audioUrl
        : response.audioUrl
    });

    // Keep only last 20 items
    if (history.length > 20) {
      history.length = 20;
    }

    chrome.storage.local.set({ musicHistory: history });
  });
}

// Load last settings
chrome.storage.local.get(['lastSettings'], (result) => {
  if (result.lastSettings) {
    const settings = result.lastSettings;
    if (settings.genre) genreSelect.value = settings.genre;
    if (settings.mood) moodSelect.value = settings.mood;
    if (settings.duration) {
      durationSlider.value = settings.duration;
      durationValue.textContent = `${settings.duration}s`;
    }
    if (settings.strategy) strategySelect.value = settings.strategy;
  }
});

// Save settings on change
function saveSettings() {
  const settings = {
    genre: genreSelect.value,
    mood: moodSelect.value,
    duration: parseInt(durationSlider.value),
    strategy: strategySelect.value
  };
  chrome.storage.local.set({ lastSettings: settings });
}

genreSelect.addEventListener('change', saveSettings);
moodSelect.addEventListener('change', saveSettings);
durationSlider.addEventListener('change', saveSettings);
strategySelect.addEventListener('change', saveSettings);

// Add permission for downloads
chrome.permissions.contains({
  permissions: ['downloads']
}, (result) => {
  if (!result) {
    // Request permission when needed
    downloadBtn.addEventListener('click', () => {
      chrome.permissions.request({
        permissions: ['downloads']
      });
    }, { once: true });
  }
});
