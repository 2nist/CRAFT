# How to Build Craft Automation CPQ

## Quick Start

**Just run:** `SIMPLE_BUILD.bat`

That's it! If Node.js is not installed, it will tell you how to install it.

---

## Installing Node.js (if needed)

If the build script says "Node.js not found":

### Option 1: Automatic Download
The script will open https://nodejs.org in your browser automatically.

### Option 2: Direct Download
Download this file directly:
https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi

### Installation Steps:
1. Run the downloaded `.msi` file
2. Click "Next" through all screens (use default settings)
3. **IMPORTANT:** Restart your computer after installation
4. Run `SIMPLE_BUILD.bat` again

---

## What the Build Script Does

1. Checks if Node.js is installed
2. Installs dependencies (~200 MB, 1-2 minutes)
3. Builds the application (2-3 minutes)
4. Creates portable executable (~175 MB)

**Total time:** 3-4 minutes

---

## Output Location

After building:
```
release\win-unpacked\Craft Automation CPQ.exe
```

Copy the entire `win-unpacked` folder to deploy!

---

## Troubleshooting

### "Node.js not found" after installing
- **Solution:** Restart your computer and try again

### "npm install" fails
- **Solution:** Check your internet connection

### Build takes a long time
- **Normal:** First build takes 3-4 minutes
- **After that:** Rebuilds are faster (1-2 minutes)
