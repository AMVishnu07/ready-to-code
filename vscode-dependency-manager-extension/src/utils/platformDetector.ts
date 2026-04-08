import { platform } from 'os';

export function detectPlatform(): string {
    const osPlatform = platform();
    switch (osPlatform) {
        case 'darwin':
            return 'macOS';
        case 'win32':
            return 'Windows';
        case 'linux':
            return 'Linux';
        default:
            return 'Unknown';
    }
}