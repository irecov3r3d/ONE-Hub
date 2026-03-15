# ONE-Hub Chrome Extension

🎵 **AI-Powered Music Generation** - Create amazing music directly from your browser!

This Chrome extension brings the power of ONE-Hub's AI music generation platform right to your browser toolbar. Generate professional-quality music with just a few clicks, without leaving your current tab.

## Features

- 🎼 **Quick Music Generation** - Generate music from text descriptions instantly
- 🎨 **12+ Genres** - Pop, Rock, Hip Hop, Electronic, Jazz, Classical, and more
- 😊 **12+ Moods** - Happy, Sad, Energetic, Chill, Romantic, and more
- ⏱️ **Flexible Duration** - Create tracks from 30 seconds to 5 minutes
- 🤖 **Multi-Model Ensemble** - Choose from multiple AI strategies for best results
- 💾 **Easy Downloads** - Download your generated music with one click
- 📚 **Generation History** - Keep track of all your created tracks
- ⚙️ **Configurable** - Connect to local or remote ONE-Hub servers

## Prerequisites

Before installing the extension, you need:

1. **ONE-Hub Server Running**
   - Either run locally: `cd /home/user/ONE-Hub && npm run dev`
   - Or have access to a deployed ONE-Hub instance

2. **API Keys Configured** (on the server)
   - Replicate API token (required for music generation)
   - Other optional API keys for advanced features

## Installation

### Method 1: Load Unpacked Extension (Development)

1. **Prepare the Extension**
   ```bash
   cd /home/user/ONE-Hub/chrome-extension
   ```

2. **Create Extension Icons** (optional but recommended)

   Option A: Using the provided scripts (if dependencies are available):
   ```bash
   # Try Python script
   python3 generate-icons.py

   # OR try bash script (requires ImageMagick)
   ./generate-icons.sh
   ```

   Option B: Create icons manually:
   - Create 4 PNG images: `icons/icon16.png`, `icons/icon32.png`, `icons/icon48.png`, `icons/icon128.png`
   - Or download placeholders from: https://via.placeholder.com/128x128/667eea/ffffff?text=ONE
   - See `icons/README.md` for detailed instructions

3. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `chrome-extension` directory
   - The extension should now appear in your extensions list!

4. **Pin the Extension** (optional)
   - Click the puzzle icon in Chrome toolbar
   - Find "ONE-Hub - AI Music Generator"
   - Click the pin icon to keep it visible

### Method 2: Package as .crx (Production)

1. In Chrome, go to `chrome://extensions/`
2. Click "Pack extension"
3. Browse to the `chrome-extension` directory
4. Click "Pack Extension"
5. Share the generated `.crx` file

## Configuration

### First-Time Setup

1. Click the extension icon in your toolbar
2. Click the settings (⚙️) button
3. Configure your API Base URL:
   - **Local development**: `http://localhost:3000`
   - **Production**: `https://your-domain.com`
4. Click "Save Settings"

### API Base URL Options

- **Local**: `http://localhost:3000` (default)
- **Custom Port**: `http://localhost:XXXX`
- **Remote Server**: `https://your-onehub-server.com`

## Usage

### Generating Music

1. **Click the Extension Icon** - Opens the popup interface

2. **Describe Your Song**
   - Enter a detailed description of the music you want
   - Example: "An upbeat electronic dance track with energetic synths and pulsing bass"

3. **Choose Parameters**
   - **Genre**: Select from 12+ music genres
   - **Mood**: Pick the emotional tone
   - **Duration**: Use the slider (30s - 5min)
   - **Quality Strategy**:
     - `Fastest` - Quick generation (~30s, $0.03)
     - `Best Quality` - Higher quality (~45s, $0.05)
     - `Ensemble Top 3` - Best of 3 models (~2-3min, $0.15) **[Recommended]**
     - `Ensemble All` - Best of all models (~3-5min, $0.20+)
     - `Adaptive` - AI chooses best strategy

4. **Click "Generate Music"**
   - Watch the progress bar
   - Generation time varies by strategy

5. **Listen & Download**
   - Play your generated music directly in the popup
   - View quality metrics and generation info
   - Download the audio file
   - Open the full app for more features

### Context Menu Integration

You can also generate music from selected text:

