import * as vscode from 'vscode';
import * as path from 'path';
import { execFile } from 'child_process';
import * as https from 'https';

let lastErrorCount = 0;
let lastWarningCount = 0;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let statusBarItem: vscode.StatusBarItem;
let lastHadErrors = false;
let errorStreak = 0;
let dailyStats = { errors: 0, faaahs: 0, victories: 0, fixes: 0, hourlyErrors: new Array(24).fill(0) as number[], fileErrors: {} as Record<string, number>, date: new Date().toDateString() };
let lastSaveTime = 0;
let lastCheckoutTime = 0;
let lastTypingTime = 0;
let lastSoundPlayedAt = 0;
let scoresBar: vscode.StatusBarItem;
let scoresInterval: NodeJS.Timeout | undefined;
type MatchScore = { sport: string; homeTeam: string; awayTeam: string; homeScore: string; awayScore: string; detail: string; };
let lastScores: MatchScore[] = [];

const ESPN_ENDPOINTS: Record<string, string> = {
    'soccer-epl': 'soccer/eng.1',
    'soccer-ucl': 'soccer/UEFA.CHAMPIONS_LEAGUE',
    'soccer-laliga': 'soccer/esp.1',
    'soccer-bundesliga': 'soccer/ger.1',
    'soccer-seriea': 'soccer/ita.1',
    'basketball-nba': 'basketball/nba',
    'football-nfl': 'football/nfl',
    'baseball-mlb': 'baseball/mlb',
    'hockey-nhl': 'hockey/nhl',
    'cricket-ipl': 'cricket/ipl',
    'cricket-t20': 'cricket/ci.t20',
    'cricket-odi': 'cricket/ci.odi',
    'cricket-tests': 'cricket/ci.tests',

};


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

function playSoundWithCooldown(audioPath: string, cooldownMs = 10000, volumeOverride?: number): void {
    const config = vscode.workspace.getConfiguration('fhaFha');
    if (config.get<boolean>('zenMode', false)) { return; }
    if (Date.now() - lastSoundPlayedAt < cooldownMs) { return; }
    if (!vscode.window.state.focused) { return; }
    lastSoundPlayedAt = Date.now();
    const volume = volumeOverride ?? config.get<number>('volume', 100);
    playSound(audioPath, volume);
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
        dailyStats = { errors: 0, faaahs: 0, victories: 0, fixes: 0, hourlyErrors: new Array(24).fill(0), fileErrors: {}, date: today };
    }
}


function httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function fetchESPNScores(sportPath: string): Promise<MatchScore[]> {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard`;
    const data = JSON.parse(await httpsGet(url));
    const matches: MatchScore[] = [];
    for (const event of data.events || []) {
        const comp = event.competitions?.[0];
        if (!comp || comp.status?.type?.state !== 'in') continue;
        const home = comp.competitors?.find((c: { homeAway: string; team: { abbreviation: string }; score: string }) => c.homeAway === 'home');
        const away = comp.competitors?.find((c: { homeAway: string; team: { abbreviation: string }; score: string }) => c.homeAway === 'away');
        matches.push({
            sport: sportPath,
            homeTeam: home?.team?.abbreviation || 'HOM',
            awayTeam: away?.team?.abbreviation || 'AWY',
            homeScore: home?.score || '0',
            awayScore: away?.score || '0',
            detail: comp.status?.displayClock || comp.status?.type?.detail || '',
        });
    }
    return matches;
}

async function fetchCricketScores(apiKey: string): Promise<MatchScore[]> {
    const data = JSON.parse(await httpsGet(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`));
    const matches: MatchScore[] = [];
    for (const match of data.data || []) {
        if (!match.matchStarted || match.matchEnded) continue;
        const s0 = match.score?.[0];
        const s1 = match.score?.[1];
        matches.push({
            sport: 'cricket',
            homeTeam: match.teams?.[0] || 'T1',
            awayTeam: match.teams?.[1] || 'T2',
            homeScore: s0 ? `${s0.r}/${s0.w}` : '—',
            awayScore: s1 ? `${s1.r}/${s1.w}` : '—',
            detail: s0 ? `(${s0.o} ov)` : '',
        });
    }
    return matches;
}

function scoreEmoji(sport: string): string {
    if (sport.includes('cricket')) return '🏏';
    if (sport.includes('soccer')) return '⚽';
    if (sport.includes('basketball')) return '🏀';
    if (sport.includes('football')) return '🏈';
    if (sport.includes('baseball')) return '⚾';
    if (sport.includes('hockey')) return '🏒';
    return '🏆';
}

