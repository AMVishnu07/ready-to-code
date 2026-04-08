import * as vscode from 'vscode';

export class AuthManager {
    private static instance: AuthManager;

    private constructor() {}

    public static getInstance(): AuthManager {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    public async requestAuthorization(): Promise<boolean> {
        const userResponse = await vscode.window.showInformationMessage(
            'This extension requires authorization to install missing dependencies. Do you want to proceed?',
            { modal: true },
            'Yes',
            'No'
        );

        return userResponse === 'Yes';
    }

    public async promptForCredentials(): Promise<{ username: string; password: string } | null> {
        const username = await vscode.window.showInputBox({
            prompt: 'Enter your username',
            ignoreFocusOut: true,
        });

        const password = await vscode.window.showInputBox({
            prompt: 'Enter your password',
            password: true,
            ignoreFocusOut: true,
        });

        if (username && password) {
            return { username, password };
        }

        return null;
    }
}