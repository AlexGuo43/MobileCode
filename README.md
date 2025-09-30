# MobileCoder

[![Download on the App Store](https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg)](https://apps.apple.com/ca/app/mobilecoder-code-on-the-go/id6748107337)

Leetcode on the go with this app! Don't use the iOS system keyboard ever again.

## Features

- **Smart Code Keyboard**: Customizable keyboard with code snippets and smart predictions
- **Syntax Highlighting**: Syntax highlighting for code with support for multiple languages
- **Template System**: Variable and function name templates with easy renaming
- **Daily Challenges**: Integration with LeetCode's daily challenges
- **File Management**: Built-in file system for managing code files
- **Terminal Panel**: Terminal interface for command execution

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

# Can run on an iOS device by downloading the Expo Go app, and scanning the QR code
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

## License

See LICENSE file for details.
