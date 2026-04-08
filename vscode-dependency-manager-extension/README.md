# vscode-dependency-manager-extension

## Overview
The vscode-dependency-manager-extension is a Visual Studio Code extension designed to streamline the process of managing dependencies for various programming projects. It automatically scans the user's system for required dependencies, installs missing components, and provides a seamless experience for compiling and running code.

## Features
- **Automatic Dependency Installation**: The extension checks for missing dependencies and installs them automatically with user authorization.
- **System Scanning**: It scans the entire system to identify installed extensions and dependencies, storing the results in a database.
- **Cross-Platform Support**: The extension is designed to work on multiple operating systems, including Windows, macOS, and Linux distributions like Kali.
- **Minimal User Interaction**: Users can compile and run their code with minimal prompts, enhancing productivity.
- **Secure Handling of Sensitive Information**: The extension discards sensitive details such as open port numbers while maintaining necessary configurations.

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/vscode-dependency-manager-extension.git
   ```
2. Navigate to the project directory:
   ```
   cd vscode-dependency-manager-extension
   ```
3. Install the required dependencies:
   ```
   npm install
   ```

## Usage
1. Open a project in Visual Studio Code.
2. Use the command palette (Ctrl+Shift+P) to access the extension commands:
   - **Compile**: Checks for dependencies and compiles the code.
   - **Run**: Executes the code and starts the debugging process.
   - **Scan**: Initiates a scan of the system for installed dependencies.

## Development
To contribute to the extension:
- Make sure to follow the coding standards and guidelines.
- Run tests to ensure new changes do not break existing functionality.
- Submit pull requests for review.

## License
This project is licensed under the MIT License. See the LICENSE file for details.