1. Select any text on a webpage describing music
2. Right-click and choose "Generate Music from [selection]"
3. The extension popup opens with your text pre-filled

### Keyboard Shortcuts

You can add custom keyboard shortcuts in Chrome:

1. Go to `chrome://extensions/shortcuts`
2. Find "ONE-Hub - AI Music Generator"
3. Add your preferred shortcut (e.g., `Ctrl+Shift+M`)

## File Structure

```
chrome-extension/
├── manifest.json           # Extension configuration
├── popup.html             # Main popup interface
├── popup.js               # Popup logic and API calls
├── styles.css             # All styling
├── background.js          # Background service worker
├── options.html           # Settings page
├── options.js             # Settings logic
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── README.md
├── generate-icons.py      # Python icon generator
├── generate-icons.sh      # Bash icon generator
└── README.md             # This file
```

## Features in Detail

### Multi-Model Ensemble

The extension uses ONE-Hub's powerful multi-model system:

- **MusicGen** (Meta) - Best for melody and structure
- **AudioCraft** (Meta) - Best for effects and atmosphere
- **Riffusion** - Best for experimental sounds
- **Quality Scoring** - AI automatically ranks results

### Local Storage

The extension stores:

- **Settings**: API URL and preferences (synced across devices)
- **History**: Last 20 music generations (local only)
- **Last Used Parameters**: Remembers your genre/mood selections

### Privacy

- No data is sent to third parties
- All music generation happens through YOUR ONE-Hub server
- History is stored locally in your browser
- Can be cleared anytime in settings

## Troubleshooting

### Extension Won't Load

- Make sure all required files are present
- Check that icons exist (or create placeholder icons)
- Look for errors in Chrome DevTools console
- Verify manifest.json has no syntax errors

### "API Error" Messages

- Verify ONE-Hub server is running
- Check API Base URL in settings
- Ensure server is accessible from browser
- Check server logs for errors

### Music Won't Generate

- Verify API keys are configured on the server
- Check that you have sufficient API credits (Replicate)
- Try a simpler prompt first
- Check browser console for errors (F12)

### Download Not Working

- Extension will request download permission on first use
- Check Chrome's download settings
- Verify audio URL is accessible

### Audio Won't Play

- Check that browser allows audio playback
- Try different audio formats if available
- Verify audio URL in DevTools Network tab

## Development

### Making Changes

1. Edit the extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

### Debugging

- **Popup**: Right-click popup → Inspect
- **Background**: Click "service worker" link in extension details
- **Options**: Right-click options page → Inspect

### Adding Features

The extension is designed to be easily extensible:

- **New API endpoints**: Update `popup.js` fetch calls
- **New UI elements**: Modify `popup.html` and `styles.css`
- **Background tasks**: Add to `background.js`
- **Storage**: Use `chrome.storage` API

## API Reference

### Endpoint Used

```
POST /api/generate
```

### Request Format

```json
{
  "prompt": "string",
  "genre": "string",
  "mood": "string",
  "duration": number,
  "strategy": "string"
}
```

### Response Format

```json
{
  "results": [
    {
      "modelName": "string",
      "audioUrl": "string",
      "qualityScore": number,
      "generationTime": number,
      "cost": number
    }
  ]
}
```

## Permissions Explained

The extension requests these permissions:

- **storage** - Save settings and history locally
- **activeTab** - Access current tab for context menu
- **downloads** - Download generated music files
- **host_permissions** - Connect to ONE-Hub server

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## License

This extension is part of the ONE-Hub project.

## Support

For issues, questions, or feature requests:

1. Check the troubleshooting section above
2. Review ONE-Hub main documentation
3. Open an issue on the GitHub repository

## Roadmap

Potential future features:

- [ ] Offline mode with queue
- [ ] Batch generation
- [ ] Playlist creation
- [ ] Share to social media
- [ ] Advanced audio editing
- [ ] Lyrics display
- [ ] Waveform visualization
- [ ] Browser notifications
- [ ] Keyboard shortcuts customization
- [ ] Dark mode toggle

## Credits

- **ONE-Hub Platform** - Main music generation engine
- **Replicate API** - AI model hosting
- **Meta** - MusicGen and AudioCraft models
- **Chrome Extensions API** - Browser integration

---

**Enjoy creating amazing music with ONE-Hub! 🎵**
