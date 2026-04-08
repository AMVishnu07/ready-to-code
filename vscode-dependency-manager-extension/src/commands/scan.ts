import { commands, window } from 'vscode';
import { DependencyScanner } from '../services/dependencyScanner';
import { DatabaseManager } from '../services/databaseManager';

export async function scanDependencies() {
    const dependencyScanner = new DependencyScanner();
    const databaseManager = new DatabaseManager();

    try {
        const scanResult = await dependencyScanner.scan();
        await databaseManager.storeScanResult(scanResult);

        window.showInformationMessage('Scan completed successfully. Dependencies have been analyzed and stored.');
    } catch (error) {
        window.showErrorMessage(`Error during scanning: ${error.message}`);
    }
}

export function registerScanCommand() {
    commands.registerCommand('extension.scanDependencies', scanDependencies);
}