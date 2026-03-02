import * as vscode from 'vscode';
import * as path from 'path';
import { execFile } from 'child_process';

let lastErrorCount = 0;
let lastWarningCount = 0;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let statusBarItem: vscode.StatusBarItem;
let lastHadErrors = false;
let errorStreak = 0;
let dailyStats = { errors: 0, faaahs: 0, victories: 0, date: new Date().toDateString() };
let lastSaveTime = 0;
let lastCheckoutTime = 0;
let lastTypingTime = 0;
let lastSoundPlayedAt = 0;


function playSound(audioPath: string, volume = 100): void {
    if (process.platform === 'win32') {
        const vol = Math.round(volume * 10); // MCI expects 0–1000
        const psCommand = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; using System.Text; public class MCI { [DllImport("winmm.dll")] public static extern int mciSendString(string command, StringBuilder returnValue, int returnLength, IntPtr winHandle); }'; [MCI]::mciSendString('open "${audioPath}" type mpegvideo alias media', $null, 0, [IntPtr]::Zero); [MCI]::mciSendString('setaudio media volume to ${vol}', $null, 0, [IntPtr]::Zero); [MCI]::mciSendString('play media wait', $null, 0, [IntPtr]::Zero); [MCI]::mciSendString('close media', $null, 0, [IntPtr]::Zero)`;
        execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', psCommand],
            (err, _stdout, stderr) => {
                if (err) { console.error('Sound error:', err.message); }
                if (stderr) { console.error('Sound stderr:', stderr); }
            }
        );
    } else if (process.platform === 'darwin') {
        execFile('afplay', ['-v', String(volume / 100), audioPath], (err) => {
            if (err) { console.error('Sound error:', err.message); }
        });
    } else {
        execFile('paplay', [`--volume=${Math.round(volume / 100 * 65536)}`, audioPath], (err) => {
            if (err) { console.error('Sound error:', err.message); }
        });
    }
}

function playSoundWithCooldown(audioPath: string, cooldownMs = 10000): void {
    const config = vscode.workspace.getConfiguration('fhaFha');
    if (config.get<boolean>('zenMode', false)) { return; }
    if (Date.now() - lastSoundPlayedAt < cooldownMs) { return; }
    if (!vscode.window.state.focused) { return; }
    lastSoundPlayedAt = Date.now();
    const volume = config.get<number>('volume', 100);
    playSound(audioPath, volume);  //pass the volume to playSound                   
}


const funnyMessages = [
    "404: Brain not found",
    "Your code called, it's crying",
    "Have you tried turning it off and on again?",
    "The bugs are evolving. We can't stop them.",
    "Your keyboard is judging you right now.",
    "Legend says this error exists since 2019.",
    "Congrats! You found a new way to break things.",
    "Sir this is a Wendy's... but also fix your code.",
];

async function flashRedBackground(): Promise<void> {
    const wbConfig = vscode.workspace.getConfiguration('workbench');
    const original = wbConfig.get<object>('colorCustomizations') ?? {};
    await wbConfig.update('colorCustomizations', {
        ...original,
        "editor.background": "#3d0000",
        "sideBar.background": "#3d0000"
    }, vscode.ConfigurationTarget.Global);
    setTimeout(async () => {
        await wbConfig.update('colorCustomizations', original, vscode.ConfigurationTarget.Global);
    }, 1000);
}
function getGitUserName(): Promise<string> {
    return new Promise((resolve) => {
        execFile('git', ['config', 'user.name'], (err, stdout) => {
            resolve(err ? 'Hey you' : stdout.trim());
        });
    });
}
function checkDailyReset(): void {
    const today = new Date().toDateString();
    if (dailyStats.date !== today) {
        dailyStats = { errors: 0, faaahs: 0, victories: 0, date: today };
    }
}


