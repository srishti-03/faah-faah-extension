import * as vscode from 'vscode';
import * as path from 'path';
import { execFile } from 'child_process';

let lastErrorCount = 0;

export function activate(context: vscode.ExtensionContext) {
    console.log('Fha Fha extension is active!');

    // this is the even listener, it'll run whenever diagnostics (errors/warnings) change in the editor
    let disposable = vscode.languages.onDidChangeDiagnostics(e => {
        let currentErrorCount = 0;

        // It opens all files and check error at root levels
        vscode.workspace.textDocuments.forEach(doc => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            // will only count "error"(ignore warnings)
            currentErrorCount += diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
        });

        // Logic: if now also errors are more than the previous one then play the sounda
        if (currentErrorCount > lastErrorCount) {


            const audioPath = path.resolve(__dirname, '..', 'faaah.mp3');
            vscode.window.showInformationMessage("Faaah! Error caught!");

            if (process.platform === 'win32') {
                const psCommand = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; using System.Text; public class MCI { [DllImport("winmm.dll")] public static extern int mciSendString(string command, StringBuilder returnValue, int returnLength, IntPtr winHandle); }'; [MCI]::mciSendString('open "${audioPath}" type mpegvideo alias media', $null, 0, [IntPtr]::Zero); [MCI]::mciSendString('play media wait', $null, 0, [IntPtr]::Zero); [MCI]::mciSendString('close media', $null, 0, [IntPtr]::Zero)`;
                execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', psCommand],
                    (err, stdout, stderr) => {
                        if (err) console.error('Sound error:', err.message);
                        if (stderr) console.error('Sound stderr:', stderr);
                    }
                );
            } else if (process.platform === 'darwin') {
                execFile('afplay', [audioPath], (err) => {
                    if (err) console.error('Sound error:', err.message);
                });
            } else {
                execFile('paplay', [audioPath], (err) => {
                    if (err) console.error('Sound error:', err.message);
                });
            }


        }

        lastErrorCount = currentErrorCount;
    });


    context.subscriptions.push(disposable);
}

export function deactivate() { }