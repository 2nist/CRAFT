# Craft Tools Hub - Quick Start Guide

## For Testers/Coworkers

### Prerequisites
- Install Node.js (v18 or higher): https://nodejs.org/

### Quick Start

**Option 1: Double-click to run**
1. Double-click `run-app.bat`
2. The app will:
   - Install dependencies (first time only)
   - Start in development mode
   - Open automatically with DevTools

**Option 2: Build and package**
1. Double-click `build-app.bat` to build the app
2. Run `npx electron-builder` to create the installer
3. Find the installer in the `release/` folder

### Troubleshooting

**"npm is not recognized"**
- Node.js is not installed or not in your PATH
- Install from: https://nodejs.org/

**Port 5173 already in use**
- Another instance is running
- Close it or restart your computer

**App doesn't show my changes**
- The app uses local data in: `C:\Users\<YourName>\AppData\Local\electron-vite-react-app\data`
- Delete this folder to reset

### Data Files Location
- Projects database: `%LOCALAPPDATA%\electron-vite-react-app\data\projects.json`
- Settings: `%LOCALAPPDATA%\electron-vite-react-app\data\settings.json`
- CSV log: `%LOCALAPPDATA%\electron-vite-react-app\data\projects_log.csv`

### For Developers
See the main README.md for full development documentation.
