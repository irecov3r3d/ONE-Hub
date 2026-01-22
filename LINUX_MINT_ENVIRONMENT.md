# 🧩 Personal Studio Desktop Environment (Linux Mint Base)

This is a **studio-grade desktop blueprint** you can shape into *your* ideal environment. It’s designed for building and running ONE-Hub **and** for day‑to‑day creative work, with clear customization points for layout, audio, tooling, and workflow.

---

## ✅ Base OS (Starting Point)

- **Linux Mint 21+ (Cinnamon)** recommended
- Linux Mint 20.x should work with minor package name differences

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
- **Workspace 1**: ONE‑Hub / dev
- **Workspace 2**: Audio tools / DAW
- **Workspace 3**: Research / docs

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
