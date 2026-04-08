import * as vscode from 'vscode';
import { compileCommand } from './commands/compile';
import { runCommand } from './commands/run';
import { scanCommand } from './commands/scan';

export function activate(context: vscode.ExtensionContext) {
    const compileDisposable = vscode.commands.registerCommand('extension.compile', compileCommand);
    const runDisposable = vscode.commands.registerCommand('extension.run', runCommand);
    const scanDisposable = vscode.commands.registerCommand('extension.scan', scanCommand);

    context.subscriptions.push(compileDisposable);
    context.subscriptions.push(runDisposable);
    context.subscriptions.push(scanDisposable);
}

export function deactivate() {}