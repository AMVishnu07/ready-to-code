// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Global variable to store the detected platform
let detectedPlatform = null;
let outputChannel = null;

// Predefined list of dependencies that require authentication/login
const loginRequiredDeps = new Set([
    'boto3',
    'firebase_admin',
    'openai',
    'google-cloud-storage',
    'google-cloud-bigquery',
    'azure-storage-blob',
    'awscli',
    'google-auth',
    'microsoft-graph'
]);

// Setup information for login-required dependencies
const loginSetupInfo = {
    'boto3': {
        message: 'boto3 requires AWS credentials',
        install: 'pip3 install boto3',
        setup: 'aws configure',
        docs: 'https://boto3.amazonaws.com/v1/documentation/api/latest/index.html'
    },
    'firebase_admin': {
        message: 'firebase_admin requires Firebase service account key',
        install: 'pip3 install firebase-admin',
        setup: 'Download service account key from Firebase Console and set GOOGLE_APPLICATION_CREDENTIALS',
        docs: 'https://firebase.google.com/docs/admin/setup'
    },
    'openai': {
        message: 'openai requires API key',
        install: 'pip3 install openai',
        setup: 'Set OPENAI_API_KEY environment variable',
        docs: 'https://platform.openai.com/docs/quickstart'
    },
    'google-cloud-storage': {
        message: 'google-cloud-storage requires Google Cloud credentials',
        install: 'pip3 install google-cloud-storage',
        setup: 'Set GOOGLE_APPLICATION_CREDENTIALS or run gcloud auth application-default login',
        docs: 'https://cloud.google.com/storage/docs/reference/libraries'
    },
    'google-cloud-bigquery': {
        message: 'google-cloud-bigquery requires Google Cloud credentials',
        install: 'pip3 install google-cloud-bigquery',
        setup: 'Set GOOGLE_APPLICATION_CREDENTIALS or run gcloud auth application-default login',
        docs: 'https://cloud.google.com/bigquery/docs/reference/libraries'
    },
    'azure-storage-blob': {
        message: 'azure-storage-blob requires Azure credentials',
        install: 'pip3 install azure-storage-blob',
        setup: 'Set AZURE_STORAGE_CONNECTION_STRING or use Azure CLI login',
        docs: 'https://docs.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-python'
    },
    'awscli': {
        message: 'awscli requires AWS credentials',
        install: 'pip3 install awscli',
        setup: 'aws configure',
        docs: 'https://aws.amazon.com/cli/'
    },
    'google-auth': {
        message: 'google-auth requires Google credentials',
        install: 'pip3 install google-auth',
        setup: 'Set GOOGLE_APPLICATION_CREDENTIALS or run gcloud auth application-default login',
        docs: 'https://google-auth.readthedocs.io/en/master/'
    },
    'microsoft-graph': {
        message: 'microsoft-graph requires Microsoft credentials',
        install: 'pip3 install msgraph-sdk',
        setup: 'Register app in Azure AD and set credentials',
        docs: 'https://docs.microsoft.com/en-us/graph/sdks/choose-authentication-providers'
    }
};

// Function to check if error indicates authentication issues
function isAuthError(errorMessage, stderr) {
    const authKeywords = [
        'NoCredentialsError',
        'API key',
        'authentication required',
        'authentication failed',
        'credentials',
        'login required',
        'access denied',
        'unauthorized',
        'permission denied',
        'invalid credentials',
        'missing credentials'
    ];
    
    const fullError = (errorMessage + ' ' + stderr).toLowerCase();
    return authKeywords.some(keyword => fullError.includes(keyword.toLowerCase()));
}

// Function to scan code for login-required dependencies
function scanForLoginRequiredDeps(filePath) {
    const detected = new Set();
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach(line => {
            // Check for imports of login-required dependencies
            loginRequiredDeps.forEach(dep => {
                if (line.includes(`import ${dep}`) || 
                    line.includes(`from ${dep}`) || 
                    line.includes(`require('${dep}')`) || 
                    line.includes(`require("${dep}")`)) {
                    detected.add(dep);
                }
            });
        });
    } catch (e) {
        // Ignore read errors
    }
    return detected;
}

// Reusable function to get the platform
function getPlatform() {
	return detectedPlatform;
}

// Function to request permission for download/install
async function requestPermission() {
	const result = await vscode.window.showInformationMessage(
		'Do you want to allow this extension to download and install required tools?',
		{ modal: true },
		'Allow',
		'Deny'
	);
	return result === 'Allow';
}

// Function to request permission for missing dependency installation
async function requestInstallPermission(missingDeps = []) {
	const depList = missingDeps.length > 0 ? missingDeps.join(', ') : 'dependencies';
	const result = await vscode.window.showInformationMessage(
		`Missing dependencies detected: ${depList}. Install now?`,
		{ modal: true },
		'Allow',
		'Deny'
	);
	return result === 'Allow';
}

