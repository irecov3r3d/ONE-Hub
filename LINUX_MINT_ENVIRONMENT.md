# 🧩 Personal Studio Desktop Environment (Linux Mint Base)

This is a **studio-grade desktop blueprint** you can shape into *your* ideal environment. It’s designed for building and running ONE-Hub **and** for day‑to‑day creative work, with clear customization points for layout, audio, tooling, and workflow.

---

## ✅ Base OS (Starting Point)

- **Linux Mint 21+ (Cinnamon)** recommended
- Linux Mint 20.x should work with minor package name differences

---

## 🧱 What We Need to Build This Studio

Minimum practical baseline:

- **CPU**: 4 cores (8+ recommended)
- **RAM**: 16 GB (32 GB recommended for heavy audio + builds)
- **Storage**: 100 GB free (SSD strongly recommended)
- **GPU**: Optional (useful for creative apps, not required for ONE‑Hub)
- **Audio**: Built‑in is fine; dedicated audio interface if doing studio work
- **Displays**: 1080p minimum; dual‑monitor recommended

You can scale this up or down based on how intense your audio and build workloads are.

---

## 🎯 Design Goals (Customize These)

Pick your priorities before installing anything:

- **Workflow style**: keyboard-first, mouse-first, or hybrid
- **Look & feel**: minimal, cinematic, retro, or “studio clean”
- **Audio focus**: mixing/mastering, sound design, or voice work
- **Workspaces**: single-screen vs. multi-monitor layout
- **Focus level**: distraction-free vs. multitask hub

Use this to decide which sections you enable below.

---

## ✅ Your Studio Profile (Applied)

Based on your preferences:

- **Aesthetic**: minimalist, dark
- **Workflow**: music + video
- **Hardware**: regular laptop with upgraded RAM
- **Desktop**: bare‑minimum KDE‑like environment
- **Core apps**: ONE‑Hub, Beat Analyzer, Beatpack Analyzer, Beat Maker, Song Generator Vault, Lil Gimme Leitimit, Voice Recorder

This guide below assumes that profile.

---

## 🪟 Workspace Vision: Giant Multi-Workspace Studio

You asked for a **large-window, multi-workspace studio** where each workspace zooms into a deeper module stack, and where modules are controlled by **voice**, **keyboard shortcuts**, or **click/touch**. This section documents the **experience blueprint** so the UI can be built to match your flow.

### Workspace Grid (4 Spaces)

- **Workspace 1: Vault + Library**
- **Workspace 2: Generator + Live Input**
- **Workspace 3: Analyzer + Splitter**
- **Workspace 4: Master + Mixer**

Each workspace starts as a **single giant interface** with minimal buttons and a prominent **module launcher strip**.

### Zoomable Module Stacks (4–8 per workspace)

Each workspace can “zoom in” to a stack of 4–8 chained modules:

- **Module buttons** at the top for quick swap
- **Sidebar** for branch/module switching
- **Voice commands** to open, close, chain, or reorder modules

### Input Modes (All Three Active)

1. **Voice** (primary): “open analyzer”, “route live input to generator”
2. **Keyboard** (fallback): sequenced hotkeys per workspace
3. **Click/Touch** (fallback): minimal buttons, click‑n‑go

---

## 🎛️ Module Inventory (Target UX)

This list defines the “pro studio” stack that your workspace UI should expose:

- **Vault** (song generator vault / history)
- **Song Generator** (text + live audio input + upload)
- **Beat Analyzer**
- **Beatpack Analyzer**
- **Splitter / Stem Separation**
- **Mastering**
- **Mixer**
- **Voice Recorder**

Missing modules can be **borrowed conceptually** from other repos/branches and integrated as UI shells until functionality lands.

---

## 🗣️ Voice-Control Expectations (Behavior)

The hub should:

- **Listen by default** (or via push‑to‑talk)
- **Respect silence** (no action on ambient noise)
- **Speak clearly** when it needs confirmations
- **Know when to turn off** and when to wake back up
- **Bridge to UI actions** (click, type, switch, record)

Think “voice‑first control layer” that can **scan, click, type, and record**, similar to a browser‑level assistant with deep module access.

---

## 🧰 Core System Packages

These are foundational for builds, desktop stability, and audio playback:

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  curl \
  git \
  ffmpeg \
  libasound2 \
  libnss3 \
  libxss1 \
  libxtst6 \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  ca-certificates \
  pavucontrol
