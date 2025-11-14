# Craft Automation CPQ - Build Instructions

## Quick Start (Recommended)

**For users who don't have Node.js installed:**

1. Double-click **`SETUP.bat`**
2. If Node.js is not found, it will guide you through installation
3. After Node.js installs, run **`SETUP.bat`** again
4. Wait 2-3 minutes for the build to complete
5. Find your app in the `release\win-unpacked\` folder

---

## Alternative: Manual Build

**If you already have Node.js installed:**

1. Double-click **`BUILD.bat`**
2. Wait 2-3 minutes for the build
3. Find your app in the `release\win-unpacked\` folder

---

## What You Need

- **Node.js 18.x or higher** (SETUP.bat will help install if needed)
- **Internet connection** (for downloading dependencies)
- **2-3 minutes** (build time)
- **~500 MB free disk space** (for dependencies and output)

---

## Output Location

After building, you'll find:

```
release\
  └── win-unpacked\
      ├── Craft Automation CPQ.exe  ← Main executable
      ├── resources\
      ├── locales\
      └── [other files]
```

**Total size:** ~175 MB

---

## Deploying to Other Computers

1. **Copy the entire `win-unpacked` folder** to a USB drive or network location
2. **Paste it anywhere on the target computer** (Desktop, C:\Tools, etc.)
3. **Run `Craft Automation CPQ.exe`** - no installation needed!
4. First launch creates necessary folders automatically

### Network Database Setup

The app connects to:
- **Server:** `\\192.168.1.99\CraftAuto-Sales\`
- **Database:** `Temp_Craft_Tools_Runtime\updates\latest\database\`

Users will be prompted for network credentials on first run.

---

## Troubleshooting

### "npm is not recognized"

**Solution:** You need to install Node.js first.

1. Run **`SETUP.bat`** - it will guide you through installation
   OR
2. Download manually from: https://nodejs.org/
   - Get the **LTS (Long Term Support)** version
   - File: `node-v20.11.0-x64.msi` (~32 MB)
   - Install with default settings
   - Restart your command prompt/terminal

### "Build failed" or other errors

1. Make sure you have an active internet connection
2. Try deleting the `node_modules` folder and run SETUP.bat again
3. Check that you have ~500 MB free disk space

### Code signing warnings during build

This is normal! The build script shows warnings about code signing but the app works perfectly. The executable is just not digitally signed (which requires a code signing certificate).

---

## Files Overview

| File | Purpose |
|------|---------|
| **SETUP.bat** | Checks for Node.js, installs if needed, then builds |
| **BUILD.bat** | Builds the app (requires Node.js already installed) |
| build-app.bat | Technical version with more detailed output |
| run-app.bat | Runs the app in development mode (for developers) |

---

## Questions?

- **Build time:** Usually 2-3 minutes
- **Dependencies:** Downloaded automatically (~200 MB)
- **Output size:** ~175 MB portable app
- **Node.js version:** 18.x or higher (20.x recommended)

---

Built with ❤️ by Craft Automation