function getInstallCommands(projectType, dependencies) {
	const commands = [];
	if (projectType === 'Python') {
		const installer = detectedPlatform === 'Windows' ? 'pip' : 'pip3';
		dependencies.forEach(dep => {
			commands.push(`${installer} install ${dep}`);
		});
	} else {
		dependencies.forEach(dep => {
			commands.push(`npm install ${dep}`);
		});
	}
	return commands;
}

function executeCommand(command, cwd) {
	return new Promise((resolve, reject) => {
		exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
			if (stdout) {
				outputChannel.appendLine(stdout.trim());
			}
			if (stderr) {
				outputChannel.appendLine('');
				outputChannel.appendLine('--- Stderr ---');
				outputChannel.appendLine(stderr.trim());
			}
			if (error) {
				outputChannel.appendLine(`❌ Command failed: ${command}`);
				reject(error);
			} else {
				resolve();
			}
		});
	});
}

// Function to get the workspace root path
function getWorkspaceRoot() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return null;
	}
	return workspaceFolders[0].uri.fsPath;
}

// Built-in Python modules to filter
const PYTHON_BUILTINS = new Set([
	'os', 'sys', 'path', 'time', 'datetime', 'json', 'math', 'random', 
	're', 'collections', 'itertools', 'functools', 'operator', 'string',
	'io', 'pickle', 'csv', 'sqlite3', 'urllib', 'http', 'socket', 'ssl',
	'threading', 'multiprocessing', 'subprocess', 'logging', 'getpass',
	'argparse', 'configparser', 'dataclasses', 'enum', 'abc', 'typing',
	'copy', 'pprint', 'inspect', 'importlib', 'unittest', 'doctest'
]);

// Built-in Node.js modules to filter
const NODE_BUILTINS = new Set([
	'fs', 'path', 'http', 'https', 'net', 'stream', 'events', 'util', 'os',
	'sys', 'process', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram',
	'dns', 'domain', 'console', 'assert', 'querystring', 'url', 'vm', 'zlib',
	'tls', 'readline', 'repl', 'module', 'perf_hooks', 'async_hooks'
]);

// Scan Python files for imports
function scanPythonImports(workspaceRoot) {
	const dependencies = {};
	if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel('Ready To Code Execution');
	}
	
	try {
		outputChannel.appendLine('🔍 Scanning Python files for imports...');
		const pyFiles = getAllFilesWithExtension(workspaceRoot, '.py', 100);
		outputChannel.appendLine(`Found ${pyFiles.length} Python files to scan`);
		
		pyFiles.forEach(filePath => {
			try {
				outputChannel.appendLine(`  📄 Scanning: ${filePath}`);
				const content = fs.readFileSync(filePath, 'utf-8');
				// ✅ FIXED: full file regex scan
// 🔥 SIMPLE + RELIABLE DETECTION
const lines = content.split('\n');

lines.forEach(line => {
	line = line.trim();

	// detect: import requests
	if (line.startsWith('import ')) {
		const module = line.split(' ')[1];

		if (module && !PYTHON_BUILTINS.has(module)) {
			dependencies[module] = 'detected';
			outputChannel.appendLine(`    ✓ Detected: import ${module}`);
		}
	}

	// detect: from flask import Flask
	if (line.startsWith('from ')) {
		const module = line.split(' ')[1];

		if (module && !PYTHON_BUILTINS.has(module)) {
			dependencies[module] = 'detected';
			outputChannel.appendLine(`    ✓ Detected: from ${module} import ...`);
		}
	}
});
			} catch (e) {
				outputChannel.appendLine(`    ⚠ Error reading ${filePath}: ${e.message}`);
			}
		});
		
		if (Object.keys(dependencies).length > 0) {
			outputChannel.appendLine(`✓ Found ${Object.keys(dependencies).length} Python dependencies`);
		} else {
			outputChannel.appendLine('ℹ No Python imports detected');
		}
	} catch (e) {
		outputChannel.appendLine(`❌ Error scanning Python files: ${e.message}`);
	}
	return dependencies;
}

