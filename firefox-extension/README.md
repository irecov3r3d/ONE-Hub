# Teach & Repeat - Firefox Extension

A powerful browser macro recorder for Firefox that lets you teach it actions once and repeat them forever. Includes special support for sending prompts to multiple AI chat interfaces simultaneously.

## Features

### Macro Recording
- **Click Recording**: Captures all click events with precise element targeting
- **Keyboard Input**: Records keystrokes, including special keys and shortcuts
- **Form Inputs**: Captures text entry in inputs, textareas, and contenteditable elements
- **Scroll Events**: Records page and element scrolling
- **Clipboard Operations**: Captures copy/paste actions
- **Smart Element Selection**: Uses multiple strategies to find elements during playback

### Macro Playback
- **Accurate Replay**: Recreates recorded actions with timing preservation
- **Speed Control**: Adjust playback speed from 0.5x to 3x
- **Pause/Resume**: Control playback in real-time
- **Visual Feedback**: Highlights elements during playback
- **Error Recovery**: Gracefully handles missing elements

### Multi-AI Chat Integration
Send the same prompt to multiple AI chat interfaces simultaneously:
- **Claude** (claude.ai)
- **ChatGPT** (chat.openai.com)
- **GitHub Copilot**

Collect and compare responses from different AI systems in one place.

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to the `firefox-extension` folder and select `manifest.json`

### Generate Icons (Optional)

If you want to generate proper icons:

```bash
cd firefox-extension/icons
pip install Pillow
python create-icons.py
```

Or use ImageMagick:

```bash
cd firefox-extension/icons
chmod +x generate-icons.sh
./generate-icons.sh
```

## Usage

### Recording a Macro

1. Click the Teach & Repeat icon in the toolbar
2. Enter a name for your recording
3. Click "Start Recording"
4. Perform the actions you want to record
5. Click "Stop Recording" in the popup or indicator

### Playing a Macro

1. Navigate to the starting page for your macro
2. Open the popup and go to the "Macros" tab
3. Find your macro and click "Play"
4. Watch as the extension replays your actions

### Multi-AI Prompting

1. Open the popup and go to the "AI Chat" tab
2. Select which AI chats to target (Claude, ChatGPT, etc.)
3. Enter your prompt
4. Click "Send to AI Chats"
5. The extension will open/find tabs for each AI and send your prompt
6. Responses are collected and displayed in the popup

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Recording | `Alt+Shift+R` |
| Stop Playback | `Alt+Shift+S` |
| Pause/Resume | `Alt+Shift+P` |

Shortcuts can be customized in Firefox's Add-ons settings (`about:addons` > Manage Extension Shortcuts).

## Settings

Access settings via the gear icon in the popup or right-click the toolbar icon.

### Recording Options
- **Capture Mouse Movement**: Record cursor movements (increases macro size)
- **Capture Scroll Events**: Record page scrolling
- **Capture Clipboard**: Record copy/paste operations
- **Highlight Elements**: Visual feedback during recording

### Playback Options
- **Playback Speed**: Default speed multiplier
- **Minimum Delay**: Minimum time between events

### Data Management
- **Export**: Download all macros as JSON
- **Import**: Load macros from JSON file
- **Clear All**: Delete all saved macros

## How It Works

### Element Targeting

The extension uses multiple strategies to find elements during playback:

1. **CSS Selectors**: Generated from element's position in DOM
2. **ID**: Direct element ID if available
3. **Data Attributes**: `data-testid`, `data-id`, etc.
4. **ARIA Labels**: Accessibility attributes
5. **Text Content**: For buttons and links
6. **Class Combinations**: Tag + class fallback

### Event Simulation

Events are simulated using native browser APIs:
- `MouseEvent` for clicks
- `KeyboardEvent` for keyboard input
- `InputEvent` for text entry
- Native element methods as fallbacks

### AI Chat Detection

The extension automatically detects supported AI chat interfaces by URL pattern and uses site-specific selectors for:
- Finding input fields
- Locating send buttons
- Identifying response containers
- Detecting loading states

## Limitations

- Some sites with strict CSP may block content scripts
- Complex drag-and-drop operations have limited support
- File upload dialogs cannot be automated
- CAPTCHAs and other security measures will block automation
- AI chat responses depend on site structure (may break with UI updates)

## Privacy

- All data is stored locally in browser storage
- No data is sent to external servers
- Clipboard capture can be disabled in settings
- Macros can be exported for backup before clearing

## Development

### Project Structure

```
firefox-extension/
├── manifest.json        # Extension manifest
├── background/
│   └── background.js    # Background script
├── content/
│   ├── recorder.js      # Event recording
│   ├── player.js        # Macro playback
│   ├── ai-chat.js       # AI chat integration
│   └── overlay.css      # Visual feedback styles
├── popup/
│   ├── popup.html       # Popup UI
│   ├── popup.css        # Popup styles
│   └── popup.js         # Popup logic
├── options/
│   ├── options.html     # Settings page
│   └── options.js       # Settings logic
└── icons/               # Extension icons
```

### Building

No build step required - the extension runs directly from source.

### Testing

1. Load the extension in Firefox Developer Edition
2. Enable browser console for debugging
3. Check the extension's background page console for logs

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Part of [ONE-Hub](https://github.com/irecov3r3d/ONE-Hub)

## Support

- [Report Issues](https://github.com/irecov3r3d/ONE-Hub/issues)
- [Documentation](https://github.com/irecov3r3d/ONE-Hub)
