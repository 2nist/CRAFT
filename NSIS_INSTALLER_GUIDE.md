# NSIS Installer Setup Guide

## Overview

To create an NSIS installer for Craft Automation CPQ with automatic Visual C++ Runtime installation, you need NSIS installed on your system.

## Installation

### Option 1: Download & Install (Recommended)

1. **Download NSIS from official site**:
   - Visit: https://nsis.sourceforge.io/Download
   - Download: NSIS v3.10 (or latest stable)
   - File: `nsis-3.10-setup.exe` or newer

2. **Install NSIS**:
   - Run the installer
   - Choose "Full Installation"
   - Select "Add NSIS to your PATH" during installation
   - Complete installation

3. **Verify Installation**:
   ```powershell
   makensis /VERSION
   ```

### Option 2: Chocolatey Installation

```powershell
# Run as Administrator
choco install nsis -y
```

### Option 3: Scoop Installation

```powershell
scoop install nsis
```

## Building the Installer

Once NSIS is installed, build the installer using:

```bash
npm run dist:installer
```

This will:
1. Build the React and Electron app
2. Create `standalone-installer.nsi`  
3. Compile with NSIS
4. Generate: `release\Craft Automation CPQ Setup.exe`

## What the Installer Includes

✅ **Automatic VC++ Runtime Detection**
   - Checks if Visual C++ 2015-2022 (x64) is installed
   - Downloads from Microsoft (aka.ms/vs/17/release/vc_redist.x64.exe) if missing
   - Silent installation with no user prompts

✅ **Installation Features**
   - Install to Program Files (default customizable)
   - Start Menu shortcuts
   - Desktop shortcut
   - Windows Add/Remove Programs entry
   - Uninstaller included

✅ **User Experience**
   - Welcome page with installation notes
   - Directory selection
   - Installation progress indicator
   - Completion confirmation

## Troubleshooting

### "makensis not found"
- Ensure NSIS is installed (see Installation section above)
- Check NSIS is in your PATH: `echo %PATH% | findstr NSIS`
- Restart terminal/PowerShell after installing NSIS

### Installer fails to create
- Run terminal as Administrator
- Ensure `release\win-unpacked` directory exists (run `npm run dist:portable` first)
- Check disk space (installer script needs ~500MB temporary space)

### VC++ installation fails during setup
- Check internet connection
- Microsoft servers may be temporarily unavailable
- User can install manually afterward from: https://support.microsoft.com/en-us/help/2977003

## Installer Output

**Location**: `release\Craft Automation CPQ Setup.exe`
**Size**: ~180-200 MB (includes application + VC++ if needed)
**Format**: Standard Windows installer with uninstaller

## Distribution

1. Distribute `Craft Automation CPQ Setup.exe` to users
2. Users run installer - no additional setup needed
3. Application installed to `C:\Program Files\Craft Automation CPQ\`
4. Uninstall via Windows Add/Remove Programs

## Alternative: Portable Version

If NSIS installation is not possible, use the portable executable:
```bash
npm run dist:portable
```

This creates: `release\win-unpacked\Craft Automation CPQ.exe` (169 MB)
- No installation required
- Can run from USB or network share
- User must install VC++ Runtime separately if needed

## Pre-requisites Summary

| Requirement | Status | Action |
|-------------|--------|--------|
| Windows 10/11 (x64) | Required | - |
| Visual C++ Runtime | Auto-installed | Installer handles it |
| .NET Framework | Optional | For advanced features |
| SQL Server Access | Optional | For database operations |
| NSIS | For .exe installer | Download from official site |

## Build Configuration Files

- **installer.nsi** - Original NSIS script template
- **standalone-installer.nsi** - Auto-generated during build
- **build-installer-standalone.mjs** - Build script

All are configured to download and install Visual C++ Runtime automatically during installation.
