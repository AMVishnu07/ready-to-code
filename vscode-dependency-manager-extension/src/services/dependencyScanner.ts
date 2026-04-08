import * as vscode from 'vscode';
import { DatabaseManager } from './databaseManager';
import { SystemAnalyzer } from './systemAnalyzer';

export class DependencyScanner {
    private dbManager: DatabaseManager;
    private systemAnalyzer: SystemAnalyzer;

    constructor() {
        this.dbManager = new DatabaseManager();
        this.systemAnalyzer = new SystemAnalyzer();
    }

    public async scanForDependencies(): Promise<void> {
        const installedDependencies = await this.systemAnalyzer.analyzeSystem();
        const requiredDependencies = await this.dbManager.getRequiredDependencies();

        const missingDependencies = this.findMissingDependencies(installedDependencies, requiredDependencies);
        if (missingDependencies.length > 0) {
            await this.promptForInstallation(missingDependencies);
        } else {
            vscode.window.showInformationMessage('All required dependencies are installed.');
        }
    }

    private findMissingDependencies(installed: string[], required: string[]): string[] {
        return required.filter(dep => !installed.includes(dep));
    }

    private async promptForInstallation(missingDependencies: string[]): Promise<void> {
        const userResponse = await vscode.window.showInformationMessage(
            `The following dependencies are missing: ${missingDependencies.join(', ')}. Do you want to install them?`,
            { modal: true },
            'Yes',
            'No'
        );

        if (userResponse === 'Yes') {
            await this.installDependencies(missingDependencies);
        }
    }

    private async installDependencies(dependencies: string[]): Promise<void> {
        // Logic to install dependencies goes here
        // This could involve calling the Go application or using npm/yarn
        vscode.window.showInformationMessage(`Installing dependencies: ${dependencies.join(', ')}`);
    }
}