export function activate(context: vscode.ExtensionContext) {
    console.log('Fha Fha extension is active!');

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(check) No errors';
    statusBarItem.show();
    //statusBarItem.command = 'fha-fha-extension.toggleMute';
    statusBarItem.tooltip = 'Click to mute/unmute Fha Fha';

    const rageQuitBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    rageQuitBar.text = '🏳️';
    rageQuitBar.tooltip = 'Rage Quit';
    rageQuitBar.command = 'fha-fha-extension.rageQuit';
    rageQuitBar.show();
    context.subscriptions.push(rageQuitBar);

    const saveListener = vscode.workspace.onDidSaveTextDocument(async () => {
        lastSaveTime = Date.now();
        const config = vscode.workspace.getConfiguration('fhaFha');
        if (config.get<string>('triggerMode', 'onType') !== 'onSave') { return; }
        if (!config.get<boolean>('enabled', true)) { return; }

        // If any open document has merge conflict markers, skip triggering sounds to avoid noise during conflict resolution
        if (debounceTimer) { clearTimeout(debounceTimer); }
        debounceTimer = setTimeout(async () => {
            const hasConflicts = vscode.workspace.textDocuments.some(doc =>
                doc.getText().includes('<<<<<<<')
            );
            if (hasConflicts) { return; }
            if (Date.now() - lastCheckoutTime < 5000) { return; }
            if (Date.now() - lastTypingTime < 2000) { return; }

            let currentErrorCount = 0;
            let currentWarningCount = 0;
            const ignoredPaths = ['node_modules', 'dist', 'out', '.vsix'];
            vscode.workspace.textDocuments.forEach(doc => {
                if (ignoredPaths.some(p => doc.uri.fsPath.includes(p))) { return; }
                const diagnostics = vscode.languages.getDiagnostics(doc.uri);
                currentErrorCount += diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
                currentWarningCount += diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;
            });


            if (currentErrorCount > lastErrorCount) {
                errorStreak++;
                const hour = new Date().getHours();
                const isLateNight = hour >= 22 || hour < 6;
                const lateNightMessages = [
                    "Bro, just go sleep. The bugs will still be here tomorrow.",
                    "Late night coding? Respect... but also, sleep.",
                    "Your bed misses you. Your code doesn't.",
                    "Go to bed, the bugs are winning.",
                    "Yaar so ja, fresh mind = fewer errors.",
                    "Error at this hour? Bold move. Try sleeping instead.",
                    "The only thing running slower than your code is your brain right now.",
                ];
                const userName = await getGitUserName();
                const personalizedMessages = [
                    `${userName}, what is this behavior?`,
                    `${userName} broke the build. Classic.`,
                    `Sir ${userName}, this is not it.`,
                ];
                const allMessages = [...funnyMessages, ...personalizedMessages];
                const msg = isLateNight
                    ? lateNightMessages[Math.floor(Math.random() * lateNightMessages.length)]
                    : allMessages[Math.floor(Math.random() * allMessages.length)];

                const envFileHasErrors = vscode.workspace.textDocuments.some(doc =>
                    path.basename(doc.fileName).startsWith('.env') &&
                    vscode.languages.getDiagnostics(doc.uri).some(d => d.severity === vscode.DiagnosticSeverity.Error)
                );

                if (envFileHasErrors) {
                    const sirenPath = config.get<string>('sirenSoundPath', '') || path.resolve(__dirname, '..', 'siren.mp3');
                    vscode.window.showErrorMessage('PANIC! Your .env file has errors! ABORT ABORT!');
                    playSound(sirenPath);
                } else {
                    const newCount = currentErrorCount - lastErrorCount;
                    checkDailyReset();
                    dailyStats.errors += newCount;
                    dailyStats.faaahs++;
                    const defaultPath = path.resolve(__dirname, '..', 'faaah.mp3');
                    const soundPath = config.get<string>('errorSoundPath', '') || defaultPath;
                    vscode.window.showInformationMessage(`Faaah! ${newCount} new error${newCount !== 1 ? 's' : ''}! ${msg}`);
                    const times = currentErrorCount >= 6 ? 3 : currentErrorCount >= 3 ? 2 : 1;
                    if (currentErrorCount >= 6) { flashRedBackground(); }
                    for (let i = 0; i < times; i++) {
                        setTimeout(() => playSoundWithCooldown(soundPath), i * 800)
                    }
                }
                if (errorStreak >= 3) {
                    vscode.window.showWarningMessage(`Achievement Unlocked: Code Destroyer! ${errorStreak} consecutive error sprees`);
                }
            } else if (currentErrorCount < lastErrorCount) {
                errorStreak = 0;
            }

            if (currentWarningCount > lastWarningCount) {
                const newCount = currentWarningCount - lastWarningCount;
                const defaultWarningPath = path.resolve(__dirname, '..', 'chime.mp3');
                const warningSoundPath = config.get<string>('warningSoundPath', '') || defaultWarningPath;
                vscode.window.showWarningMessage(`Careful! ${newCount} new warning${newCount !== 1 ? 's' : ''}!`);
                playSoundWithCooldown(warningSoundPath, 30000);
            }

            lastErrorCount = currentErrorCount;
            lastWarningCount = currentWarningCount;
            if (lastHadErrors && currentErrorCount === 0) {
                const defaultVictoryPath = path.resolve(__dirname, '..', 'victory.mp3');
                const victorySoundPath = config.get<string>('victorySoundPath', '') || defaultVictoryPath;
                vscode.window.showInformationMessage('All errors fixed! You absolute legend!');
                playSoundWithCooldown(victorySoundPath);
                dailyStats.victories++;
            }
            lastHadErrors = currentErrorCount > 0;
        }, 800); // 800ms — language server ko update karne ka time
    });
    const typingListener = vscode.workspace.onDidChangeTextDocument(() => {
        lastTypingTime = Date.now();
    });
    context.subscriptions.push(typingListener);

    context.subscriptions.push(saveListener);
    const terminalListener = vscode.window.onDidEndTerminalShellExecution(e => {
        const config = vscode.workspace.getConfiguration('fhaFha');
        if (!config.get<boolean>('enabled', true)) { return; }
        if (!config.get<boolean>('terminalSounds', true)) { return; }

        const exitCode = e.exitCode;
        if (exitCode === undefined) { return; }

        const cmd = e.execution.commandLine?.value?.toLowerCase() ?? '';
        const buildKeywords = ['build', 'compile', 'tsc', 'make', 'gradle', 'mvn', 'cargo', 'webpack', 'vite build', 'dotnet build', 'npm run build', 'npm run compile'];
        const isBuildCommand = buildKeywords.some(kw => cmd.includes(kw));

        const buildFailMessages = [
            "Build failed. The code has spoken. 💀",
            "Congratulations! You broke the build. Again.",
            "npm run build = npm run cry 😭",
            "Your build is having an existential crisis.",
            "Error: skill issue detected. Exit code: " + exitCode,
            "The compiler looked at your code and said no.",
            "Build failed faster than your confidence.",
            "Even the CI is judging you right now.",
        ];

        const buildSuccessMessages = [
            "It compiles! Ship it before anything changes. 🚀",
            "Build passed! Screenshot it, this is rare.",
            "Green build! Go touch some grass. 🌿",
            "LGTM... for now. Don't touch it.",
            "It works! Nobody knows why, but it works. ✅",
            "Build succeeded. Your ancestors are proud.",
            "One small step for dev, one giant leap for the codebase. 🏆",
        ];

        if (exitCode !== 0) {
            const msg = buildFailMessages[Math.floor(Math.random() * buildFailMessages.length)];
            const soundPath = config.get<string>('errorSoundPath', '') || path.resolve(__dirname, '..', 'faaah.mp3');
            vscode.window.showErrorMessage(`Faaah! ${msg}`);
            playSoundWithCooldown(soundPath);
        } else if (isBuildCommand) {
            const msg = buildSuccessMessages[Math.floor(Math.random() * buildSuccessMessages.length)];
            const victorySoundPath = config.get<string>('victorySoundPath', '') || path.resolve(__dirname, '..', 'victory.mp3');
            vscode.window.showInformationMessage(msg);
            playSoundWithCooldown(victorySoundPath);
        }
    });
    context.subscriptions.push(terminalListener);




    const muteBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    muteBar.text = '$(mic)';
    muteBar.tooltip = 'Click to mute Fha Fha';
    muteBar.command = 'fha-fha-extension.toggleMute';
    muteBar.show();
    context.subscriptions.push(muteBar);

    const zenBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
    const isZenOn = vscode.workspace.getConfiguration('fhaFha').get<boolean>('zenMode', false);
    zenBar.text = isZenOn ? '🧘🔕' : '🧘';
    zenBar.tooltip = isZenOn ? 'Zen Mode ON (sounds muted) — click to disable' : 'Click to enable Zen Mode (notifications only, no sound)';
    zenBar.command = 'fha-fha-extension.toggleZen';
    zenBar.show();
    context.subscriptions.push(zenBar);

    context.subscriptions.push(statusBarItem);

    const disposable = vscode.languages.onDidChangeDiagnostics(() => {
        const config = vscode.workspace.getConfiguration('fhaFha');
        if (config.get<string>('triggerMode', 'onType') === 'onSave') { return; }
        const hasConflicts = vscode.workspace.textDocuments.some(doc =>
            doc.getText().includes('<<<<<<<')
        );
        if (hasConflicts) { return; }

        if (Date.now() - lastCheckoutTime < 5000) { return; } // Don't trigger on checkout
        const debounceMs = config.get<number>('debounceMs', 500);

        if (debounceTimer) { clearTimeout(debounceTimer); }

        debounceTimer = setTimeout(async () => {
            if (Date.now() - lastTypingTime < 2000) { return; }
            if (!config.get<boolean>('enabled', true)) { return; }
            if (config.get<string>('triggerMode', 'onType') === 'onSave' && Date.now() - lastSaveTime > 3000) { return; }
            let currentErrorCount = 0;
            let currentWarningCount = 0;

            const ignoredPaths = ['node_modules', 'dist', 'out', '.vsix'];
            vscode.workspace.textDocuments.forEach(doc => {
                if (ignoredPaths.some(p => doc.uri.fsPath.includes(p))) { return; }
                const diagnostics = vscode.languages.getDiagnostics(doc.uri);
                currentErrorCount += diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
                currentWarningCount += diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;
            });



            if (currentErrorCount > 0) {
                statusBarItem.text = `$(error) ${currentErrorCount} error${currentErrorCount !== 1 ? 's' : ''}`;
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            } else {
                statusBarItem.text = '$(check) No errors';
                statusBarItem.backgroundColor = undefined;
            }

            if (currentErrorCount > lastErrorCount) {
                errorStreak++;
                const hour = new Date().getHours();
                const isLateNight = hour >= 22 || hour < 6;

                const lateNightMessages = [
                    "Bro, just go sleep. The bugs will still be here tomorrow.",
                    "Late night coding? Respect... but also, sleep.",
                    "Your bed misses you. Your code doesn't.",
                    "Go to bed, the bugs are winning.",
                    "Yaar so ja, fresh mind = fewer errors.",
                    "Error at this hour? Bold move. Try sleeping instead.",
                    "The only thing running slower than your code is your brain right now.",
                ];
                const userName = await getGitUserName();
                const personalizedMessages = [
                    `${userName}, what is this behavior?`,
                    `${userName} broke the build. Classic.`,
                    `Sir ${userName}, this is not it.`,
                ];
                const allMessages = [...funnyMessages, ...personalizedMessages];
                const msg = isLateNight
                    ? lateNightMessages[Math.floor(Math.random() * lateNightMessages.length)]
                    : allMessages[Math.floor(Math.random() * allMessages.length)];

                // .env file check
                const envFileHasErrors = vscode.workspace.textDocuments.some(doc =>
                    path.basename(doc.fileName).startsWith('.env') &&
                    vscode.languages.getDiagnostics(doc.uri).some(d => d.severity === vscode.DiagnosticSeverity.Error)
                );

                if (envFileHasErrors) {
                    const sirenPath = config.get<string>('sirenSoundPath', '') || path.resolve(__dirname, '..', 'siren.mp3');
                    vscode.window.showErrorMessage('PANIC! Your .env file has errors! ABORT ABORT!');
                    if (!config.get<boolean>('zenMode', false)) { playSound(sirenPath, config.get<number>('volume', 100)); }
                } else {
                    const newCount = currentErrorCount - lastErrorCount;
                    checkDailyReset();
                    dailyStats.errors += newCount;
                    dailyStats.faaahs++;

                    const defaultPath = path.resolve(__dirname, '..', 'faaah.mp3');
                    const soundPath = config.get<string>('errorSoundPath', '') || defaultPath;
                    vscode.window.showInformationMessage(`Faaah! ${newCount} new error${newCount !== 1 ? 's' : ''}! ${msg}`);
                    const times = currentErrorCount >= 6 ? 3 : currentErrorCount >= 3 ? 2 : 1;
                    if (currentErrorCount >= 6) {
                        flashRedBackground();
                    }

                    for (let i = 0; i < times; i++) {
                        setTimeout(() => playSoundWithCooldown(soundPath), i * 800);
                    }
                }

                if (errorStreak >= 3) {
                    vscode.window.showWarningMessage(`Achievement Unlocked: Code Destroyer! ${errorStreak} consecutive error sprees`);
                }
            } else if (currentErrorCount < lastErrorCount) {
                errorStreak = 0;
            }


            if (currentWarningCount > lastWarningCount) {
                const newCount = currentWarningCount - lastWarningCount;
                const defaultWarningPath = path.resolve(__dirname, '..', 'chime.mp3');
                const warningSoundPath = config.get<string>('warningSoundPath', '') || defaultWarningPath;
                vscode.window.showWarningMessage(`Careful! ${newCount} new warning${newCount !== 1 ? 's' : ''}!`);
                playSoundWithCooldown(warningSoundPath, 30000);
            }

            lastErrorCount = currentErrorCount;
            lastWarningCount = currentWarningCount;
            if (lastHadErrors && currentErrorCount === 0) {
                const defaultVictoryPath = path.resolve(__dirname, '..', 'victory.mp3');
                const victorySoundPath = config.get<string>('victorySoundPath', '') || defaultVictoryPath;
                vscode.window.showInformationMessage('All errors fixed! You absolute legend!');
                playSoundWithCooldown(victorySoundPath);
                dailyStats.victories++;
            }
            lastHadErrors = currentErrorCount > 0;

        }, debounceMs);
    });
    const toggleCommand = vscode.commands.registerCommand('fha-fha-extension.toggleMute', () => {
        const cfg = vscode.workspace.getConfiguration('fhaFha');
        const current = cfg.get<boolean>('enabled', true);
        cfg.update('enabled', !current, vscode.ConfigurationTarget.Global);
        if (current) {
            muteBar.text = '$(mute)';
            muteBar.tooltip = 'Fha Fha is muted — click to unmute';
            vscode.window.showInformationMessage('Fha Fha muted 🔇');
        } else {
            muteBar.text = '$(mic)';
            muteBar.tooltip = 'Click to mute Fha Fha';
            vscode.window.showInformationMessage('Fha Fha unmuted 🔊');
        }
    });

    const rageQuitCommand = vscode.commands.registerCommand('fha-fha-extension.rageQuit', () => {
        checkDailyReset();
        const rageVol = vscode.workspace.getConfiguration('fhaFha').get<number>('volume', 100);
        playSound(path.resolve(__dirname, '..', 'sad.mp3'), rageVol);
        const scoreText = `🔥 I survived ${dailyStats.errors} bugs, triggered ${dailyStats.faaahs} Faaahs, and earned ${dailyStats.victories} victories today with the Faah Faah Extension for VS Code! 🐛`;
        vscode.env.clipboard.writeText(scoreText);
        vscode.window.showInformationMessage('I Give Up 🏳️ Score copied to clipboard — share karo!');
    });

    context.subscriptions.push(rageQuitCommand);

    context.subscriptions.push(toggleCommand);
    const toggleZenCommand = vscode.commands.registerCommand('fha-fha-extension.toggleZen', () => {
        const cfg = vscode.workspace.getConfiguration('fhaFha');
        const current = cfg.get<boolean>('zenMode', false);
        cfg.update('zenMode', !current, vscode.ConfigurationTarget.Global);
        if (!current) {
            zenBar.text = '🧘🔕';
            zenBar.tooltip = 'Zen Mode ON (sounds muted) — click to disable';
            vscode.window.showInformationMessage('Zen Mode ON 🧘 Notifications will show, sounds are muted.');
        } else {
            zenBar.text = '🧘';
            zenBar.tooltip = 'Click to enable Zen Mode (notifications only, no sound)';
            vscode.window.showInformationMessage('Zen Mode OFF 🔊');
        }
    });
    context.subscriptions.push(toggleZenCommand);

    context.subscriptions.push(disposable);

    const headWatcher = vscode.workspace.createFileSystemWatcher('**/.git/HEAD');
    headWatcher.onDidChange(() => {
        lastCheckoutTime = Date.now();
        lastErrorCount = 0;
        lastWarningCount = 0;
        lastHadErrors = false;
    });
    context.subscriptions.push(headWatcher);

}

export function deactivate() { }

