# SIMPLE BUILD INSTRUCTIONS

## You already have Node.js installed! Just run these commands:

Open PowerShell in this folder and run:

```powershell
npm install
npm run build:electron
npm run build:renderer
npx electron-builder --win --dir
```

That's it! Your app will be in: `release\win-unpacked\Craft Automation CPQ.exe`

---

## OR Copy-Paste This One-Liner:

```powershell
npm install; npm run build:electron; npm run build:renderer; npx electron-builder --win --dir; explorer release\win-unpacked
```

---

## Step by Step (if you prefer):

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
