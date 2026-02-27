# Faah Faah — Error Sounds & Roasts for VS Code

> Your code has errors. You will be judged. Audibly.

**Faah Faah** plays the iconic *faaah* sound every time you write bad code — and it gets personal.

---

## Features

### 🔊 Error Sounds
- **1–2 errors** → 1x faaah
- **3–5 errors** → 2x faaah  
- **6+ errors** → 3x faaah + **editor flashes red**

### 🔔 Warning Sounds
A gentle chime plays when new warnings appear. A polite intervention.

### 🏆 Victory Sound
Fix all your errors → victory sound + *"You absolute legend!"*

### 😤 Git Blame Roast
Faah Faah reads your git username and makes it personal:
> *"Srishti broke the build. Classic."*

### 🌙 Late Night Mode
Coding after 10 PM? Expect zero sympathy:
> *"Yaar so ja, fresh mind = fewer errors."*

### 🚨 .env File Panic
`.env` has errors? **Siren. Immediately.** As it should be.

### 💀 Code Destroyer Streak
3+ error sprees in a row:
> *"Achievement Unlocked: Code Destroyer!"*

### 📊 Rage Quit Button
Click 🏳️ in the status bar — get your full daily damage report (bugs survived, faaahs triggered, victories earned) copied to clipboard.

### 🔇 Mute Toggle
Click the error counter in the status bar to mute/unmute all sounds instantly.

---

## Installation

1. Open VS Code
2. Press `Ctrl+P`
3. Paste and press Enter:
ext install fhafha-devss.fha-fha-extension



Or search **fha-fha-extension** in the Extensions panel (`Ctrl+Shift+X`).

---

## Commands

Access via Command Palette (`Ctrl+Shift+P`):

| Command | Description |
|---|---|
| `Fha Fha: Rage Quit` | View your daily damage scorecard |
| `Fha Fha: Toggle Mute` | Mute/unmute all sounds |

---

## Configuration

Open VS Code Settings (`Ctrl+,`) and search `fhaFha`:

| Setting | Default | Description |
|---|---|---|
| `fhaFha.enabled` | `true` | Enable/disable Faah Faah. Also toggleable from status bar. |
| `fhaFha.debounceMs` | `1500` | Delay (ms) before sound triggers. Increase to avoid mid-typing sounds. |
| `fhaFha.errorSoundPath` | *(built-in)* | Custom .mp3 path for error sound |
| `fhaFha.warningSoundPath` | *(built-in)* | Custom .mp3 path for warning sound |
| `fhaFha.victorySoundPath` | *(built-in)* | Custom .mp3 path for victory sound |
| `fhaFha.sirenSoundPath` | *(built-in)* | Custom .mp3 path for .env panic siren |

---

## Requirements

No setup required. Works out of the box on:
- ✅ Windows (PowerShell)
- ✅ macOS (afplay)
- ✅ Linux (paplay / aplay / ffplay)

> **Note:** Faah Faah detects **code diagnostics** (errors shown in the Problems panel — `Ctrl+Shift+M`), not terminal output. Works with any language that has a VS Code language server (TypeScript, Python, Java, C++, etc.)

### Linux Audio (if sound doesn't play)
```bash
# PulseAudio
sudo apt-get install pulseaudio-utils

# ALSA
sudo apt-get install alsa-utils

# FFmpeg
sudo apt-get install ffmpeg
```

---
## Troubleshooting

**Sound not playing?**
- Check system volume is not muted
- Use `Fha Fha: Toggle Mute` to make sure extension is unmuted
- Linux: ensure an audio player is installed (see Requirements)

**Sound playing too early (mid-typing)?**
- Increase `fhaFha.debounceMs` to `2000` or `3000` in settings

**Want a different sound?**
- Set a custom `.mp3` path in `fhaFha.errorSoundPath`

---

## Known Issues

- `.env` panic mode triggers only if the `.env` file is open in the editor
- Late night mode is based on local system time (10 PM – 6 AM)

---

## Release Notes

### 0.0.4
- Updated README with full documentation

### 0.0.3
- Improved setting descriptions
- Increased default debounce to 1500ms

### 0.0.2
- Added extension logo

### 0.0.1
Initial release — errors will be heard.
