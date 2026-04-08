import * as vscode from 'vscode';
import { DependencyScanner } from '../services/dependencyScanner';
import { AuthManager } from '../services/authManager';
import { DatabaseManager } from '../services/databaseManager';

export async function compile() {
    const dependencyScanner = new DependencyScanner();
    const authManager = new AuthManager();
    const databaseManager = new DatabaseManager();

    try {
        const missingDependencies = await dependencyScanner.scanForMissingDependencies();

        if (missingDependencies.length > 0) {
            const userConfirmed = await vscode.window.showInformationMessage(
                `The following dependencies are missing: ${missingDependencies.join(', ')}. Do you want to install them?`,
                { modal: true },
                'Yes',
                'No'
            );

            if (userConfirmed === 'Yes') {
                const userCredentials = await authManager.promptForCredentials();
                await dependencyScanner.installDependencies(missingDependencies, userCredentials);
                vscode.window.showInformationMessage('Missing dependencies have been installed.');
            } else {
                vscode.window.showWarningMessage('Compilation cannot proceed without the required dependencies.');
                return;
            }
        }

        // Proceed with compilation logic here
        vscode.window.showInformationMessage('Compilation successful.');
    } catch (error) {
        vscode.window.showErrorMessage(`Error during compilation: ${error.message}`);
    }
}