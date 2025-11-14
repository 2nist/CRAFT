# SIMPLE BUILD INSTRUCTIONS

## EASIEST OPTION: One-Click Build

**Just double-click:** `ONE_CLICK_BUILD.bat`

This will:
- Create a folder on your Desktop
- Open PowerShell automatically
- Run all build commands for you
- Open the output folder when done

**Total time:** 3-4 minutes

---

## Manual Options (if needed)

## Option 1: Copy-Paste Commands

Open PowerShell in this folder and run:

```powershell
npm install
npm run build:electron
npm run build:renderer
npx electron-builder --win --dir
```

That's it! Your app will be in: `release\win-unpacked\Craft Automation CPQ.exe`

---

## Option 2: One-Liner

```powershell
npm install; npm run build:electron; npm run build:renderer; npx electron-builder --win --dir; explorer release\win-unpacked
```

---

## Option 3: Step by Step

### 1. Install dependencies
```powershell
npm install
```
Wait 1-2 minutes...

### 2. Build Electron
```powershell
npm run build:electron
```
Wait ~30 seconds...

### 3. Build React UI
```powershell
npm run build:renderer
```
Wait ~1 minute...

### 4. Package the app
```powershell
npx electron-builder --win --dir
```
Wait ~30 seconds (ignore code signing warnings)

### 5. Done!
Your app is in: `release\win-unpacked\Craft Automation CPQ.exe`

---

## Total Time: 3-4 minutes

Copy the entire `win-unpacked` folder to deploy!
