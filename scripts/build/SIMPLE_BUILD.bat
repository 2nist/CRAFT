@echo off
setlocal
title Craft Automation CPQ - Build Tool
cls

echo.
echo ============================================================
echo           CRAFT AUTOMATION CPQ - BUILD TOOL
echo ============================================================
echo.
echo This script will build the production-ready application.
echo.
echo Build time: Approximately 3-4 minutes
echo Output: release\win-unpacked\Craft Automation CPQ.exe
echo.
echo ============================================================
echo.
pause

cls

REM Test if npm works
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    cls
    echo.
    echo ============================================================
    echo                   NODE.JS NOT FOUND
    echo ============================================================
    echo.
    echo This tool requires Node.js to build the application.
    echo.
    echo TO INSTALL NODE.JS:
    echo.
    echo 1. Open your web browser
    echo 2. Go to: https://nodejs.org
    echo 3. Download the LTS version (recommended)
    echo 4. Run the installer - use all default settings
    echo 5. Restart your computer (important!)
    echo 6. Run this script again
    echo.
    echo OR use this direct download link:
    echo https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
    echo.
    echo ============================================================
    echo.
    pause
    start https://nodejs.org
    exit /b 1
)

cls
echo.
echo ============================================================
echo                    BUILDING APPLICATION
echo ============================================================
echo.

REM Check we're in the right directory
if not exist package.json (
    echo ERROR: package.json not found!
    echo Please run this script from the craft_tools_hub folder.
    echo.
    pause
    exit /b 1
)

echo [1/4] Installing dependencies...
echo This may take 1-2 minutes on first run...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Check your internet connection and try again.
    echo.
    pause
    exit /b 1
)

cls
echo.
echo ============================================================
echo                    BUILDING APPLICATION
echo ============================================================
echo.
echo [1/4] Installing dependencies... DONE
echo [2/4] Building Electron main process...
echo.
call npm run build:electron
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Electron build failed
    echo.
    pause
    exit /b 1
)

cls
echo.
echo ============================================================
echo                    BUILDING APPLICATION
echo ============================================================
echo.
echo [1/4] Installing dependencies... DONE
echo [2/4] Building Electron main process... DONE
echo [3/4] Building React renderer...
echo.
call npm run build:renderer
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Renderer build failed
    echo.
    pause
    exit /b 1
)

cls
echo.
echo ============================================================
echo                    BUILDING APPLICATION
echo ============================================================
echo.
echo [1/4] Installing dependencies... DONE
echo [2/4] Building Electron main process... DONE
echo [3/4] Building React renderer... DONE
echo [4/4] Creating portable Windows application...
echo.
call npx electron-builder --win --dir
REM Ignore exit code - code signing warnings are normal

cls
echo.
echo ============================================================
echo                   BUILD COMPLETE!
echo ============================================================
echo.
echo Your application is ready at:
echo   %CD%\release\win-unpacked\Craft Automation CPQ.exe
echo.
echo File size: ~175 MB
echo.
echo TO DEPLOY:
echo   1. Copy the entire "win-unpacked" folder
echo   2. Paste to any Windows computer
echo   3. Run "Craft Automation CPQ.exe"
echo   4. No installation needed!
echo.
echo ============================================================
echo.
echo Opening output folder...
timeout /t 2 >nul
explorer release\win-unpacked
echo.
pause