async function updateLiveScores(): Promise<void> {
    const config = vscode.workspace.getConfiguration('fhaFha');
    const sports = config.get<string[]>('liveScores.sports', []);
    // const cricKey = config.get<string>('liveScores.cricketApiKey', '');
    const showPopup = config.get<boolean>('liveScores.showScoreChangePopup', true);
    const allScores: MatchScore[] = [];
    for (const sport of sports) {
        try {
            if (ESPN_ENDPOINTS[sport]) {
                allScores.push(...await fetchESPNScores(ESPN_ENDPOINTS[sport]));
            }
        } catch { /* ignore network errors */ }
    }

    if (showPopup) {
        for (const ns of allScores) {
            const old = lastScores.find(s => s.homeTeam === ns.homeTeam && s.awayTeam === ns.awayTeam);
            if (old && (old.homeScore !== ns.homeScore || old.awayScore !== ns.awayScore)) {
                vscode.window.showInformationMessage(`${scoreEmoji(ns.sport)} ${ns.homeTeam} ${ns.homeScore} – ${ns.awayScore} ${ns.awayTeam} ${ns.detail}`);
            }
        }
    }
    lastScores = allScores;
    if (allScores.length === 0) {
        scoresBar.text = '🏆 Live';
        scoresBar.tooltip = 'No live matches right now. Click to toggle.';
    } else {
        scoresBar.text = allScores.slice(0, 2).map(s => `${scoreEmoji(s.sport)} ${s.homeTeam} ${s.homeScore}-${s.awayScore} ${s.awayTeam}`).join('  ');
        scoresBar.tooltip = allScores.map(s => `${scoreEmoji(s.sport)} ${s.homeTeam} ${s.homeScore} – ${s.awayScore} ${s.awayTeam} ${s.detail}`).join('\n');
    }
    scoresBar.show();
}

function startScorePolling(): void {
    scoresBar.text = '🏆 Live';
    scoresBar.show();
    updateLiveScores();
    const mins = vscode.workspace.getConfiguration('fhaFha').get<number>('liveScores.pollIntervalMinutes', 5);
    scoresInterval = setInterval(updateLiveScores, mins * 60 * 1000);
}


function stopScorePolling(): void {
    if (scoresInterval) { clearInterval(scoresInterval); scoresInterval = undefined; }
    scoresBar.hide();
}

