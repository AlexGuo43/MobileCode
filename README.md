# MobileCoder

[![Download on the App Store](https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg)](https://apps.apple.com/ca/app/mobilecoder-code-on-the-go/id6748107337)

A mobile code editor built with React Native and Expo that provides a customizable coding experience on mobile devices.

## Features

- **Smart Code Keyboard**: Customizable keyboard with code snippets and smart predictions
- **Syntax Highlighting**: Syntax highlighting for code with support for multiple languages
- **Template System**: Variable and function name templates with easy renaming
- **Daily Challenges**: Integration with LeetCode's daily challenges
- **File Management**: Built-in file system for managing code files
- **Terminal Panel**: Terminal interface for command execution
- **Cross-Platform**: Runs on iOS, Android, and web

## Getting Started

### Prerequisites

- Node.js
- Expo CLI
- React Native development environment

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## Project Structure

```
app/
├── (tabs)/          # Tab-based navigation screens
│   ├── daily.tsx    # Daily challenge screen
│   ├── editor.tsx   # Code editor screen
│   └── files.tsx    # File management screen
├── index.tsx        # Entry point
└── _layout.tsx      # App layout

components/
├── CodeKeyboard.tsx     # Customizable code keyboard
├── KeyboardCustomizer.tsx # Keyboard customization interface
├── SyntaxHighlighter.tsx  # Code syntax highlighting
├── TemplateRenamer.tsx    # Template variable renaming
└── TerminalPanel.tsx      # Terminal interface

utils/
├── smartKeyboard.ts   # Smart keyboard predictions
├── storage.ts         # Local storage utilities
└── templateSystem.ts  # Template management system
```

## Key Components

### CodeKeyboard

Provides a customizable keyboard with code snippets, smart predictions, and quick actions for mobile coding.

### TemplateRenamer

Allows easy renaming of template variables and function names throughout the codebase.

### SyntaxHighlighter

Renders code with syntax highlighting for better readability.

## Configuration

The app uses Expo configuration in `app.json` and supports:

- iOS and Android deployment
- Web deployment
- Custom keyboard layouts
- Template system customization

## License

See LICENSE file for details.
