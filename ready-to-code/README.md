# ready-to-code README

This is the README for your extension "ready-to-code". After writing up a brief description, we recommend including the following sections.

## Features

- **Smart Dependency Management**: Automatically scans your code for dependencies and installs missing ones.
- **Authentication-Aware Dependencies**: Handles dependencies that require authentication (like AWS, Google Cloud, OpenAI) by providing setup instructions instead of blind auto-installation.
- **Runtime Error Detection**: Detects authentication errors during execution and provides relevant setup guidance.
- **Multi-Language Support**: Supports Python, Node.js/TypeScript, and Java projects.

### Authentication Dependency Handling

For dependencies that require login/authentication (boto3, firebase_admin, openai, etc.), the extension:

1. **Detects** them in your code imports
2. **Warns** you instead of auto-installing
3. **Provides** install commands, setup steps, and documentation links
4. **Does not block** execution - you can still run your code

Example output for boto3:
```
⚠ boto3 requires AWS credentials

Install:
  pip3 install boto3

Setup:
  aws configure

Docs:
  https://boto3.amazonaws.com/v1/documentation/api/latest/index.html
```

Supported authentication-required dependencies:
- boto3 (AWS)
- firebase_admin (Firebase)
- openai (OpenAI API)
- google-cloud-storage (Google Cloud)
- azure-storage-blob (Azure)
- And more...

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Working with Markdown

You can author your README using Visual Studio Code.  Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux)
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux)
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
