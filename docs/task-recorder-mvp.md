# Task Recorder MVP (Chrome/Chromebook)

## Goal
Build a **local-only teach-and-repeat** browser extension that records user actions in a **specific window/tab** and can replay them later. The system should avoid AI intervention and focus on deterministic replay for speed and reliability, while keeping storage and processing on-device.

## Core User Flow
1. User selects a target tab (or current tab) and clicks **Watch Me**.
2. Extension records interactions:
   - Clicks
   - Keystrokes / input changes
   - Scrolls
   - Optional element reads (DOM text capture)
3. User clicks **Stop**.
4. User saves the task to the **Vault** with a name and optional description.
5. User clicks **Go** to replay the task.
6. If replay fails, user can **re-train** the task.

## Recording Scope
- Only record within the active tab or user-selected window.
- Restrict to pages with extension permissions.
- Log events with DOM selectors and timestamps for deterministic playback.
- Capture the minimum data needed to reproduce the action (selector + value + optional keyboard modifiers).

## Replay Expectations
- Replay actions in order with configurable delays.
- Retry a small number of times for element selection (e.g., 3 attempts with short backoff).
- Fail fast with a clear error when elements are missing.
- Allow manual resume after a failure (user can click **Go** again after retraining).

## Vault Storage
- **Sync by default** (Chrome sync storage) with fallback to local storage.
- Each task stores:
  - Task metadata (name, created/updated)
  - Action list (type, selector, payload, timestamp)
  - Target hostname/domain constraints
  - Versioned schema for forward-compatible changes

### Suggested Task Schema (JSON)
```json
{
  "id": "uuid",
  "name": "Send prompt to Suno tabs",
  "description": "Drop prompt into multiple AI tabs and click send",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z",
  "targets": ["suno.ai", "chat.openai.com"],
  "actions": [
    {
      "type": "click",
      "selector": "[data-testid='prompt']",
      "timestamp": 0
    },
    {
      "type": "input",
      "selector": "textarea",
      "value": "My prompt text",
      "timestamp": 350
    },
    {
      "type": "key",
      "key": "Enter",
      "timestamp": 800
    }
  ],
  "version": 1
}
```

## Supported Action Types (MVP)
- Click
- Input/textarea text entry
- Key press (Enter/Tab)
- Scroll
- Read DOM text (optional output capture)

### Selector Strategy (MVP)
- Prefer stable attributes (data-testid, aria-label, name, id).
- Fallback to CSS path only when needed.
- Store multiple selector candidates to improve replay success.

## Technical Notes
- Use content scripts to capture and replay events.
- Use background/service worker to manage tasks and cross-tab orchestration.
- The replay engine should be deterministic and **non-AI**.
- Include a lightweight event recorder overlay (Watch/Stop/Go) scoped to the active tab.
- Sync via `chrome.storage.sync` with size-aware chunking for long tasks.

## Known Constraints
- iOS Safari/Chrome restrictions prevent full automation.
- Some sites (iframes, shadow DOM, anti-bot measures) may block automation.
- Output capture only works if DOM text is accessible.

## MVP Success Criteria
- Record and replay a multi-step task across multiple tabs.
- Provide clear errors and re-train flow when replay fails.
- Sync task vault across Chrome/Chromebook sessions.
- Confirm deterministic replay on at least two target sites with different DOM structures.
