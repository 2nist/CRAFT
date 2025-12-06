# 🚀 Quick Start - Building NSIS Installer

## One-Command Build (Recommended)

```powershell
powershell -ExecutionPolicy Bypass -File build-installer.ps1
```

This script will:
1. ✓ Check for NSIS installation
2. ✓ Auto-install NSIS via winget (if available and needed)
3. ✓ Build the NSIS installer
4. ✓ Generate `release\Craft Automation CPQ Setup.exe`

## If You Already Have NSIS Installed

```bash
npm run dist:installer
```

Or directly with Node:
```bash
node build-installer-standalone.mjs
```

## Manual NSIS Installation (If Script Fails)

### Option 1: Download
1. Go to https://nsis.sourceforge.io/Download
2. Download NSIS 3.x installer
3. Run the installer
4. ✓ Check "Add NSIS to PATH"

### Option 2: Package Manager
```powershell
# Chocolatey
choco install nsis -y

# Winget
winget install NSIS.NSIS
```

## Verify Installation
```powershell
makensis /VERSION
```

Should output version 3.x

## Output Files

After successful build:
- **Installer**: `release\Craft Automation CPQ Setup.exe` (~180-200 MB)
- **Portable**: `release\win-unpacked\Craft Automation CPQ.exe` (~169 MB)

## Features Included

✓ Auto-detects Visual C++ 2015-2022 Runtime (x64)
✓ Auto-downloads VC++ if missing
✓ Creates Start Menu shortcuts
✓ Creates Desktop shortcut
✓ Adds to Add/Remove Programs
✓ Uninstaller included

## Troubleshooting

**"NSIS not found"**
- Install NSIS manually from https://nsis.sourceforge.io/Download
- Run: `powershell -ExecutionPolicy Bypass -File build-installer.ps1`

**"makensis command not found"**
- Restart PowerShell/Terminal after NSIS installation
- Or add to PATH: `C:\Program Files\NSIS`

**"Build failed with access denied"**
- Close any running instances of the app
- Clear temp directory: `npm run clean`
- Try again

## Fallback: Portable Executable

If NSIS installation is problematic, the portable version is ready:
```
release\win-unpacked\Craft Automation CPQ.exe
```
- No installation required
- Fully self-contained (169 MB)
- Users must manually install VC++ Runtime if needed
