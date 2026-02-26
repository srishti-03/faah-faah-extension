# Faah Faah — VS Code Extension

Your code has errors. You will be judged. Audibly.

**Faah Faah** plays sounds and roasts you in real time as you break (and fix) your code.

---

## Features

### Error Sounds
- **1–2 errors** → 1x *faaah* sound
- **3–5 errors** → 2x *faaah* sounds
- **6+ errors** → 3x *faaah* sounds + **editor flashes red**

### Warning Sounds
A gentle chime plays every time new warnings appear. Consider it a polite intervention.

### Victory Sound
Fix all your errors and get a victory sound + "You absolute legend!" — because you deserve it.

### Git Blame Roast
Faah Faah reads your git username and makes it personal:
> *"Srishti broke the build. Classic."*

### Late Night Coder Roast
Coding after 10 PM? Expect zero sympathy:
> *"Yaar so ja, fresh mind = fewer errors."*

### .env File Panic
If your `.env` file has errors — **siren**. Immediately. As it should be.

### Streak / Code Destroyer
Trigger 3+ error sprees in a row and unlock:
> *"Achievement Unlocked: Code Destroyer!"*

### Rage Quit Button
Click the 🏳️ in the status bar to give up gracefully. Your daily score (bugs survived, faaahs triggered, victories earned) gets copied to clipboard — ready to share.


### Mute Toggle
Click the error counter in the status bar to mute/unmute all sounds.

---

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `fhaFha.enabled` | `true` | Enable or disable all sounds |
| `fhaFha.errorSoundPath` | *(built-in)* | Custom path to error sound (.mp3) |
| `fhaFha.warningSoundPath` | *(built-in)* | Custom path to warning sound (.mp3) |
| `fhaFha.victorySoundPath` | *(built-in)* | Custom path to victory sound (.mp3) |
| `fhaFha.sirenSoundPath` | *(built-in)* | Custom path to .env panic siren (.mp3) |
| `fhaFha.debounceMs` | `500` | Delay before triggering sounds (ms) |

---

## Requirements

No setup required. Works on Windows, macOS, and Linux.

---

## Known Issues

- The `.env` panic mode only triggers if your `.env` file is open in the editor with TypeScript diagnostics enabled.
- Late night mode is based on your local system time (10 PM – 6 AM).

---

## Release Notes

### 0.0.1

Initial release — errors will be heard.