function getStatsWebviewHtml(): string {
    checkDailyReset();
    const maxHour = Math.max(...dailyStats.hourlyErrors);
    const peakHour = maxHour === 0 ? -1 : dailyStats.hourlyErrors.indexOf(maxHour);
    const peakHourLabel = peakHour === -1 ? '—' : `${String(peakHour).padStart(2, '0')}:00 – ${String(peakHour + 1).padStart(2, '0')}:00`;
    const topFiles = Object.entries(dailyStats.fileErrors).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topFilesHtml = topFiles.length === 0
        ? '<p style="color:#888;margin:0">No buggy files today! 🎉</p>'
        : topFiles.map(([file, count]) =>
            `<div class="file-row"><span class="fname">${file}</span><span class="fcount">${count}</span></div>`
        ).join('');
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>
        body{font-family:var(--vscode-font-family);background:var(--vscode-editor-background);color:var(--vscode-editor-foreground);padding:28px;margin:0}
        h1{font-size:1.4rem;margin:0 0 4px}
        .date{color:var(--vscode-descriptionForeground);font-size:.85rem;margin-bottom:24px}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:28px}
        .card{background:var(--vscode-editor-inactiveSelectionBackground);border-radius:8px;padding:18px;text-align:center}
        .num{font-size:2.4rem;font-weight:700}
        .red{color:#f14c4c}.green{color:#23d18b}.yellow{color:#e5c07b}.blue{color:#61afef}
        .label{font-size:.78rem;color:var(--vscode-descriptionForeground);margin-top:6px}
        h2{font-size:.95rem;margin:0 0 10px;color:var(--vscode-descriptionForeground);text-transform:uppercase;letter-spacing:.04em}
        .section{margin-bottom:24px}
        .peak{font-size:1.4rem;font-weight:700;color:#e5c07b}
        .file-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--vscode-editorWidget-border,#3a3a3a)}
        .fname{font-family:var(--vscode-editor-font-family,monospace);font-size:.9rem}
        .fcount{color:#f14c4c;font-weight:700;font-size:.9rem}
    </style></head><body>
    <h1>📊 Today's Fha Fha Stats</h1>
    <div class="date">${dailyStats.date}</div>
    <div class="grid">
        <div class="card"><div class="num red">${dailyStats.errors}</div><div class="label">Errors Made</div></div>
        <div class="card"><div class="num green">${dailyStats.fixes}</div><div class="label">Errors Fixed</div></div>
        <div class="card"><div class="num blue">${dailyStats.victories}</div><div class="label">Full Victories</div></div>
        <div class="card"><div class="num yellow">${dailyStats.faaahs}</div><div class="label">Faaahs Triggered</div></div>
    </div>
    <div class="section"><h2>⏰ Peak Error Hour</h2><div class="peak">${peakHourLabel}</div></div>
    <div class="section"><h2>📁 Most Buggy Files</h2>${topFilesHtml}</div>
    </body></html>`;
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
            const openTabUris = new Set<string>();
            for (const group of vscode.window.tabGroups.all) {
                for (const tab of group.tabs) {
                    if (tab.input instanceof vscode.TabInputText) {
                        openTabUris.add(tab.input.uri.toString());
                    }
                }
            }
            for (const [uri, diagnostics] of vscode.languages.getDiagnostics()) {
                if (!openTabUris.has(uri.toString())) { continue; }
                if (ignoredPaths.some(p => uri.fsPath.includes(p))) { continue; }
                currentErrorCount += diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
                currentWarningCount += diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;
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
                    dailyStats.hourlyErrors[new Date().getHours()]++;
                    for (const [uri, diagnostics] of vscode.languages.getDiagnostics()) {
                        if (ignoredPaths.some(p => uri.fsPath.includes(p))) { continue; }
                        const errCount = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
                        if (errCount > 0) { const fn = path.basename(uri.fsPath); dailyStats.fileErrors[fn] = (dailyStats.fileErrors[fn] || 0) + errCount; }
                    }

                    const defaultPath = path.resolve(__dirname, '..', 'faaah.mp3');
                    const soundPath = config.get<string>('errorSoundPath', '') || defaultPath;
                    vscode.window.showInformationMessage(`Faaah! ${newCount} new error${newCount !== 1 ? 's' : ''}! ${msg}`);
                    const times = currentErrorCount >= 10 ? 3 : currentErrorCount >= 5 ? 2 : 1;
                    const intensityVolume = currentErrorCount >= 10 ? 100 : currentErrorCount >= 5 ? 80 : 60;
                    const gap = currentErrorCount >= 10 ? 300 : currentErrorCount >= 5 ? 500 : 800;
                    if (currentErrorCount >= 6) { flashRedBackground(); }
                    const zenOn = config.get<boolean>('zenMode', false);
                    if (!zenOn && vscode.window.state.focused && Date.now() - lastSoundPlayedAt >= 10000) {
                        lastSoundPlayedAt = Date.now();
                        for (let i = 0; i < times; i++) {
                            setTimeout(() => playSound(soundPath, intensityVolume), i * gap);
                        }
                    }


                }
                if (errorStreak >= 3) {
                    vscode.window.showWarningMessage(`Achievement Unlocked: Code Destroyer! ${errorStreak} consecutive error sprees`);
                }
            } else if (currentErrorCount < lastErrorCount) {
                errorStreak = 0;
                dailyStats.fixes += lastErrorCount - currentErrorCount;
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

    // Live Scores bar
    scoresBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 95);
    scoresBar.command = 'fha-fha-extension.openScoresMenu';
    context.subscriptions.push(scoresBar);
    if (vscode.workspace.getConfiguration('fhaFha').get<boolean>('liveScores.enabled', false)) {
        startScorePolling();
        scoresBar.show();
    }

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
                    dailyStats.hourlyErrors[new Date().getHours()]++;
                    for (const [uri, diagnostics] of vscode.languages.getDiagnostics()) {
                        if (ignoredPaths.some(p => uri.fsPath.includes(p))) { continue; }
                        const errCount = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
                        if (errCount > 0) { const fn = path.basename(uri.fsPath); dailyStats.fileErrors[fn] = (dailyStats.fileErrors[fn] || 0) + errCount; }
                    }


                    const defaultPath = path.resolve(__dirname, '..', 'faaah.mp3');
                    const soundPath = config.get<string>('errorSoundPath', '') || defaultPath;
                    vscode.window.showInformationMessage(`Faaah! ${newCount} new error${newCount !== 1 ? 's' : ''}! ${msg}`);
                    const times = currentErrorCount >= 10 ? 3 : currentErrorCount >= 5 ? 2 : 1;
                    const intensityVolume = currentErrorCount >= 10 ? 100 : currentErrorCount >= 5 ? 80 : 60;
                    const gap = currentErrorCount >= 10 ? 300 : currentErrorCount >= 5 ? 500 : 800;
                    if (currentErrorCount >= 6) { flashRedBackground(); }
                    const zenOn = config.get<boolean>('zenMode', false);
                    if (!zenOn && vscode.window.state.focused && Date.now() - lastSoundPlayedAt >= 10000) {
                        lastSoundPlayedAt = Date.now();
                        for (let i = 0; i < times; i++) {
                            setTimeout(() => playSound(soundPath, intensityVolume), i * gap);
                        }
                    }
                }

                if (errorStreak >= 3) {
                    vscode.window.showWarningMessage(`Achievement Unlocked: Code Destroyer! ${errorStreak} consecutive error sprees`);
                }
            } else if (currentErrorCount < lastErrorCount) {
                errorStreak = 0;
                dailyStats.fixes += lastErrorCount - currentErrorCount;
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
        vscode.commands.executeCommand('fha-fha-extension.viewStats');
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


    const toggleScoresCommand = vscode.commands.registerCommand('fha-fha-extension.toggleLiveScores', () => {
        const cfg = vscode.workspace.getConfiguration('fhaFha');
        const current = cfg.get<boolean>('liveScores.enabled', false);
        cfg.update('liveScores.enabled', !current, vscode.ConfigurationTarget.Global);
        if (!current) {
            startScorePolling();
            vscode.window.showInformationMessage('Live Scores ON 🏆 — Go to Settings to pick your sports.');
        } else {
            stopScorePolling();
            vscode.window.showInformationMessage('Live Scores OFF');
        }
    });
    context.subscriptions.push(toggleScoresCommand);

    const checkScoresNowCommand = vscode.commands.registerCommand('fha-fha-extension.checkScoresNow', () => {
        updateLiveScores().then(() => {
            if (lastScores.length === 0) {
                vscode.window.showInformationMessage('🏆 No live matches right now.');
            }
        });
    }

    );
    context.subscriptions.push(checkScoresNowCommand);
    const openScoresMenuCommand = vscode.commands.registerCommand('fha-fha-extension.openScoresMenu', async () => {
        const SPORTS_LIST = [
            { label: '🏏 Cricket - IPL', id: 'cricket-ipl' },
            { label: '🏏 Cricket - T20', id: 'cricket-t20' },
            { label: '🏏 Cricket - ODI', id: 'cricket-odi' },
            { label: '🏏 Cricket - Tests', id: 'cricket-tests' },
            { label: '⚽ Soccer - EPL', id: 'soccer-epl' },
            { label: '⚽ Soccer - Champions League', id: 'soccer-ucl' },
            { label: '⚽ Soccer - La Liga', id: 'soccer-laliga' },
            { label: '⚽ Soccer - Bundesliga', id: 'soccer-bundesliga' },
            { label: '⚽ Soccer - Serie A', id: 'soccer-seriea' },
            { label: '🏀 Basketball - NBA', id: 'basketball-nba' },
            { label: '🏈 Football - NFL', id: 'football-nfl' },
            { label: '⚾ Baseball - MLB', id: 'baseball-mlb' },
            { label: '🏒 Hockey - NHL', id: 'hockey-nhl' },
        ];
        const cfg = vscode.workspace.getConfiguration('fhaFha');
        const currentSports = cfg.get<string[]>('liveScores.sports', []);
        const picks = await vscode.window.showQuickPick(
            SPORTS_LIST.map(s => ({ label: s.label, id: s.id, picked: currentSports.includes(s.id) })),
            { canPickMany: true, title: '🏆 Live Scores — Select Sports', placeHolder: 'Choose sports to track' }
        );
        if (!picks) return;
        const selected = picks.map((p: { id: string }) => p.id);
        await cfg.update('liveScores.sports', selected, vscode.ConfigurationTarget.Global);
        if (selected.length > 0) {
            const enabled = cfg.get<boolean>('liveScores.enabled', false);
            if (!enabled) {
                await cfg.update('liveScores.enabled', true, vscode.ConfigurationTarget.Global);
                startScorePolling();
            } else {
                updateLiveScores();
            }
        }
    });
    context.subscriptions.push(openScoresMenuCommand);

    const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('fhaFha.liveScores.enabled')) {
            const enabled = vscode.workspace.getConfiguration('fhaFha').get<boolean>('liveScores.enabled', false);
            if (enabled) {
                startScorePolling();
            } else {
                stopScorePolling();
            }
        }
        if (e.affectsConfiguration('fhaFha.liveScores.sports')) {
            const enabled = vscode.workspace.getConfiguration('fhaFha').get<boolean>('liveScores.enabled', false);
            if (enabled) {
                updateLiveScores(); // Sports change hone par turant refresh
            }
        }
    });
    context.subscriptions.push(configWatcher);
    const viewStatsCommand = vscode.commands.registerCommand('fha-fha-extension.viewStats', () => {
        const panel = vscode.window.createWebviewPanel('fhaFhaStats', '📊 Fha Fha: Today\'s Stats', vscode.ViewColumn.One, {});
        panel.webview.html = getStatsWebviewHtml();
    });
    context.subscriptions.push(viewStatsCommand);

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