```

---

## 🟢 Node.js Runtime (via NVM)

Use NVM so you can match the Node version required by ONE-Hub:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload your shell
source ~/.bashrc

# Install the latest Node 18 LTS
nvm install 18
nvm use 18
```

---

## 🧠 Desktop Architecture Choices

If you want a **custom studio feel**, pick a direction:

### Option A: Cinnamon (Mint default)
- Polished, stable, easy to theme
- Best if you want **less setup and more building**

### Option B: KDE Plasma
- Highly customizable (panels, widgets, layouts)
- Great if you want a **control room dashboard**

### Option C: i3 / Sway (tiling)
- Keyboard-optimized, ultra-fast
- Great for **focused production sessions**

If you want, I can map your layout and shortcuts for any of these.

---

## 🖤 Minimalist Dark KDE Setup (Recommended for You)

Goal: clean, dark, fast, and distraction‑free.

1. **Theme**: Breeze Dark (built-in) or “Nordic” (optional)
2. **Panel**: single top panel with app launcher, clock, and tray only
3. **Dock**: optional; keep it hidden or remove
4. **Workspace count**: 3 (Music, Video, Build)
5. **Fonts**: Inter (UI) + JetBrains Mono (terminal)

---

## 🎚️ Studio Audio Stack (Optional but Recommended)

Choose your audio layer:

- **PipeWire** (modern default in Mint) for low-latency routing
- **PulseAudio** (simple & reliable)

Add pro tools if you want real studio workflows:

```bash
sudo apt install -y \
  pipewire-audio \
  pipewire-jack \
  qjackctl \
  cadence \
  ardour \
  audacity
```

---

## 🧩 UX Layout Blueprint (Customize This)

### Workspace Layout
- **Workspace 1**: ONE‑Hub / Build
- **Workspace 2**: Music tools
- **Workspace 3**: Video tools

### Panel / Dock
- Single top panel (clean)
- Bottom dock (launchers only)

### Theme + Fonts
- **Theme**: Mint-Y / Arc / Nord
- **Fonts**: Inter / JetBrains Mono / IBM Plex

If you tell me your aesthetic, I’ll generate a full theme pack.

---

## ⚙️ Desktop Power & Audio Settings

For long sessions and stable audio previews:

- **Disable screen locking** during long builds
- **Disable power saving** for AC power
- Keep **PulseAudio/PipeWire** enabled for local audio previews

---

## 🔧 Build & Run ONE‑Hub

## 📦 ONE-Hub Setup

Clone and install dependencies:

```bash
git clone https://github.com/irecov3r3d/ONE-Hub.git
cd ONE-Hub
npm install
```

Run the development server:

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

---

## 🚀 Build for Production

```bash
npm run build
npm start
```

---

## 🔁 Studio Quality-of-Life Tools

Recommended desktop apps for a build workstation:

```bash
sudo apt install -y \
  gnome-terminal \
  htop \
  xclip \
  flameshot \
  obs-studio \
  gimp \
  inkscape
```

---

## 🎛️ Your Studio App Stack (Install Targets)

Placeholders for your core tools (install paths depend on where you source them):

- **ONE‑Hub** (this repo)
- **Beat Analyzer**
- **Beatpack Analyzer**
- **Beat Maker**
- **Song Generator Vault**
- **Lil Gimme Leitimit**
- **Voice Recorder**

If you want, give me install sources (AppImage, Flatpak, .deb, GitHub) and I’ll wire this into a one‑command bootstrap.

---

## ✅ Studio Verification Checklist

- [ ] `node -v` shows **v18.x**
- [ ] `npm run dev` starts without errors
- [ ] Browser can access **http://localhost:3000**
- [ ] `ffmpeg -version` works for audio processing
- [ ] Audio playback works in `pavucontrol`

---

## ✨ Want It Truly Yours?

Tell me:

- Your **aesthetic** (dark, neon, cinematic, minimal, etc.)
- Your **workflow** (music-first, code-first, mixed)
- Your **hardware** (GPU, audio interface, monitors)
- Your **favorite tools** (DAWs, editors, plugins)

I’ll generate a **full custom desktop blueprint** based on that.

---

If you want **GPU acceleration**, **container builds**, or **remote runners**, I can extend this into a production‑grade studio setup.
