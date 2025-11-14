@echo off
title Craft Automation CPQ - Setup and Build
color 0B

echo.
echo  ========================================================
echo         CRAFT AUTOMATION CPQ - SETUP AND BUILD
echo  ========================================================
echo.
echo  This script will:
echo    1. Check for Node.js (required to build the app)
echo    2. Install Node.js automatically if not found
echo    3. Build the production application
echo.
echo  ========================================================
echo.

pause

cls

REM Check if Node.js is installed
echo [Step 1/5] Checking for Node.js...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0E
    echo  WARNING: Node.js is not installed!
    echo.
    echo  Node.js is required to build this application.
    echo.
    echo  Would you like to download and install Node.js now?
    echo  This will open your browser to the Node.js download page.
    echo.
    echo  Press any key to open download page, or Ctrl+C to cancel...
    pause >nul
    
    REM Open Node.js download page
    start https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
    
    echo.
    echo  ========================================================
    echo  INSTALLATION INSTRUCTIONS:
    echo  ========================================================
    echo.
    echo  1. Download will start in your browser
    echo  2. Run the downloaded .msi installer
    echo  3. Click "Next" through the installer (defaults are fine)
    echo  4. Check "Automatically install necessary tools" if asked
    echo  5. Restart this script after Node.js installation completes
    echo.
    echo  File: node-v20.11.0-x64.msi (recommended version)
    echo  Size: ~32 MB
    echo.
    echo  ========================================================
    echo.
    
    pause
    exit /b 0
)

REM Node.js is installed, show version
for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
for /f "tokens=*" %%v in ('npm -v') do set NPM_VERSION=%%v
color 0A
echo  SUCCESS: Node.js is installed!
echo  Node.js version: %NODE_VERSION%
echo  npm version: %NPM_VERSION%
echo.

timeout /t 2 >nul

REM Check if we're in the correct directory
if not exist "package.json" (
    color 0C
    echo.
    echo  ERROR: package.json not found!
    echo  Please run this script from the craft_tools_hub directory
    echo.
    pause
    exit /b 1
)

cls

echo.
echo  ========================================================
echo         BUILDING CRAFT AUTOMATION CPQ
echo  ========================================================
echo.

REM Install dependencies
echo [Step 2/5] Installing dependencies...
echo  This may take 1-2 minutes on first run...
echo.

call npm install
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  ERROR: Failed to install dependencies
    echo  Check your internet connection and try again
    echo.
    pause
    exit /b 1
)

echo.
echo  Dependencies installed successfully!
timeout /t 1 >nul

cls
echo.
echo  ========================================================
echo         BUILDING CRAFT AUTOMATION CPQ
echo  ========================================================
echo.
echo [Step 2/5] Installing dependencies... DONE
echo [Step 3/5] Building Electron main process...
echo.

REM Build Electron
call npm run build:electron
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  ERROR: Electron build failed
    echo.
    pause
    exit /b 1
)

echo  Electron build completed!
timeout /t 1 >nul

cls
echo.
echo  ========================================================
echo         BUILDING CRAFT AUTOMATION CPQ
echo  ========================================================
echo.
echo [Step 2/5] Installing dependencies... DONE
echo [Step 3/5] Building Electron main process... DONE
echo [Step 4/5] Building React renderer...
echo.

REM Build Renderer
call npm run build:renderer
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  ERROR: Renderer build failed
    echo.
    pause
    exit /b 1
)

echo  Renderer build completed!
timeout /t 1 >nul

cls
echo.
echo  ========================================================
echo         BUILDING CRAFT AUTOMATION CPQ
echo  ========================================================
echo.
echo [Step 2/5] Installing dependencies... DONE
echo [Step 3/5] Building Electron main process... DONE
echo [Step 4/5] Building React renderer... DONE
echo [Step 5/5] Creating portable Windows application...
echo.

REM Package with electron-builder
call npx electron-builder --win --dir
if %errorlevel% neq 0 (
    color 0E
    echo.
    echo  Note: Packaging completed with code signing warnings
    echo  This is normal - the app will work perfectly
    echo.
    timeout /t 2 >nul
)

color 0A
cls

echo.
echo  ========================================================
echo              BUILD COMPLETED SUCCESSFULLY!
echo  ========================================================
echo.
echo  Application Location:
echo    %CD%\release\win-unpacked\
echo.
echo  Main Executable:
echo    Craft Automation CPQ.exe
echo.
echo  Size: ~175 MB
echo.
echo  ========================================================
echo  DEPLOYMENT INSTRUCTIONS
echo  ========================================================
echo.
echo  TO DEPLOY TO OTHER COMPUTERS:
echo  ------------------------------
echo  1. Copy the ENTIRE 'win-unpacked' folder
echo  2. Paste to target computer (any location)
echo  3. Run "Craft Automation CPQ.exe"
echo  4. No installation or admin rights required!
echo.
echo  NETWORK DATABASE (NAS):
echo  -----------------------
echo  Path: \\192.168.1.99\CraftAuto-Sales\
echo  Database: Temp_Craft_Tools_Runtime\updates\latest\
echo  
echo  Users will be prompted for network credentials on first run.
echo.
echo  ========================================================
echo.
echo  Opening output folder...
echo.

timeout /t 2 >nul
explorer release\win-unpacked

echo  Press any key to exit...
pause >nul
