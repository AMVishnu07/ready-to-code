export interface Dependency {
    name: string;
    version: string;
    installed: boolean;
}

export interface UserConfig {
    username: string;
    password: string;
    preferences: {
        autoInstall: boolean;
        notifyOnInstall: boolean;
    };
}

export interface ScanResult {
    dependencies: Dependency[];
    issues: string[];
}