@echo off
echo ========================================
echo Craft Tools Hub - Production Build
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo Node.js version: %NODE_VERSION%
echo.

REM Always install/update dependencies to ensure latest versions
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)
echo Dependencies installed successfully!
echo.

echo Building Electron app...
call npm run build:electron
if errorlevel 1 (
    echo.
    echo ERROR: Electron build failed
    pause
    exit /b 1
)

echo Building renderer...
call npm run build:renderer
if errorlevel 1 (
    echo.
    echo ERROR: Renderer build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Creating Windows Installer...
echo ========================================
echo.

call npx electron-builder --win --publish=never
if errorlevel 1 (
    echo.
    echo ERROR: Installer creation failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build and installer creation completed successfully!
echo ========================================
echo.
echo Build output location:
dir /b release 2>nul
echo.
echo Portable app: release\win-unpacked\Craft Automation CPQ.exe
echo.
echo The portable version can be copied to any Windows PC and run directly.
echo No installation required - just copy the entire 'win-unpacked' folder.
echo.

pause
