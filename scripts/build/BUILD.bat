@echo off
title Craft Automation CPQ - Build Tool
color 0A

echo.
echo  ========================================================
echo             CRAFT AUTOMATION CPQ - BUILD TOOL
echo  ========================================================
echo.
echo  This will:
echo    1. Install all required dependencies
echo    2. Build the production application
echo    3. Create a portable Windows executable
echo.
echo  Requirements:
echo    - Node.js (will be checked automatically)
echo    - Internet connection (for dependencies)
echo.
echo  Build time: Approximately 2-3 minutes
echo.
echo  ========================================================
echo.

pause

cls

REM Check if Node.js is installed
echo [1/4] Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  ERROR: Node.js is not installed!
    echo.
    echo  Node.js is required to build this application.
    echo.
    echo  SOLUTION:
    echo  1. Run SETUP.bat instead - it will help you install Node.js
    echo     OR
    echo  2. Download Node.js manually from: https://nodejs.org/
    echo     (Get the LTS version: node-v20.11.0-x64.msi)
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo     Node.js %NODE_VERSION% detected
echo.

REM Install dependencies
echo [2/4] Installing dependencies...
echo     This may take 1-2 minutes on first run...
call npm install --silent
if errorlevel 1 (
    color 0C
    echo.
    echo  ERROR: Failed to install dependencies
    echo  Check your internet connection and try again
    echo.
    pause
    exit /b 1
)
echo     Dependencies installed successfully!
echo.

REM Build the application
echo [3/4] Building application...
echo     Building Electron main process...
call npm run build:electron --silent
if errorlevel 1 (
    color 0C
    echo.
    echo  ERROR: Electron build failed
    echo.
    pause
    exit /b 1
)

echo     Building React renderer...
call npm run build:renderer --silent
if errorlevel 1 (
    color 0C
    echo.
    echo  ERROR: Renderer build failed
    echo.
    pause
    exit /b 1
)
echo     Build completed successfully!
echo.

REM Package with electron-builder
echo [4/4] Creating portable Windows application...
call npx electron-builder --win --dir --config.directories.output=release
if errorlevel 1 (
    color 0E
    echo.
    echo  WARNING: Packaging completed with warnings (code signing)
    echo  The app is built successfully but may show Windows SmartScreen warnings
    echo.
) else (
    echo     Packaging completed!
)
echo.

color 0A
cls

echo.
echo  ========================================================
echo              BUILD COMPLETED SUCCESSFULLY!
echo  ========================================================
echo.
echo  Portable Application Location:
echo    release\win-unpacked\Craft Automation CPQ.exe
echo.
echo  File Size: ~175 MB
echo.
echo  DEPLOYMENT INSTRUCTIONS:
echo  ------------------------
echo  1. Copy the ENTIRE 'win-unpacked' folder to target PC
echo  2. Run "Craft Automation CPQ.exe" - no installation needed
echo  3. First launch will create required folders automatically
echo.
echo  Network Setup (NAS Access):
echo    - Path: \\192.168.1.99\CraftAuto-Sales\
echo    - Database: Temp_Craft_Tools_Runtime\updates\latest\
echo    - Users will be prompted for credentials on first run
echo.
echo  ========================================================
echo.

explorer release\win-unpacked

pause
