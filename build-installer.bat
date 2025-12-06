@echo off
REM Build NSIS Installer for Craft Automation CPQ
REM This script automatically sets up NSIS and builds the installer

setlocal enabledelayedexpansion

echo.
echo === CRAFT AUTOMATION CPQ - NSIS INSTALLER BUILDER ===
echo.

REM Check if NSIS is installed
set "NSIS_FOUND=0"
for %%D in ("C:\Program Files\NSIS" "C:\Program Files (x86)\NSIS") do (
    if exist "%%D\makensis.exe" (
        set "NSIS_FOUND=1"
        echo Found NSIS at: %%D
        echo.
    )
)

if !NSIS_FOUND! equ 0 (
    echo NSIS not found. Attempting to install via winget...
    echo.
    
    REM Try to install NSIS
    where winget >nul 2>&1
    if !errorlevel! equ 0 (
        echo Installing NSIS via Windows Package Manager...
        winget install --id NSIS.NSIS -e --accept-package-agreements
        timeout /t 3 /nobreak
    ) else (
        echo.
        echo ERROR: NSIS not found and winget is not available.
        echo.
        echo Please install NSIS manually:
        echo 1. Download from: https://nsis.sourceforge.io/Download
        echo 2. Run the installer
        echo 3. Check "Add NSIS to PATH"
        echo 4. Run this script again
        echo.
        pause
        exit /b 1
    )
)

REM Build the installer
echo.
echo Starting NSIS installer build...
echo.
node build-installer-standalone.mjs

if !errorlevel! equ 0 (
    echo.
    echo ===================================================
    echo INSTALLER CREATED SUCCESSFULLY!
    echo ===================================================
    echo.
    echo Output: release\Craft Automation CPQ Setup.exe
    echo.
    pause
    exit /b 0
) else (
    echo.
    echo ERROR: Installer build failed
    echo.
    pause
    exit /b 1
)
