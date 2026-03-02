# Hub Analysis & Branch Categorization

As part of the performance optimization and repo reorganization, I've analyzed the existing branches and categorized them into logical hubs. Branches that do not fit the core "Music & Audio" mission of this repository should be moved to their own dedicated repos.

## 🎵 Music & Audio Hub (STAY)

These branches form a cohesive ecosystem for music creators, covering the entire workflow from ideation to distribution.

*   **`claude/song-generator-T7GUx`**: The main hub for AI-powered song generation.
*   **`claude/audio-analysis-mastering-tool-ySQzQ`**: Professional-grade audio processing, analysis, and mastering.
*   **`claude/beat-maker-app-Fhpg2`**: Rhythm and beat creation tool.
*   **`claude/music-vault-app-DNlEb`**: Digital asset management for musical projects.
*   **`codex/create-advanced-voice-recorder-app`**: High-quality vocal and instrumental capture.
*   **`claude/auto-split-video-clips-gwIQz`**: Tools for preparing musical content for social media (TikTok/Reels).

### Collaborative Nature
The Music & Audio Hub is highly collaborative. These tools share:
1.  **Core Audio Services**: `lib/services/audioService.ts` and `lib/services/audioAnalysisService.ts` serve as the backbone for all these features.
2.  **Storage Mechanism**: They all utilize `lib/storage/trackStore.ts` (IndexedDB) for local asset management.
3.  **UI Design Language**: They share Tailwind components and Lucide icons, ensuring a consistent user experience across the creative suite.

---

## 🚀 Branches to Move (MOVE)

These branches are valuable but deviate from the core mission and should be organized into separate repositories.

### 🌐 Browser Extensions Hub
Focuses on browser-based productivity and automation.
*   `remotes/origin/claude/chrome-extension-replica-4L8Ec`
*   `remotes/origin/claude/firefox-teach-repeat-extension-gRNKL`
*   `remotes/origin/codex/create-gemini-sidebar-extension-replica`

### 💻 Desktop & OS Hub
Focuses on operating system environments and desktop utilities.
*   `remotes/origin/codex/build-linux-mint-desktop-environment`
*   `remotes/origin/codex/build-linux-mint-desktop-environment-xk8yme`
*   `remotes/origin/codex/build-linux-mint-desktop-environment-y2in6x`

### 🤝 Community & Local Hub
Focuses on local community tracking and social discovery.
*   `remotes/origin/LemmeGitDat--Modular-build-for-local-areas-to-track-through-community-whats-popping-near-them`

### 🛒 Food & Market Hub
Focuses on e-commerce and local food markets.
*   `remotes/origin/codex/build-mvp-for-foodmarket-app`

### ⚙️ Utilities & Automation Hub
Focuses on general-purpose productivity tools.
*   `remotes/origin/claude/multi-tab-ai-automation-X7gEG`
*   `remotes/origin/codex/organize-file-folders-neatly`
*   `remotes/origin/claude/keyboard-window-splitter-fCMem`