// Scan JavaScript/TypeScript files for imports
function scanNodeImports(workspaceRoot) {
	const dependencies = {};
	if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel('Ready To Code Execution');
	}
	
	try {
		outputChannel.appendLine('🔍 Scanning Node.js/TypeScript files for imports...');
		const jsFiles = getAllFilesWithExtension(workspaceRoot, ['.js', '.ts', '.jsx', '.tsx'], 100);
		outputChannel.appendLine(`Found ${jsFiles.length} JavaScript/TypeScript files to scan`);
		
		jsFiles.forEach(filePath => {
			try {
				outputChannel.appendLine(`  📄 Scanning: ${filePath}`);
				const content = fs.readFileSync(filePath, 'utf-8');
				const lines = content.split('\n');
				
				lines.forEach(line => {
					// Match: require('module') or require("module")
					let match = line.match(/require\(['"`]([a-zA-Z0-9\-_@\/\.]+)['"` ]\)/);
					if (match) {
						const module = match[1].split('/')[0];
						if (!NODE_BUILTINS.has(module)) {
							dependencies[module] = 'detected';
							outputChannel.appendLine(`    ✓ Detected: require('${module}')`);
						}
					}
					
					// Match: import x from 'module' or import x from "module"
					match = line.match(/import\s+.*\s+from\s+['"`]([a-zA-Z0-9\-_@\/\.]+)['"` ]/);
					if (match) {
						const module = match[1].split('/')[0];
						if (!NODE_BUILTINS.has(module)) {
							dependencies[module] = 'detected';
							outputChannel.appendLine(`    ✓ Detected: import ... from '${module}'`);
						}
					}
					
					// Match: import 'module'
					match = line.match(/import\s+['"`]([a-zA-Z0-9\-_@\/\.]+)['"` ]/);
					if (match) {
						const module = match[1].split('/')[0];
						if (!NODE_BUILTINS.has(module)) {
							dependencies[module] = 'detected';
							outputChannel.appendLine(`    ✓ Detected: import '${module}'`);
						}
					}
				});
			} catch (e) {
				outputChannel.appendLine(`    ⚠ Error reading ${filePath}: ${e.message}`);
			}
		});
		
		if (Object.keys(dependencies).length > 0) {
			outputChannel.appendLine(`✓ Found ${Object.keys(dependencies).length} Node.js dependencies`);
		} else {
			outputChannel.appendLine('ℹ No Node.js imports detected');
		}
	} catch (e) {
		outputChannel.appendLine(`❌ Error scanning Node.js files: ${e.message}`);
	}
	return dependencies;
}

// Helper function to get all files with specific extension(s)
function getAllFilesWithExtension(dir, extensions, maxFiles = 100) {
	const files = [];
	const extensionArray = Array.isArray(extensions) ? extensions : [extensions];
	
	function recurse(dirPath) {
		if (files.length >= maxFiles) return;
		
		try {
			const items = fs.readdirSync(dirPath);
			for (const item of items) {
				if (files.length >= maxFiles) break;
				
				const itemPath = path.join(dirPath, item);
				
				// Skip hidden files, node_modules, venv, etc.
				if (item.startsWith('.') || item === 'node_modules' || item === 'venv' || item === '__pycache__') {
					continue;
				}
				
				try {
					const stat = fs.statSync(itemPath);
					
					if (stat.isFile()) {
						if (extensionArray.some(ext => item.endsWith(ext))) {
							files.push(itemPath);
						}
					} else if (stat.isDirectory()) {
						recurse(itemPath);
					}
				} catch (statError) {
					// Skip files/directories we can't stat
				}
			}
		} catch (readError) {
			// Skip directories we can't read
		}
	}
	
	recurse(dir);
	return files;
}

// Function to scan project dependencies
async function scanDependencies() {
	try {
		// Ensure output channel is initialized
		if (!outputChannel) {
			outputChannel = vscode.window.createOutputChannel('Ready To Code Execution');
		}

		// Get workspace root
		const workspaceRoot = getWorkspaceRoot();
		if (!workspaceRoot) {
			outputChannel.appendLine('⚠ No workspace is open. Cannot scan dependencies.');
			console.warn('No workspace open');
			return { type: 'unknown', dependencies: {}, projectPath: null };
		}

		outputChannel.appendLine(`📁 Workspace Root: ${workspaceRoot}`);
		console.log('Workspace Root:', workspaceRoot);

		// Check for package.json (Node.js)
		const packageJsonPath = path.join(workspaceRoot, 'package.json');
		outputChannel.appendLine(`🔍 Checking for: ${packageJsonPath}`);
		
		if (fs.existsSync(packageJsonPath)) {
			try {
				const content = fs.readFileSync(packageJsonPath, 'utf-8');
				const pkg = JSON.parse(content);
				const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
				outputChannel.appendLine(`✓ Found package.json with ${Object.keys(dependencies).length} dependencies`);
				console.log('Dependencies found:', dependencies);
				return { type: 'Node.js', dependencies, filePath: packageJsonPath, projectPath: workspaceRoot, detectedFrom: 'package.json' };
			} catch (parseError) {
				outputChannel.appendLine(`⚠ Error parsing package.json: ${parseError.message}`);
				console.error('Error parsing package.json:', parseError);
			}
		} else {
			outputChannel.appendLine('✗ package.json not found');
			console.log('package.json not found');
		}

		// Check for requirements.txt (Python)
		const requirementsPath = path.join(workspaceRoot, 'requirements.txt');
		outputChannel.appendLine(`🔍 Checking for: ${requirementsPath}`);
		
		if (fs.existsSync(requirementsPath)) {
			try {
				const content = fs.readFileSync(requirementsPath, 'utf-8');
				const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
				const dependencies = {};
				lines.forEach(line => {
					const match = line.match(/^([a-zA-Z0-9\-_.]+)([=<>~!]+.+)?/);
					if (match) {
						dependencies[match[1]] = match[2] || 'latest';
					}
				});
				outputChannel.appendLine(`✓ Found requirements.txt with ${Object.keys(dependencies).length} dependencies`);
				console.log('Dependencies found:', dependencies);
				return { type: 'Python', dependencies, filePath: requirementsPath, projectPath: workspaceRoot, detectedFrom: 'requirements.txt' };
			} catch (readError) {
				outputChannel.appendLine(`⚠ Error reading requirements.txt: ${readError.message}`);
				console.error('Error reading requirements.txt:', readError);
			}
		} else {
			outputChannel.appendLine('✗ requirements.txt not found');
			console.log('requirements.txt not found');
		}

		// Fallback: Scan source code for imports
		outputChannel.appendLine('');
		outputChannel.appendLine('📝 Scanning source code for imports...');
		
		const pythonImports = scanPythonImports(workspaceRoot);
		const nodeImports = scanNodeImports(workspaceRoot);
		
		const codeDependencies = { ...pythonImports, ...nodeImports };
		
		if (Object.keys(codeDependencies).length > 0) {
			const projectType = Object.keys(pythonImports).length > 0 ? 'Python' : 'Node.js';
			outputChannel.appendLine(`✓ Found ${Object.keys(codeDependencies).length} dependencies in source code (${projectType})`);
			console.log('Code-based dependencies found:', codeDependencies);
			return { type: projectType, dependencies: codeDependencies, filePath: 'source code', projectPath: workspaceRoot, detectedFrom: 'code-scan' };
		}

		outputChannel.appendLine('ℹ No dependencies detected in source code');
		return { type: 'Unknown', dependencies: {}, projectPath: workspaceRoot, detectedFrom: 'none' };
	} catch (error) {
		outputChannel.appendLine(`❌ Error scanning dependencies: ${error.message}`);
		console.error('Error in scanDependencies:', error);
		return { type: 'unknown', dependencies: {}, projectPath: null, detectedFrom: 'error' };
	}
}

// Function to get tool information
function getToolInfo(name) {
	const tools = {
		node: { checkCommand: 'which node', versionCommand: 'node -v' },
		python: { checkCommand: 'which python3', versionCommand: 'python3 --version' },
pip: { checkCommand: 'which pip3', versionCommand: 'pip3 --version' },
		npm: { checkCommand: 'which npm', versionCommand: 'npm -v' },
		python: { checkCommand: 'which python', versionCommand: 'python --version' },
		pip: { checkCommand: 'which pip', versionCommand: 'pip --version' },
		// Add more tools as needed
	};
	return tools[name];
}

// Function to check if a tool is installed
function checkInstalled(cmd) {
	return new Promise(resolve => {
		exec(cmd, (error) => {
			resolve(!error);
		});
	});
}

// Function to check if Java is installed
async function checkJavaInstalled() {
	return new Promise(resolve => {
		exec('java -version', (error) => {
			resolve(!error);
		});
	});
}

// Function to check if a Python dependency is installed
async function checkPythonDependency(dependency) {
	return new Promise(resolve => {
		const command = `pip3 show ${dependency}`;
		exec(command, (error) => {
			resolve(!error); // If no error, dependency is installed
		});
	});
}

// Function to check if a Node.js dependency is installed
async function checkNodeDependency(dependency) {
	return new Promise(resolve => {
		const command = `npm list ${dependency}`;
		exec(command, (error) => {
			resolve(!error); // If no error, dependency is installed
		});
	});
}

// Function to check project dependencies (Python or Node.js packages)
async function checkProjectDependencies(projectType, dependencies) {
	const results = {};

	for (const dependency of Object.keys(dependencies)) {
		let isInstalled = false;

		if (projectType === 'Python') {
			isInstalled = await checkPythonDependency(dependency);
		} else if (projectType === 'Node.js') {
			isInstalled = await checkNodeDependency(dependency);
		} else {
			// For unknown project types, assume not installed
			isInstalled = false;
		}

		results[dependency] = {
			installed: isInstalled,
			required: dependencies[dependency]
		};
	}

	return results;
}

// Function to get Java installation path instructions based on platform
function getJavaInstallPathInstructions(platform) {
	const instructions = {
		macOS: {
			path: "/opt/homebrew/opt/openjdk/bin",
			pathSetup: "echo 'export PATH=\"/opt/homebrew/opt/openjdk/bin:$PATH\"' >> ~/.zshrc && source ~/.zshrc",
			shell: "zsh"
		},
		Linux: {
			path: "/usr/bin",
			pathSetup: "The Java binary should be automatically in your PATH after installation.",
			shell: "bash"
		},
		Windows: {
			path: "C:\\Program Files\\OpenJDK\\bin",
			pathSetup: "The installer should automatically add Java to your PATH.",
			shell: "cmd"
		}
	};
	return instructions[platform] || instructions.Linux;
}

// Function to show Java installation instructions
async function showJavaInstallationInstructions(platform) {
	const instructions = getJavaInstallPathInstructions(platform);
	const message = `Java has been installed successfully!\n\nTo complete setup, you may need to add Java to your PATH:\n\n${instructions.pathSetup}\n\nAfter that, restart your terminal or run: source ~/.${instructions.shell === 'bash' ? 'bashrc' : 'zshrc'}`;
	
	await vscode.window.showInformationMessage(message, { modal: true }, 'OK');
}

// Function to install Java based on platform
async function installJava(platform) {
	return new Promise(async (resolve, reject) => {
		try {
			let installCommand = '';
			let displayMessage = '';

			if (platform === 'macOS') {
				// macOS: Use osascript for admin privileges with brew
				installCommand = 'brew install openjdk';
				displayMessage = 'Installing OpenJDK via Homebrew on macOS...';
			} else if (platform === 'Linux') {
				// Linux: Use sudo with apt
				installCommand = 'sudo apt update && sudo apt install -y default-jdk';
				displayMessage = 'Installing default-jdk via apt on Linux...';
			} else if (platform === 'Windows') {
				// Windows: Use choco
				installCommand = 'choco install openjdk -y';
				displayMessage = 'Installing OpenJDK via Chocolatey on Windows...';
			} else {
				reject(new Error(`Unsupported platform: ${platform}`));
				return;
			}

			outputChannel.appendLine('');
			outputChannel.appendLine('🔧 Java Installation');
			outputChannel.appendLine(displayMessage);
			outputChannel.show();

			// Execute the installation command
			exec(installCommand, { shell: true }, async (error, stdout, stderr) => {
				if (error) {
					outputChannel.appendLine(`❌ Installation failed: ${error.message}`);
					if (stderr) {
						outputChannel.appendLine('Error output:');
						outputChannel.appendLine(stderr);
					}
					outputChannel.show();
					reject(error);
				} else {
					outputChannel.appendLine('✓ Java installation completed successfully!');
					
					if (stdout) {
						outputChannel.appendLine('Installation output:');
						outputChannel.appendLine(stdout);
					}
					
					// Show PATH setup instructions
					outputChannel.appendLine('');
					outputChannel.appendLine('📝 PATH Configuration Instructions:');
					const pathInstructions = getJavaInstallPathInstructions(platform);
					outputChannel.appendLine(`Expected Java path: ${pathInstructions.path}`);
					outputChannel.appendLine(`Setup command: ${pathInstructions.pathSetup}`);
					outputChannel.show();

					// Also show a UI notification
					await showJavaInstallationInstructions(platform);
					
					resolve();
				}
			});
		} catch (error) {
			outputChannel.appendLine(`❌ Error during Java installation: ${error.message}`);
			outputChannel.show();
			reject(error);
		}
	});
}

// Function to handle Java runtime detection and installation
async function ensureJavaInstalled() {
	try {
		if (!outputChannel) {
			outputChannel = vscode.window.createOutputChannel('Ready To Code Execution');
		}

		outputChannel.appendLine('🔍 Checking Java installation...');

		const javaInstalled = await checkJavaInstalled();

		if (javaInstalled) {
			outputChannel.appendLine('✓ Java is already installed');
			return true;
		}

		outputChannel.appendLine('✗ Java is NOT installed');
		outputChannel.show();

		// Show user prompt to install Java
		const selection = await vscode.window.showInformationMessage(
			'Java is not installed. Install it now?',
			{ modal: true },
			'Install',
			'Cancel'
		);

		if (selection === 'Install') {
			outputChannel.appendLine('User selected: Install');
			
			try {
				await installJava(detectedPlatform);
				
				// Verify installation
				const javaVerified = await checkJavaInstalled();
				if (javaVerified) {
					outputChannel.appendLine('✓ Java installation verified!');
					outputChannel.show();
					return true;
				} else {
					outputChannel.appendLine('⚠ Java installation completed, but verification failed.');
					outputChannel.appendLine('Please verify manually by opening a terminal and running: java -version');
					outputChannel.show();
					
					const manualVerify = await vscode.window.showInformationMessage(
						'Installation completed. Please verify by running "java -version" in your terminal. Continue anyway?',
						{ modal: true },
						'Continue',
						'Cancel'
					);
					
					return manualVerify === 'Continue';
				}
			} catch (installError) {
				outputChannel.appendLine('❌ Installation failed');
				outputChannel.show();
				vscode.window.showErrorMessage(`Java installation failed: ${installError.message}`);
				return false;
			}
		} else {
			outputChannel.appendLine('User selected: Cancel');
			outputChannel.appendLine('Java is required to run this program');
			outputChannel.show();
			vscode.window.showWarningMessage('Java is required to run this program');
			return false;
		}
	} catch (error) {
		outputChannel.appendLine(`❌ Error checking Java: ${error.message}`);
		outputChannel.show();
		return false;
	}
}

// Function to get tool version
function getVersion(cmd) {
	return new Promise(resolve => {
		exec(cmd, (error, stdout) => {
			resolve(error ? null : stdout.trim());
		});
	});
}

// Function to check system for installed tools
async function checkSystem(dependencies) {
	const results = {};
	for (const [name, requiredVersion] of Object.entries(dependencies)) {
		const tool = getToolInfo(name);
		if (tool) {
			const installed = await checkInstalled(tool.checkCommand);
			let version = null;
			if (installed) {
				version = await getVersion(tool.versionCommand);
			}
			results[name] = { installed, version, required: requiredVersion };
		} else {
			results[name] = { installed: false, version: null, required: requiredVersion };
		}
	}
	return results;
}

// Function to compare versions (simple implementation)
function versionMatches(installed, required) {
	if (!installed || required === 'latest') return true;
	// Simple string comparison, in real implementation use semver
	return installed.includes(required.replace(/^[^0-9]*/, ''));
}

// Function to generate installation commands based on OS
function generateCommands(os, tools) {
	const commands = [];
	if (os === 'macOS') {
		tools.forEach(tool => {
			commands.push(`brew install ${tool}`);
		});
	} else if (os === 'Linux') {
		commands.push('sudo apt update');
		tools.forEach(tool => {
			commands.push(`sudo apt install ${tool}`);
		});
	} else if (os === 'Windows') {
		tools.forEach(tool => {
			commands.push(`choco install ${tool}`);
		});
	}
	return commands;
}

// Function to run the program
function runProgram() {
	return new Promise(async (resolve, reject) => {
		if (!outputChannel) {
			outputChannel = vscode.window.createOutputChannel('Ready To Code Execution');
		}
		
		outputChannel.appendLine('');
		outputChannel.appendLine('=== Program Execution ===');
		
		// Get the active text editor
		const editor = vscode.window.activeTextEditor;
		
		if (!editor) {
			outputChannel.appendLine('❌ No file is currently open in the editor');
			outputChannel.show();
			reject(new Error('No active editor'));
			return;
		}
		
		const workspaceRoot = getWorkspaceRoot();

// Try active file first
let filePath = vscode.window.activeTextEditor?.document.fileName;

// If wrong file → auto select correct one
if (!filePath || !['.py', '.js', '.ts'].includes(path.extname(filePath))) {

	outputChannel.appendLine('⚠ Active file not supported, searching project...');

	const allFiles = getAllFilesWithExtension(workspaceRoot, ['.py', '.js','.java'], 20);

	if (allFiles.length > 0) {
		filePath = allFiles[0];
		outputChannel.appendLine(`📄 Auto-selected: ${filePath}`);
	} else {
		outputChannel.appendLine('❌ No runnable file found');
		outputChannel.show();
		reject(new Error('No runnable file found'));
		return;
	}
}
		const fileExt = path.extname(filePath);
		
		outputChannel.appendLine(`📄 File: ${filePath}`);
		outputChannel.appendLine(`📝 Extension: ${fileExt}`);
		
		let command = '';
		let fileType = 'Unknown';
		
		// Determine file type and command
		if (fileExt === '.py') {
	command = `python3 "${filePath}"`;
	fileType = 'Python';

} else if (fileExt === '.js') {
	command = `node "${filePath}"`;
	fileType = 'Node.js';

} else if (fileExt === '.ts') {
	command = `node "${filePath}"`;
	fileType = 'TypeScript';

} else if (fileExt === '.java') {
	// Java file detected - check for Java runtime
	outputChannel.appendLine('🔧 Java file detected. Checking Java runtime...');
	outputChannel.show();
	
	try {
		const javaAvailable = await ensureJavaInstalled();
		if (!javaAvailable) {
			outputChannel.appendLine('❌ Java runtime is required but not available');
			outputChannel.show();
			reject(new Error('Java is required to run this program'));
			return;
		}
	} catch (javaCheckError) {
		outputChannel.appendLine(`❌ Error checking Java: ${javaCheckError.message}`);
		outputChannel.show();
		reject(javaCheckError);
		return;
	}
	
	const dir = path.dirname(filePath);
	const fileName = path.basename(filePath, '.java');

	command = `cd "${dir}" && javac "${fileName}.java" && java ${fileName}`;
	fileType = 'Java';

} else {
			outputChannel.appendLine(`⚠ Unsupported file type: ${fileExt}`);
			outputChannel.show();
			reject(new Error(`Unsupported file type: ${fileExt}`));
			return;
		}
		
		outputChannel.appendLine(`🔧 Detected: ${fileType}`);
		outputChannel.appendLine(`💻 Command: ${command}`);
		outputChannel.appendLine('');
		outputChannel.appendLine('--- Output ---');
		
		// Execute the command
		exec(command, { cwd: path.dirname(filePath), maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
			if (error) {
				outputChannel.appendLine('');
				outputChannel.appendLine(`❌ Execution Error: ${error.message}`);
				if (stderr) {
					outputChannel.appendLine('');
					outputChannel.appendLine('--- Stderr ---');
					outputChannel.appendLine(stderr);
				}
				
				// Check if this is an authentication error
				if (isAuthError(error.message, stderr)) {
					outputChannel.appendLine('');
					outputChannel.appendLine('🔍 Detected authentication error. Checking for login-required dependencies...');
					
					// Scan the current file for login-required dependencies
					const authDeps = scanForLoginRequiredDeps(filePath);
					if (authDeps.size > 0) {
						outputChannel.appendLine('');
						outputChannel.appendLine('⚠ The following dependencies require authentication setup:');
						authDeps.forEach(dep => {
							showLoginSetupInstructions(dep);
						});
						outputChannel.show();
					} else {
						outputChannel.appendLine('ℹ Authentication error detected, but no known login-required dependencies found in code.');
					}
				}
				
				outputChannel.appendLine('');
				outputChannel.appendLine('=== Execution Failed ===');
				outputChannel.show();
				reject(error);
			} else {
				if (stdout) {
					outputChannel.appendLine(stdout);
				}
				if (stderr) {
					outputChannel.appendLine('');
					outputChannel.appendLine('--- Stderr ---');
					outputChannel.appendLine(stderr);
				}
				outputChannel.appendLine('');
				outputChannel.appendLine('=== Execution Complete ===');
				outputChannel.show();
				resolve();
			}
		});
	});
}

// Function to detect the operating system
function detectOS() {
	const platform = process.platform;
	if (platform === 'darwin') {
		return 'macOS';
	} else if (platform === 'linux') {
		return 'Linux';
	} else if (platform === 'win32') {
		return 'Windows';
	}
	return 'Unknown';
}

// Function to show login/setup instructions for authentication-required dependencies
function showLoginSetupInstructions(depName) {
	const info = loginSetupInfo[depName];
	if (!info) return;
	
	if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel('Ready To Code Setup');
	}
	
	outputChannel.appendLine(`\n📋 Setup Instructions for ${depName}:`);
	outputChannel.appendLine(`   Message: ${info.message}`);
	outputChannel.appendLine(`   Install: ${info.install}`);
	outputChannel.appendLine(`   Setup: ${info.setup}`);
	outputChannel.appendLine(`   Docs: ${info.docs}`);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Detect OS if not already detected
	if (!detectedPlatform) {
		detectedPlatform = detectOS();
		if (!outputChannel) {
			outputChannel = vscode.window.createOutputChannel('Ready To Code OS Detection');
		}
		outputChannel.appendLine(`Detected OS: ${detectedPlatform}`);
	}

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ready-to-code" is now active!');

	// Smart execution workflow: scan → check → run program
	const disposable = vscode.commands.registerCommand('ready-to-code.helloWorld', async function () {
		try {
			// Initialize output channel
			if (!outputChannel) {
				outputChannel = vscode.window.createOutputChannel('Ready To Code Execution');
			}

			outputChannel.clear();
			outputChannel.appendLine('=== Smart Execution Workflow ===');
			outputChannel.appendLine(`Detected OS: ${detectedPlatform}`);
			outputChannel.appendLine('');

			// Step 1: Scan project dependencies
			outputChannel.appendLine('Step 1: Scanning project dependencies...');
			const projectInfo = await scanDependencies();
			outputChannel.appendLine(`Project Type: ${projectInfo.type}`);
			if (projectInfo.detectedFrom) {
				outputChannel.appendLine(`Detection Source: ${projectInfo.detectedFrom}`);
			}
			if (projectInfo.projectPath) {
				outputChannel.appendLine(`Project Path: ${projectInfo.projectPath}`);
			}
			outputChannel.appendLine('');
			const hasDependencies = Object.keys(projectInfo.dependencies).length > 0;

			if (!hasDependencies) {
				// No dependencies → Run immediately
				outputChannel.appendLine('✓ No dependencies found in project configuration.');
				outputChannel.appendLine('Running program...');
				outputChannel.appendLine('');
				outputChannel.show();
				vscode.window.showInformationMessage('No dependencies found. Running program...');
				await runProgram();
				return;
			}

			// Step 2: Check project dependencies installation status
			outputChannel.appendLine('Step 2: Checking project dependencies...');
			
			// Display detected dependencies if from code scanning
			if (projectInfo.detectedFrom === 'code-scan' && Object.keys(projectInfo.dependencies).length > 0) {
				outputChannel.appendLine('');
				outputChannel.appendLine('Detected Dependencies from Code:');
				Object.keys(projectInfo.dependencies).forEach(dep => {
					outputChannel.appendLine(`  - ${dep}`);
				});
				outputChannel.appendLine('');
			}
			
			// Check project dependencies (not runtime tools)
			const dependencyCheck = await checkProjectDependencies(projectInfo.type, projectInfo.dependencies);

			// Step 3: Identify missing dependencies
			const missing = Object.keys(dependencyCheck).filter(name => !dependencyCheck[name].installed);
			const installed = Object.keys(dependencyCheck).filter(name => dependencyCheck[name].installed);

			// Report dependency status
			outputChannel.appendLine('');
			outputChannel.appendLine('Dependency Status:');
			Object.entries(dependencyCheck).forEach(([name, info]) => {
				const status = info.installed ? '✓ Already installed' : '⚠ Missing';
				outputChannel.appendLine(`- ${name}: ${status}`);
			});

			if (missing.length === 0) {
				// All dependencies satisfied → Run program directly (no popup)
				outputChannel.appendLine('');
				outputChannel.appendLine('✓ All dependencies are already installed!');
				outputChannel.appendLine('');
				outputChannel.appendLine('Step 3: Running program...');
				outputChannel.show();
				await runProgram();
			} else {
				// Separate login-required dependencies from normal dependencies
				const loginRequired = missing.filter(dep => loginRequiredDeps.has(dep));
				const normalMissing = missing.filter(dep => !loginRequiredDeps.has(dep));

				// Show warnings for login-required dependencies
				if (loginRequired.length > 0) {
					outputChannel.appendLine('');
					outputChannel.appendLine('⚠ Authentication/Login Required Dependencies:');
					loginRequired.forEach(dep => {
						showLoginSetupInstructions(dep);
					});
					outputChannel.show();
				}

				// Handle normal missing dependencies
				if (normalMissing.length > 0) {
					outputChannel.appendLine('');
					outputChannel.appendLine(`⚠ Found ${normalMissing.length} missing dependencies that can be auto-installed: ${normalMissing.join(', ')}`);
					outputChannel.show();

					// Request permission with specific missing dependencies
					const allowed = await requestInstallPermission(normalMissing);
					if (allowed) {
						outputChannel.appendLine('');
						outputChannel.appendLine('🔧 Installing missing dependencies...');
						outputChannel.show();
						try {
							const installCwd = projectInfo.projectPath || getWorkspaceRoot();
							for (const dep of normalMissing) {
								const installCommand = projectInfo.type === 'Python'
									? `${detectedPlatform === 'Windows' ? 'pip' : 'pip3'} install ${dep}`
									: `npm install ${dep}`;
								outputChannel.appendLine(`Installing ${dep}...`);
								await executeCommand(installCommand, installCwd);
								outputChannel.appendLine(`✓ Installed ${dep}`);
							}
							outputChannel.appendLine('');
							outputChannel.appendLine('=== Installation Complete ===');
							outputChannel.show();
							vscode.window.showInformationMessage('Dependencies installed. Running program...');
							await runProgram();
						} catch (installError) {
							outputChannel.appendLine('');
							outputChannel.appendLine(`❌ Installation failed: ${installError.message}`);
							outputChannel.show();
							vscode.window.showErrorMessage('Installation failed. Check the output channel for details.');
						}
					} else {
						outputChannel.appendLine('');
						outputChannel.appendLine('✗ Installation cancelled by user.');
						outputChannel.show();
						vscode.window.showWarningMessage('Installation cancelled');
					}
				} else {
					// Only login-required dependencies were missing
					outputChannel.appendLine('');
					outputChannel.appendLine('ℹ Only authentication-required dependencies detected. Please configure them manually.');
					outputChannel.appendLine('Running program (may fail if authentication is required)...');
					outputChannel.show();
					vscode.window.showInformationMessage('Please configure authentication for required dependencies. Running program...');
					await runProgram();
				}
			}
		} catch (error) {
			console.error('Error in smart execution:', error);
			if (outputChannel) {
				outputChannel.appendLine('');
				outputChannel.appendLine(`✗ Error: ${error.message}`);
				outputChannel.show();
			}
			vscode.window.showErrorMessage(`Execution Error: ${error.message}`);
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate,
	getPlatform
}
