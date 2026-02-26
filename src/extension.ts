import * as vscode from 'vscode';
import * as path from 'path';
import { execFile } from 'child_process';

let lastErrorCount = 0;
let lastWarningCount = 0;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let statusBarItem: vscode.StatusBarItem;

function playSound(audioPath: string): void {
    if (process.platform === 'win32') {
        const psCommand = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; using System.Text; public class MCI { [DllImport("winmm.dll")] public static extern int mciSendString(string command, StringBuilder returnValue, int returnLength, IntPtr winHandle); }'; [MCI]::mciSendString('open "${audioPath}" type mpegvideo alias media', $null, 0, [IntPtr]::Zero); [MCI]::mciSendString('play media wait', $null, 0, [IntPtr]::Zero); [MCI]::mciSendString('close media', $null, 0, [IntPtr]::Zero)`;
        execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', psCommand],
            (err, _stdout, stderr) => {
                if (err) { console.error('Sound error:', err.message); }
                if (stderr) { console.error('Sound stderr:', stderr); }
            }
        );
    } else if (process.platform === 'darwin') {
        execFile('afplay', [audioPath], (err) => {
            if (err) { console.error('Sound error:', err.message); }
        });
    } else {
        execFile('paplay', [audioPath], (err) => {
            if (err) { console.error('Sound error:', err.message); }
        });
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Fha Fha extension is active!');

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(check) No errors';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    const disposable = vscode.languages.onDidChangeDiagnostics(() => {
        const config = vscode.workspace.getConfiguration('fhaFha');
        const debounceMs = config.get<number>('debounceMs', 500);

        if (debounceTimer) { clearTimeout(debounceTimer); }

        debounceTimer = setTimeout(() => {
            if (!config.get<boolean>('enabled', true)) { return; }

            let currentErrorCount = 0;
            let currentWarningCount = 0;

            vscode.workspace.textDocuments.forEach(doc => {
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
                const newCount = currentErrorCount - lastErrorCount;
                const defaultPath = path.resolve(__dirname, '..', 'faaah.mp3');
                const soundPath = config.get<string>('errorSoundPath', '') || defaultPath;
                vscode.window.showInformationMessage(`Faaah! ${newCount} new error${newCount !== 1 ? 's' : ''}!`);
                playSound(soundPath);
            }

            if (currentWarningCount > lastWarningCount) {
                const newCount = currentWarningCount - lastWarningCount;
                const defaultWarningPath = path.resolve(__dirname, '..', 'chime.mp3');
                const warningSoundPath = config.get<string>('warningSoundPath', '') || defaultWarningPath;
                vscode.window.showWarningMessage(`Careful! ${newCount} new warning${newCount !== 1 ? 's' : ''}!`);
                playSound(warningSoundPath);
            }

            lastErrorCount = currentErrorCount;
            lastWarningCount = currentWarningCount;
        }, debounceMs);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }
