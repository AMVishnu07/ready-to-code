import * as vscode from 'vscode';
import { DependencyScanner } from '../services/dependencyScanner';
import { SystemAnalyzer } from '../services/systemAnalyzer';
import { DatabaseManager } from '../services/databaseManager';
import { AuthManager } from '../services/authManager';

export async function runCommand() {
    const dependencyScanner = new DependencyScanner();
    const systemAnalyzer = new SystemAnalyzer();
    const databaseManager = new DatabaseManager();
    const authManager = new AuthManager();

    try {
        // Scan the system for existing dependencies
        const installedDependencies = await dependencyScanner.scan();

        // Analyze the system for any issues
        const issues = await systemAnalyzer.analyze();

        // Check the database for required dependencies
        const requiredDependencies = await databaseManager.getRequiredDependencies(installedDependencies);

        // If there are missing dependencies, prompt for authorization to install
        if (requiredDependencies.length > 0) {
            const authorized = await authManager.requestAuthorization(requiredDependencies);
            if (!authorized) {
                vscode.window.showErrorMessage('User authorization required to install missing dependencies.');
                return;
            }
            await dependencyScanner.installDependencies(requiredDependencies);
        }

        // Start the debugging process
        vscode.debug.startDebugging(undefined, {
            type: 'node',
            request: 'launch',
            name: 'Launch Program',
            program: '${workspaceFolder}/app.js', // Adjust as necessary
        });

        vscode.window.showInformationMessage('Running the application with all required dependencies.');

    } catch (error) {
        vscode.window.showErrorMessage(`Error running the command: ${error.message}`);
    }
}