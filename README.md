# Electron Vite React Tailwind App

A modern desktop application built with Electron, Vite, React, and Tailwind CSS.

## Features

- ⚡️ Electron for cross-platform desktop applications
- ⚛️ React 18 for building user interfaces
- 🚀 Vite for fast development and building
- 🎨 Tailwind CSS for utility-first styling
- 🔒 Secure IPC communication between main and renderer processes
- 🛠️ Hot module replacement (HMR) for development

## Project Structure

```
├── electron/
│   ├── main.js       # Electron main process
│   └── preload.js    # Preload script for secure IPC
├── src/
│   ├── App.jsx       # Main React component
│   ├── main.jsx      # React entry point
│   └── index.css     # Global styles with Tailwind
├── index.html        # HTML entry point
├── vite.config.js    # Vite configuration for renderer
├── vite.config.electron.js  # Vite configuration for Electron
└── package.json      # Project dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

### Development

Run the app in development mode:
```bash
npm run electron:dev
```

This will:
- Start the Vite dev server
- Launch Electron with hot reload enabled
- Open DevTools automatically

### Building

Build the Electron main process:
```bash
npm run build:electron
```

Build the React renderer:
```bash
npm run build:renderer
```

Build the complete application for distribution:
```bash
npm run build
```

## IPC Communication

The app demonstrates secure IPC (Inter-Process Communication) between the main process and renderer process:

- **Ping/Pong**: Test basic IPC with `electronAPI.ping()`
- **Get Version**: Retrieve app version with `electronAPI.getAppVersion()`
- **Send Messages**: Send messages using `electronAPI.sendMessage()`
- **Receive Messages**: Listen for messages with `electronAPI.onMessageFromMain()`

All IPC is handled securely through the preload script with context isolation enabled.

## Security

This template follows Electron security best practices:
- Context isolation enabled
- Node integration disabled in renderer
- Secure IPC through preload script
- No exposure of sensitive APIs to renderer

## Tech Stack

- **Electron**: ^28.2.0
- **React**: ^18.2.0
- **Vite**: ^5.0.12
- **Tailwind CSS**: ^3.4.1

## License

ISC
