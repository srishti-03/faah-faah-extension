import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Fha Fha Extension Tests', () => {

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('fhafha-devss.fha-fha-extension'));
    });

    test('Extension should activate', async () => {
        const ext = vscode.extensions.getExtension('fhafha-devss.fha-fha-extension');
        assert.ok(ext);
        await ext!.activate();
        assert.strictEqual(ext!.isActive, true);
    });

    test('Default config: enabled should be true', () => {
        const config = vscode.workspace.getConfiguration('fhaFha');
        assert.strictEqual(config.get<boolean>('enabled', true), true);
    });

    test('Default config: triggerMode should be onType', () => {
        const config = vscode.workspace.getConfiguration('fhaFha');
        assert.strictEqual(config.get<string>('triggerMode', 'onType'), 'onType');
    });


    test('Command rageQuit should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('fha-fha-extension.rageQuit'));
    });
});
