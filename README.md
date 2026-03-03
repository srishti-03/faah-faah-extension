# Faah Faah — Error Sounds & Roasts for VS Code

> Your code has errors. You will be judged. Audibly.

**Faah Faah** plays the iconic *faaah* sound every time you write bad code — and it gets personal. It scales with how bad things are, tracks your daily damage, shows live sports scores while you suffer, and lets you rage quit in style.

---

## Features

### 🔊 Error Sounds with Intensity
Sounds scale with how badly you've broken things:

| Error Count | Volume | Repeats | Vibe |
|---|---|---|---|
| 1–4 errors | 60% | 1× | Gentle disappointment |
| 5–9 errors | 80% | 2× | Growing concern |
| 10+ errors | 100% | 3× rapid fire | Full chaos |

6+ errors also triggers a **red background flash** on the editor.

### 🔔 Warning Sounds
A gentle chime plays when new warnings appear. A polite intervention.

### 🏆 Victory Sound
Fix **all errors in all open tabs** → victory sound plays + *"You absolute legend!"*

### 🚨 .env File Panic
`.env` file has errors? Forget the faaah — you get a **siren** and `PANIC! ABORT ABORT!`. As it should be.

### 😤 Roast Messages
Every faaah comes with a randomly chosen roast:
- Generic: *"404: Brain not found"*, *"The bugs are evolving. We can't stop them."*
- **Personalized** with your git username: *"Srishti broke the build. Classic."*
- **Late night mode** (10 PM – 6 AM): *"Yaar so ja, fresh mind = fewer errors."*

### 💀 Code Destroyer Achievement
3+ consecutive error sprees without fixing anything:
> *"Achievement Unlocked: Code Destroyer! 3 consecutive error sprees"*

### 🖥️ Terminal Build Sounds
Works with `npm run build`, `tsc`, `webpack`, `cargo`, `gradle`, `make`, and more:
- **Build failed** → faaah + roast message
- **Build passed** → victory sound + celebration message

### 📊 Daily Stats Panel
Click 🏳️ or run `Fha Fha: View Today's Stats` to open a stats panel showing:
- **Errors Made** — total new errors triggered today
- **Errors Fixed** — total errors you resolved
- **Full Victories** — how many times you hit 0 errors
- **Faaahs Triggered** — how many times the sound played
- **Peak Error Hour** — which hour you were most destructive
- **Most Buggy Files** — top 5 files ranked by error frequency

### 🏳️ Rage Quit
Click the **🏳️** button in the status bar to:
1. Play a sad sound
2. Copy your daily score to clipboard *(share on Twitter/Slack)*
3. Open the Daily Stats Panel

### 🔇 Mute Toggle
Click `$(mic)` in the status bar to mute/unmute all sounds instantly.

### 🧘 Zen Mode
Want the roasts but not the noise?
- **Sounds are muted** — no faaah, no chime, no victory
- **Notifications still appear** — you'll see the error popups
- Click `🧘` in the status bar, or use Command Palette

> **Zen Mode vs Mute:** Zen = silent but notified. Mute = total silence.

### 🔉 Volume Control
Adjust volume independently of system settings:
- Go to Settings (`Ctrl+,`) → search **fha fha volume**
- Set `fhaFha.volume` to any value from `0` to `100`

### 🏆 Live Sports Scores
Track live match scores in the status bar — powered by the ESPN API, no API key needed.
- Supports cricket, football, basketball, soccer, baseball, hockey
- Click the 🏆 icon to pick your sports via a multi-select menu
- Get popup notifications when a goal/wicket/basket happens
- Auto-refreshes every 5 minutes (configurable)

### 🧠 Smart Noise Reduction
- No sounds while you're actively typing (2s cooldown)
- Max one sound trigger per 10 seconds
- No sounds when VS Code window is not focused
- 5-second silence after git branch switches
- Warning sounds limited to once per 30 seconds

---

## Commands

Open via Command Palette (`Ctrl+Shift+P`) and type **Fha Fha**:

| Command | Description |
|---|---|
| `Fha Fha: Rage Quit` | Play sad sound, copy daily score to clipboard, open stats panel |
| `Fha Fha: View Today's Stats` | Open the daily stats webview panel (errors, fixes, peak hour, buggy files) |
| `Fha Fha: Toggle Mute` | Mute or unmute all sounds completely |
| `Fha Fha: Toggle Zen Mode` | Mute sounds while keeping popup notifications active |
| `Fha Fha: Toggle Live Scores` | Turn live sports score updates on or off |
| `Fha Fha: Open Scores Menu` | Pick which sports to track via a multi-select dropdown |
| `Fha Fha: Check Scores Now` | Force-refresh live scores immediately |

---

## Status Bar

| Icon | What it does |
|---|---|
| `$(check) No errors` / `$(error) N errors` | Current error count. Background turns red when errors exist. |
| 🏳️ | Rage Quit — sad sound + copy score + open stats panel |
| `$(mic)` / `$(mute)` | Toggle mute on/off |
| 🧘 / 🧘🔕 | Toggle Zen Mode (🔕 = currently ON) |
| 🏆 Live | Live scores — click to open sports selection menu |

---

## Configuration

Open Settings (`Ctrl+,`) and search `fhaFha`:

| Setting | Default | Description |
|---|---|---|
| `fhaFha.enabled` | `true` | Enable/disable Faah Faah completely |
| `fhaFha.volume` | `100` | Sound volume from `0` to `100` |
| `fhaFha.triggerMode` | `onType` | `onType`: trigger on every diagnostic change \| `onSave`: trigger only on file save |
| `fhaFha.debounceMs` | `2000` | Delay (ms) before sound triggers. Increase if sounds play mid-typing. |
| `fhaFha.zenMode` | `false` | Sounds muted, notifications still show |
| `fhaFha.terminalSounds` | `true` | Play sounds on terminal build success/failure |
| `fhaFha.errorSoundPath` | *(built-in faaah)* | Custom `.mp3` path for error sound |
| `fhaFha.warningSoundPath` | *(built-in chime)* | Custom `.mp3` path for warning sound |
| `fhaFha.victorySoundPath` | *(built-in victory)* | Custom `.mp3` path for victory sound |
| `fhaFha.sirenSoundPath` | *(built-in siren)* | Custom `.mp3` path for `.env` panic siren |
| `fhaFha.liveScores.enabled` | `false` | Enable live sports score updates in the status bar |
| `fhaFha.liveScores.sports` | `[]` | Sports to track (see supported list below) |
| `fhaFha.liveScores.pollIntervalMinutes` | `5` | How often to refresh scores (1–60 min) |
| `fhaFha.liveScores.showScoreChangePopup` | `true` | Show popup when a score changes |

---

## Supported Sports (Live Scores)

| Setting Value | League |
|---|---|
| `cricket-ipl` | IPL |
| `cricket-t20` | ICC T20 Internationals |
| `cricket-odi` | ICC ODI Internationals |
| `cricket-tests` | Test Cricket |
| `soccer-epl` | English Premier League |
| `soccer-ucl` | UEFA Champions League |
| `soccer-laliga` | La Liga |
| `soccer-bundesliga` | Bundesliga |
| `soccer-seriea` | Serie A |
| `basketball-nba` | NBA |
| `football-nfl` | NFL |
| `baseball-mlb` | MLB |
| `hockey-nhl` | NHL |

---

## Installation

1. Open VS Code
2. Press `Ctrl+P` and paste:
ext install fhafha-devss.fha-fha-extension


Or search **Faah Faah** in the Extensions panel (`Ctrl+Shift+X`).

---

## Requirements

No setup required. Works out of the box on:
- Windows (PowerShell / MCI)
- macOS (afplay)
- Linux (paplay)

> Faah Faah detects **code diagnostics** from the Problems panel (`Ctrl+Shift+M`), not terminal output. Works with any language that has a VS Code language server: TypeScript, Python, Java, C++, Go, Rust, etc.

### Linux Audio (if sound doesn't play)

```bash
sudo apt-get install pulseaudio-utils   # PulseAudio (paplay)
sudo apt-get install alsa-utils         # ALSA (aplay)
sudo apt-get install ffmpeg             # FFmpeg (ffplay)
```

---

## Troubleshooting

**Sound not playing?**

- Check system volume is not muted
- Use `Fha Fha: Toggle Mute` to make sure extension is unmuted
- Check that Zen Mode is not ON (`🧘🔕` in status bar) — click it to disable
- Linux: ensure an audio player is installed (see Requirements above)

**Sound playing too early (mid-typing)?**

- Increase `fhaFha.debounceMs` to `4000` or `5000`
- Or switch `fhaFha.triggerMode` to `onSave` — sounds only trigger on Ctrl+S

**Sound too loud or too quiet?**

- Open Settings (`Ctrl+,`), search **fha fha volume**, and adjust `fhaFha.volume` (0–100)

**Want a different sound?**

- Set a custom `.mp3` path in `fhaFha.errorSoundPath` (or the other sound path settings)

**Live scores not showing?**

- Enable `fhaFha.liveScores.enabled` in Settings
- Add at least one sport to `fhaFha.liveScores.sports`

**Stats panel showing zeros?**

- Stats reset daily — errors/fixes are tracked from the moment the extension is active
- If you just installed, trigger some errors first!

---

## Known Issues

- `.env` panic mode triggers only if the `.env` file is open in the editor
- Late night mode is based on local system time (10 PM – 6 AM)

---

## Release Notes

### 0.0.7
- **Daily Stats Panel** — `Fha Fha: View Today's Stats` opens a webview with errors, fixes, victories, peak error hour, and most buggy files
- **Rage Quit** now opens the stats panel automatically in addition to copying score to clipboard
- **Error intensity** — volume and repeat count now scale with error severity (60% / 80% / 100%)

### 0.0.6
- **Zen Mode** — mute sounds while keeping notifications active (click `🧘` in status bar)
- **Volume control** — adjust sound volume (0–100) via `fhaFha.volume` setting

### 0.0.5
- Smart noise reduction: typing cooldown (2s), sound cooldown (10s), window focus check
- Branch checkout guard — 5s silence after git branch switch
- `triggerMode` setting: choose between `onType` and `onSave`
- Terminal build sounds — faaah on failed builds, victory on success
- Warning sounds limited to once per 30 seconds
- **Live Scores** — sports score updates in status bar (Cricket, Soccer, NBA, NFL, MLB, NHL)

### 0.0.4
- Updated README with full documentation

### 0.0.3
- Improved setting descriptions
- Increased default debounce to 1500ms

### 0.0.2
- Added extension logo

### 0.0.1
- Initial release — errors will be heard.
